import { randomBytes } from "node:crypto";

export function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing setting: ${name}`);
  return value;
}

export function databaseConfig() {
  return {
    host: required("POSTGRES_HOST"),
    port: Number(process.env.POSTGRES_PORT ?? 5432),
    database: required("POSTGRES_DB"),
    user: required("POSTGRES_USER"),
    password: required("POSTGRES_PASSWORD"),
    ssl:
      process.env.POSTGRES_SSL === "true"
        ? { rejectUnauthorized: true }
        : false,
    connectionTimeoutMillis: 10000,
  };
}

export function config() {
  const isProd = process.env.NODE_ENV === "production";
  if (isProd && process.env.DEV_CONSOLE_AUTH === "true") {
    throw new Error("DEV_CONSOLE_AUTH is forbidden when NODE_ENV=production.");
  }
  const devConsoleAuth = !isProd && process.env.DEV_CONSOLE_AUTH === "true";

  const originRaw =
    process.env.APP_ORIGIN ??
    (devConsoleAuth ? "http://127.0.0.1:5173" : required("APP_ORIGIN"));
  const origin = new URL(originRaw).origin;
  if (isProd && !origin.startsWith("https://")) {
    throw new Error("HTTPS required");
  }

  let secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (!devConsoleAuth) {
      throw new Error("Missing setting: AUTH_SECRET");
    }
    secret = randomBytes(32).toString("hex");
  }
  if (secret.length < 32) {
    throw new Error("AUTH_SECRET must have at least 32 characters");
  }

  const smtpConfigured = Boolean(process.env.SMTP_HOST);
  const smtp = smtpConfigured
    ? {
        host: required("SMTP_HOST"),
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === "true",
        requireTLS: process.env.SMTP_SECURE !== "true",
        auth: { user: required("SMTP_USER"), pass: required("SMTP_PASSWORD") },
        logger: false as const,
        debug: false as const,
      }
    : undefined;

  if (!smtp && !devConsoleAuth) {
    throw new Error("Missing setting: SMTP_HOST");
  }

  const devParentEmail = process.env.DEV_PARENT_EMAIL?.trim().toLowerCase();

  return {
    origin,
    secret,
    secure: origin.startsWith("https://"),
    allowlist: process.env.APPROVED_GMAIL_FILE ?? "config/approved-gmail.txt",
    googleClientId:
      process.env.GOOGLE_CLIENT_ID ??
      (devConsoleAuth ? "" : required("GOOGLE_CLIENT_ID")),
    googleClientSecret:
      process.env.GOOGLE_CLIENT_SECRET ??
      (devConsoleAuth ? "" : required("GOOGLE_CLIENT_SECRET")),
    smtp,
    smtpFrom:
      process.env.SMTP_FROM ??
      (devConsoleAuth ? "dev@localhost" : required("SMTP_FROM")),
    devConsoleAuth,
    devParentEmail: devParentEmail || undefined,
  };
}

export type Config = {
  origin: string;
  secret: string;
  secure: boolean;
  allowlist: string;
  googleClientId: string;
  googleClientSecret: string;
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    requireTLS: boolean;
    auth: { user: string; pass: string };
    logger: false;
    debug: false;
  };
  smtpFrom: string;
  devConsoleAuth?: boolean;
  devParentEmail?: string;
};
