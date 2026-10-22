import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hash } from 'argon2';
import { buildApp } from '../src/app.js';
import { approved, codeDigest, digest, trustedOrigin } from '../src/security.js';
import type { PrismaClient, User } from '../src/generated/prisma/client.js';
import type { Config } from '../src/config.js';
let dir: string, app: Awaited<ReturnType<typeof buildApp>>, user: User, cfg: Config;
const db = {
  user: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
  session: { findUnique: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
  challenge: { findUnique: vi.fn(), create: vi.fn(), deleteMany: vi.fn(), updateMany: vi.fn() },
  trustedDevice: { findUnique: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
  $transaction: vi.fn()
};
const mail = vi.fn();
beforeEach(async () => {
  vi.resetAllMocks();
  dir = await mkdtemp(join(tmpdir(), 'ai-learning-auth-'));
  const allowlist = join(dir, 'approved.txt'); await writeFile(allowlist, 'approved@gmail.com\n');
  cfg = { origin: 'https://learning.test', secret: 'test-secret-'.repeat(5), secure: true, allowlist,
    googleClientId: 'test-client', googleClientSecret: 'test-secret', smtp: { host: 'invalid.test', port: 587, secure: false, requireTLS: true, auth: { user: 'test', pass: 'test' }, logger: false, debug: false }, smtpFrom: 'test@example.org' };
  user = { id: 'ce54b865-d596-47b9-9cb4-921e9be50889', email: 'approved@gmail.com', username: 'approved', googleSubject: 'google-123', active: true, passwordHash: await hash('a good long password'), signInTypes: ['GOOGLE', 'PASSWORD'], lastSignInType: 'GOOGLE', passwordFailures: 0, lockedUntil: null, createdAt: new Date(), updatedAt: new Date() };
  db.user.findUnique.mockResolvedValue(user); db.user.update.mockResolvedValue(user);
  db.$transaction.mockImplementation(async work => typeof work === 'function' ? work(db) : Promise.all(work));
  db.challenge.deleteMany.mockResolvedValue({ count: 1 }); mail.mockResolvedValue(undefined);
  app = await buildApp(db as unknown as PrismaClient, cfg, mail);
});
afterEach(async () => { await app.close(); await rm(dir, { recursive: true, force: true }); });
const post = (url: string, payload: object, cookies: Record<string, string> = {}) => app.inject({ method: 'POST', url, payload, headers: { origin: cfg.origin }, cookies });
it('fails closed for absent allowlist and rejects non-Gmail addresses', async () => {
  expect(await approved('approved@gmail.com', '/does-not-exist')).toBe(false);
  expect(await approved('APPROVED@gmail.com', cfg.allowlist)).toBe(true);
  expect(await approved('other@gmail.com', cfg.allowlist)).toBe(false);
  await writeFile(cfg.allowlist, 'user@company.com\n');
  expect(await approved('user@company.com', cfg.allowlist)).toBe(false);
});
it('denies anonymous REST and GraphQL access', async () => {
  expect((await app.inject('/api/me')).statusCode).toBe(401);
  const gql = await post('/graphql', { query: '{ me { email } }' });
  expect(gql.json().data).toBeNull(); expect(gql.body).not.toContain(user.email);
});
it('rejects missing and cross-origin mutations before accessing storage', async () => {
  for (const origin of [undefined, 'https://evil.test']) {
    const r = await app.inject({ method: 'POST', url: '/api/auth/logout', headers: origin ? { origin } : {}, payload: {} });
    expect(r.statusCode).toBe(403);
  }
  expect(trustedOrigin('https://learning.test:99', cfg.origin)).toBe(false);
  expect(db.session.deleteMany).not.toHaveBeenCalled();
});
it('does not expose database errors or credentials', async () => {
  db.session.findUnique.mockRejectedValue(new Error('postgresql://secret:password@host/db'));
  const r = await app.inject({ url: '/api/me', cookies: { '__Host-ai-session': 'opaque' } });
  expect(r.statusCode).toBe(503); expect(r.body).not.toMatch(/secret|password|postgresql/);
});
it('revokes access when removed from allowlist', async () => {
  db.session.findUnique.mockResolvedValue({ user, expiresAt: new Date(Date.now() + 100000) });
  expect((await app.inject({ url: '/api/me', cookies: { '__Host-ai-session': 'opaque' } })).statusCode).toBe(200);
  await writeFile(cfg.allowlist, '');
  expect((await app.inject({ url: '/api/me', cookies: { '__Host-ai-session': 'opaque' } })).statusCode).toBe(401);
});
it('emails a code for an unremembered browser and never returns it', async () => {
  const r = await post('/api/auth/password', { username: 'approved', password: 'a good long password' });
  expect(r.json().authenticated).toBe(false); expect(r.json().challengeId).toBeTruthy();
  expect(mail).toHaveBeenCalledWith(user.email, expect.stringMatching(/^\d{6}$/));
  const code = mail.mock.calls[0][1]; expect(r.body).not.toContain(code);
  expect(db.challenge.create.mock.calls[0][0].data.codeHash).toBe(codeDigest(cfg.secret, r.json().challengeId, code));
  expect(db.session.create).not.toHaveBeenCalled();
});
it('rejects wrong passwords and disabled accounts', async () => {
  expect((await post('/api/auth/password', { username: 'approved', password: 'wrong' })).statusCode).toBe(401);
  user.active = false;
  expect((await post('/api/auth/password', { username: 'approved', password: 'a good long password' })).statusCode).toBe(401);
  expect(db.session.create).not.toHaveBeenCalled(); expect(mail).not.toHaveBeenCalled();
});
it('checks remembered browser ownership and expiry, with secure cookies', async () => {
  db.trustedDevice.findUnique.mockResolvedValue({ userId: user.id, expiresAt: new Date(Date.now() + 100000) });
  const good = await post('/api/auth/password', { username: 'approved', password: 'a good long password' }, { '__Host-ai-device': 'opaque' });
  expect(good.json().authenticated).toBe(true);
  expect(good.headers['set-cookie']).toContain('HttpOnly'); expect(good.headers['set-cookie']).toContain('Secure');
  expect(db.trustedDevice.findUnique).toHaveBeenCalledWith({ where: { tokenHash: digest('opaque') } });
  for (const device of [{ userId: 'other', expiresAt: new Date(Date.now() + 100000) }, { userId: user.id, expiresAt: new Date(0) }]) {
    db.trustedDevice.findUnique.mockResolvedValue(device);
    expect((await post('/api/auth/password', { username: 'approved', password: 'a good long password' }, { '__Host-ai-device': 'opaque' })).json().authenticated).toBe(false);
  }
});
it('consumes codes once and stores only remembered-token hashes', async () => {
  const id = 'ae54b865-d596-47b9-9cb4-921e9be50889';
  db.challenge.updateMany.mockResolvedValue({ count: 1 });
  db.challenge.findUnique.mockResolvedValue({ id, userId: user.id, user, codeHash: codeDigest(cfg.secret, id, '123456') });
  const r = await post('/api/auth/password/confirm', { challengeId: id, code: '123456', remember: true });
  expect(r.json().authenticated).toBe(true);
  expect(db.challenge.updateMany.mock.calls[0][0].where.attempts).toEqual({ lt: 5 });
  expect(db.challenge.updateMany.mock.calls[0][0].where.expiresAt.gt).toBeInstanceOf(Date);
  const device = r.cookies.find(c => c.name === '__Host-ai-device')!;
  expect(db.trustedDevice.create.mock.calls[0][0].data.tokenHash).toBe(digest(device.value));
  db.challenge.deleteMany.mockResolvedValue({ count: 0 });
  expect((await post('/api/auth/password/confirm', { challengeId: id, code: '123456' })).statusCode).toBe(401);
});
it('rejects expired or exhausted and incorrect codes', async () => {
  const id = 'ae54b865-d596-47b9-9cb4-921e9be50889';
  db.challenge.updateMany.mockResolvedValue({ count: 0 });
  expect((await post('/api/auth/password/confirm', { challengeId: id, code: '123456' })).statusCode).toBe(401);
  db.challenge.updateMany.mockResolvedValue({ count: 1 });
  db.challenge.findUnique.mockResolvedValue({ id, userId: user.id, user, codeHash: codeDigest(cfg.secret, id, '111111') });
  expect((await post('/api/auth/password/confirm', { challengeId: id, code: '123456' })).statusCode).toBe(401);
  expect(db.session.create).not.toHaveBeenCalled();
});
it('requires a recent Google session for password setup', async () => {
  for (const session of [{ signInType: 'PASSWORD', createdAt: new Date() }, { signInType: 'GOOGLE', createdAt: new Date(0) }]) {
    db.session.findUnique.mockResolvedValue({ ...session, user, expiresAt: new Date(Date.now() + 100000) });
    expect((await post('/api/auth/password/setup', { username: 'approved', password: 'a replacement password' }, { '__Host-ai-session': 'opaque' })).statusCode).toBe(403);
  }
  expect(db.user.update).not.toHaveBeenCalled();
});
it('rejects OAuth callback without matching signed state', async () => {
  const r = await app.inject('/api/auth/google/callback?state=bad&code=bad');
  expect(r.statusCode).toBe(302); expect(r.headers.location).toBe('/?error=sign-in-denied');
  expect(db.user.create).not.toHaveBeenCalled();
});
