export function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing setting: ${name}`);
  return value;
}
export function databaseConfig() {
  return { host: required('POSTGRES_HOST'), port: Number(process.env.POSTGRES_PORT ?? 5432),
    database: required('POSTGRES_DB'), user: required('POSTGRES_USER'), password: required('POSTGRES_PASSWORD'),
    ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: true } : false,
    connectionTimeoutMillis: 10000 };
}
export function config() {
  const origin = new URL(required('APP_ORIGIN')).origin;
  if (process.env.NODE_ENV === 'production' && !origin.startsWith('https://')) throw new Error('HTTPS required');
  const secret = required('AUTH_SECRET');
  if (secret.length < 32) throw new Error('AUTH_SECRET must have at least 32 characters');
  return { origin, secret, secure: origin.startsWith('https://'),
    allowlist: process.env.APPROVED_GMAIL_FILE ?? 'config/approved-gmail.txt',
    googleClientId: required('GOOGLE_CLIENT_ID'), googleClientSecret: required('GOOGLE_CLIENT_SECRET'),
    smtp: { host: required('SMTP_HOST'), port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true', requireTLS: process.env.SMTP_SECURE !== 'true',
      auth: { user: required('SMTP_USER'), pass: required('SMTP_PASSWORD') },
      logger: false as const, debug: false as const }, smtpFrom: required('SMTP_FROM') };
}
export type Config = ReturnType<typeof config>;
