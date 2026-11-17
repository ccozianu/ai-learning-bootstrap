import type { FastifyReply, FastifyRequest } from "fastify";
import type { Config } from "./config.js";
import type {
  PrismaClient,
  SignInType,
  User,
} from "./generated/prisma/client.js";
import { approved, digest, normalizeEmail, token } from "./security.js";

export const SESSION_COOKIE = "__Host-ai-session";
export const OAUTH_COOKIE = "__Host-ai-oauth";
export const DEVICE_COOKIE = "__Host-ai-device";
export const IMPERSONATION_HEADER = "x-impersonation-token";
export const DAY = 86_400_000;

export class Denied extends Error {
  constructor(
    public statusCode = 401,
    message = "Access denied.",
  ) {
    super(message);
  }
}

export function cookieNames(cfg: Config) {
  return {
    sessionCookie: cfg.secure ? SESSION_COOKIE : "ai-session",
    oauthCookie: cfg.secure ? OAUTH_COOKIE : "ai-oauth",
    deviceCookie: cfg.secure ? DEVICE_COOKIE : "ai-device",
    cookieOpts: {
      path: "/",
      httpOnly: true,
      sameSite: "lax" as const,
      secure: cfg.secure,
    },
  };
}

export function publicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    roles: user.roles,
    accountStatus: user.accountStatus,
    signInTypes: user.signInTypes,
    lastSignInType: user.lastSignInType,
  };
}

export function extractImpersonationToken(
  req: FastifyRequest,
): string | undefined {
  const raw = req.headers[IMPERSONATION_HEADER];
  if (raw === undefined) return undefined;
  if (typeof raw !== "string") {
    throw new Denied(400, "Invalid impersonation header.");
  }
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > 256) {
    throw new Denied(400, "Invalid impersonation token.");
  }
  return trimmed;
}

export type LearnActor =
  | { mode: "STUDENT"; kid: User; previewParentId: null }
  | { mode: "PARENT_IMPERSONATION"; kid: User; previewParentId: string };

export interface EffectiveIdentity {
  actor: User;
  impersonation: {
    sessionId: string;
    parentUser: User;
    kidUser: User;
  } | null;
}

export interface AuthContext {
  current(req: FastifyRequest): Promise<User>;
  resolveEffectiveIdentity(req: FastifyRequest): Promise<EffectiveIdentity>;
  requireRole(req: FastifyRequest, role: "PARENT" | "KID"): Promise<User>;
  requireLearnActor(req: FastifyRequest): Promise<LearnActor>;
  permitted(user: User, depth?: number): Promise<boolean>;
  issueSession(
    reply: FastifyReply,
    user: User,
    method: SignInType,
    req: FastifyRequest,
    authenticatedAt?: Date,
  ): Promise<void>;
}

export function createAuthContext(db: PrismaClient, cfg: Config): AuthContext {
  const { sessionCookie, cookieOpts } = cookieNames(cfg);

  async function permitted(user: User, depth = 0): Promise<boolean> {
    if (user.accountStatus !== "ACTIVE") return false;
    if (user.roles.includes("KID")) {
      if (depth > 0 || !user.guardianUserId) return false;
      const guardian = await db.user.findUnique({
        where: { id: user.guardianUserId },
      });
      return Boolean(
        guardian &&
        guardian.roles.includes("PARENT") &&
        !guardian.roles.includes("KID") &&
        (await permitted(guardian, depth + 1)),
      );
    }
    if (!user.email) return false;
    if (
      cfg.devConsoleAuth &&
      cfg.devParentEmail &&
      normalizeEmail(user.email) === normalizeEmail(cfg.devParentEmail)
    ) {
      return true;
    }
    return approved(user.email, cfg.allowlist);
  }

  async function current(req: FastifyRequest): Promise<User> {
    const raw = req.cookies[sessionCookie];
    if (!raw) throw new Denied();
    const session = await db.session.findUnique({
      where: { tokenHash: digest(raw) },
      include: { user: true },
    });
    if (
      !session ||
      session.expiresAt < new Date() ||
      session.authVersion !== session.user.authVersion ||
      !(await permitted(session.user))
    ) {
      throw new Denied();
    }
    return session.user;
  }

  async function resolveEffectiveIdentity(
    req: FastifyRequest,
  ): Promise<EffectiveIdentity> {
    const cookieUser = await current(req);
    const impToken = extractImpersonationToken(req);
    if (!impToken) {
      return { actor: cookieUser, impersonation: null };
    }

    if (
      cookieUser.roles.includes("KID") ||
      !cookieUser.roles.includes("PARENT")
    ) {
      throw new Denied(403, "Only active parents can impersonate a student.");
    }

    const imp = await db.impersonationSession.findUnique({
      where: { tokenHash: digest(impToken) },
      include: { kid: true },
    });
    if (
      !imp ||
      imp.expiresAt < new Date() ||
      imp.parentUserId !== cookieUser.id ||
      imp.parentAuthVersion !== cookieUser.authVersion ||
      imp.kidAuthVersion !== imp.kid.authVersion ||
      imp.kid.guardianUserId !== cookieUser.id ||
      !imp.kid.roles.includes("KID") ||
      !(await permitted(imp.kid))
    ) {
      throw new Denied(401, "Impersonation session expired or ended.");
    }

    return {
      actor: imp.kid,
      impersonation: {
        sessionId: imp.id,
        parentUser: cookieUser,
        kidUser: imp.kid,
      },
    };
  }

  async function requireRole(
    req: FastifyRequest,
    role: "PARENT" | "KID",
  ): Promise<User> {
    const impToken = extractImpersonationToken(req);
    if (role === "PARENT" && impToken) {
      throw new Denied(
        403,
        "Parent endpoints cannot be called from an impersonated student tab.",
      );
    }
    const user = await current(req);
    if (!user.roles.includes(role)) {
      throw new Denied(403, "This workspace is restricted to another role.");
    }
    return user;
  }

  async function requireLearnActor(req: FastifyRequest): Promise<LearnActor> {
    const { actor, impersonation } = await resolveEffectiveIdentity(req);
    if (impersonation) {
      return {
        mode: "PARENT_IMPERSONATION",
        kid: impersonation.kidUser,
        previewParentId: impersonation.parentUser.id,
      };
    }
    if (!actor.roles.includes("KID")) {
      throw new Denied(403, "This workspace is restricted to students.");
    }
    return { mode: "STUDENT", kid: actor, previewParentId: null };
  }

  async function issueSession(
    reply: FastifyReply,
    user: User,
    method: SignInType,
    req: FastifyRequest,
    authenticatedAt = new Date(),
  ): Promise<void> {
    const raw = token();
    await db.$transaction(async (tx) => {
      const updated = await tx.user.updateMany({
        where: {
          id: user.id,
          authVersion: user.authVersion,
          accountStatus: "ACTIVE",
        },
        data: {
          lastSignInType: method,
          passwordFailures: 0,
          lockedUntil: null,
        },
      });
      if (!updated.count) throw new Denied();
      if (req.cookies[sessionCookie]) {
        await tx.session.deleteMany({
          where: { tokenHash: digest(req.cookies[sessionCookie]!) },
        });
      }
      await tx.session.create({
        data: {
          tokenHash: digest(raw),
          userId: user.id,
          authVersion: user.authVersion,
          signInType: method,
          createdAt: authenticatedAt,
          expiresAt: new Date(Date.now() + DAY),
        },
      });
    });
    reply.setCookie(sessionCookie, raw, { ...cookieOpts, maxAge: DAY / 1000 });
  }

  return {
    current,
    resolveEffectiveIdentity,
    requireRole,
    requireLearnActor,
    permitted,
    issueSession,
  };
}
