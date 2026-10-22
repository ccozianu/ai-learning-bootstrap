import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import staticFiles from '@fastify/static';
import mercurius from 'mercurius';
import { OAuth2Client } from 'google-auth-library';
import { hash, verify, argon2id } from 'argon2';
import { randomInt, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { z } from 'zod';
import type { PrismaClient, User } from './generated/prisma/client.js';
import type { Config } from './config.js';
import { approved, codeDigest, digest, equal, normalizeEmail, token, trustedOrigin } from './security.js';

const DAY = 86400000;
const loginBody = z.object({ username: z.string().trim().toLowerCase().min(3).max(80), password: z.string().min(1).max(128) });
const setupBody = loginBody.extend({ username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,32}$/), password: z.string().min(12).max(128) });
const confirmationBody = z.object({ challengeId: z.string().uuid(), code: z.string().regex(/^\d{6}$/), remember: z.boolean().default(false) });
const publicUser = (user: User) => ({ id: user.id, email: user.email, username: user.username, signInTypes: user.signInTypes, lastSignInType: user.lastSignInType });
class Denied extends Error { constructor(public statusCode = 401, message = 'Sign-in failed or access is not approved.') { super(message); } }
export type Mailer = (to: string, code: string) => Promise<void>;

export async function buildApp(db: PrismaClient, cfg: Config, sendCode: Mailer) {
  const app = Fastify({ logger: false, bodyLimit: 8192, trustProxy: false });
  await app.register(cookie, { secret: cfg.secret });
  await app.register(helmet, { contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'"], frameAncestors: ["'none'"] } } });
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });
  const oauth = new OAuth2Client(cfg.googleClientId, cfg.googleClientSecret, `${cfg.origin}/api/auth/google/callback`);
  const options = { httpOnly: true, secure: cfg.secure, sameSite: 'lax' as const, path: '/' };
  const sessionCookie = cfg.secure ? '__Host-ai-session' : 'ai-session';
  const deviceCookie = cfg.secure ? '__Host-ai-device' : 'ai-device';
  const oauthCookie = cfg.secure ? '__Host-ai-oauth' : 'ai-oauth';
  const authLimit = { rateLimit: { max: 10, timeWindow: '15 minutes' } };
  const permitted = async (user: User | null) => !!user && user.active && await approved(user.email, cfg.allowlist);
  async function current(req: FastifyRequest) {
    const raw = req.cookies[sessionCookie];
    if (!raw) throw new Denied();
    const session = await db.session.findUnique({ where: { tokenHash: digest(raw) }, include: { user: true } });
    if (!session || session.expiresAt <= new Date() || !await permitted(session.user)) throw new Denied();
    return session.user;
  }
  async function issueSession(reply: FastifyReply, user: User, method: 'GOOGLE' | 'PASSWORD', req: FastifyRequest) {
    const raw = token();
    await db.$transaction(async tx => {
      if (req.cookies[sessionCookie]) await tx.session.deleteMany({ where: { tokenHash: digest(req.cookies[sessionCookie]!) } });
      await tx.session.create({ data: { tokenHash: digest(raw), userId: user.id, signInType: method, expiresAt: new Date(Date.now() + DAY) } });
      await tx.user.update({ where: { id: user.id }, data: { lastSignInType: method, passwordFailures: 0, lockedUntil: null } });
    });
    reply.setCookie(sessionCookie, raw, { ...options, maxAge: DAY / 1000 });
  }
  app.addHook('onRequest', async (req, reply) => {
    if (req.url.startsWith('/api') || req.url.startsWith('/graphql')) reply.header('Cache-Control', 'no-store');
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && !trustedOrigin(req.headers.origin, cfg.origin)) throw new Denied(403, 'Request origin rejected.');
  });
  app.setErrorHandler((error, _req, reply) => {
    // Never serialize provider, SMTP, database or validation errors: they may contain secrets.
    if (error instanceof Denied) return reply.code(error.statusCode).send({ error: error.message });
    if (error instanceof z.ZodError) return reply.code(400).send({ error: 'Check the submitted fields.' });
    const status = typeof error === 'object' && error && 'statusCode' in error ? Number(error.statusCode) : 500;
    return reply.code(status >= 400 && status < 500 ? status : 503).send({ error: status === 429 ? 'Too many attempts. Please wait.' : 'Request could not be completed.' });
  });
  app.get('/api/health', async () => ({ status: 'ok' }));
  app.get('/api/me', async req => publicUser(await current(req)));
  app.get('/api/auth/google', { config: authLimit }, async (_req, reply) => {
    const state = token(), nonce = token();
    const { codeVerifier, codeChallenge } = await oauth.generateCodeVerifierAsync();
    reply.setCookie(oauthCookie, JSON.stringify({ state, nonce, codeVerifier, expires: Date.now() + 600000 }), { ...options, signed: true, maxAge: 600 });
    return reply.redirect(oauth.generateAuthUrl({ scope: ['openid', 'email'], state, nonce, code_challenge: codeChallenge, code_challenge_method: 'S256' as never, prompt: 'select_account' }));
  });
  app.get('/api/auth/google/callback', { config: authLimit }, async (req, reply) => {
    const raw = req.cookies[oauthCookie];
    reply.clearCookie(oauthCookie, options);
    try {
      const query = z.object({ code: z.string().max(4096), state: z.string().max(128) }).parse(req.query);
      const signed = raw && req.unsignCookie(raw);
      if (!signed || !signed.valid || !signed.value) throw new Denied();
      const saved = z.object({ state: z.string(), nonce: z.string(), codeVerifier: z.string(), expires: z.number() }).parse(JSON.parse(signed.value));
      if (saved.expires < Date.now() || !equal(saved.state, query.state)) throw new Denied();
      const { tokens } = await oauth.getToken({ code: query.code, codeVerifier: saved.codeVerifier });
      if (!tokens.id_token) throw new Denied();
      const ticket = await oauth.verifyIdToken({ idToken: tokens.id_token, audience: cfg.googleClientId });
      const identity = ticket.getPayload();
      if (!identity?.sub || !identity.email || !identity.email_verified || (identity as unknown as { nonce?: string }).nonce !== saved.nonce) throw new Denied();
      const email = normalizeEmail(identity.email);
      if (!await approved(email, cfg.allowlist)) throw new Denied();
      // Google subject is the stable identity. Never auto-link by an unverified email.
      let user = await db.user.findUnique({ where: { googleSubject: identity.sub } });
      if (!user) user = await db.user.create({ data: { googleSubject: identity.sub, email } });
      else if (user.email !== email) user = await db.user.update({ where: { id: user.id }, data: { email } });
      if (!await permitted(user)) throw new Denied();
      await issueSession(reply, user, 'GOOGLE', req);
      return reply.redirect('/');
    } catch { return reply.redirect('/?error=sign-in-denied'); }
  });
  app.post('/api/auth/password/setup', { config: authLimit }, async (req, reply) => {
    const user = await current(req);
    const input = setupBody.parse(req.body);
    // Google remains the recovery path; require Google reauthentication before setting/replacing a password.
    const session = await db.session.findUnique({ where: { tokenHash: digest(req.cookies[sessionCookie]!) } });
    if (!session || session.signInType !== 'GOOGLE' || session.createdAt.getTime() < Date.now() - 600000) throw new Denied(403, 'Sign in with Google before setting a password.');
    const passwordHash = await hash(input.password, { type: argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
    await db.$transaction(async tx => {
      await tx.user.update({ where: { id: user.id }, data: { username: input.username, passwordHash, signInTypes: ['GOOGLE', 'PASSWORD'], passwordFailures: 0, lockedUntil: null } });
      await tx.trustedDevice.deleteMany({ where: { userId: user.id } });
      await tx.challenge.deleteMany({ where: { userId: user.id } });
      await tx.session.deleteMany({ where: { userId: user.id } });
    });
    reply.clearCookie(deviceCookie, options);
    await issueSession(reply, user, 'GOOGLE', req);
    return { ok: true };
  });
  // A dummy hash keeps an unknown username on the password-verification path.
  const dummyHash = await hash(token(), { type: argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
  app.post('/api/auth/password', { config: authLimit }, async (req, reply) => {
    const input = loginBody.parse(req.body);
    const user = await db.user.findUnique({ where: { username: input.username } });
    const valid = await verify(user?.passwordHash ?? dummyHash, input.password);
    if (!user || !valid || !await permitted(user) || (user.lockedUntil && user.lockedUntil > new Date())) {
      if (user && !valid) {
        const updated = await db.user.update({ where: { id: user.id }, data: { passwordFailures: { increment: 1 } } });
        if (updated.passwordFailures >= 5) await db.user.update({ where: { id: user.id }, data: { lockedUntil: new Date(Date.now() + 900000) } });
      }
      throw new Denied();
    }
    const device = req.cookies[deviceCookie] && await db.trustedDevice.findUnique({ where: { tokenHash: digest(req.cookies[deviceCookie]!) } });
    if (device && device.userId === user.id && device.expiresAt > new Date()) {
      await issueSession(reply, user, 'PASSWORD', req);
      return { authenticated: true };
    }
    const id = randomUUID(), code = randomInt(0, 1000000).toString().padStart(6, '0');
    await db.$transaction(async tx => {
      await tx.challenge.deleteMany({ where: { userId: user.id } });
      await tx.challenge.create({ data: { id, userId: user.id, codeHash: codeDigest(cfg.secret, id, code), expiresAt: new Date(Date.now() + 600000) } });
    });
    try { await sendCode(user.email, code); }
    catch { await db.challenge.deleteMany({ where: { id } }); throw new Denied(503, 'Confirmation email could not be sent.'); }
    return { authenticated: false, challengeId: id };
  });
  app.post('/api/auth/password/confirm', { config: authLimit }, async (req, reply) => {
    const input = confirmationBody.parse(req.body);
    // Increment under a row lock. deleteMany below permits only one concurrent success.
    const challenge = await db.$transaction(async tx => {
      const touched = await tx.challenge.updateMany({ where: { id: input.challengeId, attempts: { lt: 5 }, expiresAt: { gt: new Date() } }, data: { attempts: { increment: 1 } } });
      return touched.count ? tx.challenge.findUnique({ where: { id: input.challengeId }, include: { user: true } }) : null;
    });
    if (!challenge || !equal(challenge.codeHash, codeDigest(cfg.secret, challenge.id, input.code)) || !await permitted(challenge.user)) throw new Denied();
    const consumed = await db.challenge.deleteMany({ where: { id: challenge.id } });
    if (!consumed.count) throw new Denied();
    if (input.remember) {
      const raw = token();
      await db.trustedDevice.create({ data: { tokenHash: digest(raw), userId: challenge.userId, expiresAt: new Date(Date.now() + 30 * DAY) } });
      reply.setCookie(deviceCookie, raw, { ...options, maxAge: 30 * DAY / 1000 });
    }
    await issueSession(reply, challenge.user, 'PASSWORD', req);
    return { authenticated: true };
  });
  app.post('/api/auth/logout', async (req, reply) => {
    const raw = req.cookies[sessionCookie];
    if (raw) await db.session.deleteMany({ where: { tokenHash: digest(raw) } });
    reply.clearCookie(sessionCookie, options);
    return { ok: true };
  });
  app.post('/api/auth/forget-browsers', async (req, reply) => {
    const user = await current(req);
    await db.$transaction([db.trustedDevice.deleteMany({ where: { userId: user.id } }), db.session.deleteMany({ where: { userId: user.id } }), db.challenge.deleteMany({ where: { userId: user.id } })]);
    reply.clearCookie(deviceCookie, options).clearCookie(sessionCookie, options);
    return { ok: true };
  });
  await app.register(mercurius, {
    schema: 'type User { id: ID!, email: String!, username: String, signInTypes: [String!]!, lastSignInType: String! } type Query { me: User! }',
    resolvers: { Query: { me: async (_root, _args, context) => publicUser(await current(context.reply.request)) } },
    graphiql: false, queryDepth: 3,
    errorFormatter: () => ({ statusCode: 400, response: { data: null, errors: [{ message: 'Query unavailable or sign-in required.' }] } })
  });
  if (process.env.NODE_ENV === 'production') await app.register(staticFiles, { root: resolve('dist') });
  return app;
}
