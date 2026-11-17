import cookie from "@fastify/cookie";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import staticFiles from "@fastify/static";
import { argon2id, hash, verify } from "argon2";
import { randomInt, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import Fastify from "fastify";
import { CodeChallengeMethod, OAuth2Client } from "google-auth-library";
import mercurius from "mercurius";
import { z } from "zod";
import {
  cookieNames,
  createAuthContext,
  DAY,
  Denied,
  extractImpersonationToken,
  publicUser,
} from "./auth-helpers.js";
import type { Config } from "./config.js";
import type { PrismaClient } from "./generated/prisma/client.js";
import { registerLearnRoutes } from "./routes/learn.js";
import { registerParentRoutes } from "./routes/parent.js";
import {
  approved,
  codeDigest,
  digest,
  equal,
  normalizeEmail,
  token,
  trustedOrigin,
} from "./security.js";

const setupBody = z.object({
  username: z.string().regex(/^[a-z0-9_]{3,32}$/),
  password: z.string().min(12).max(128),
});

const loginBody = z.object({
  username: z.string().min(3).max(80),
  password: z.string().min(1).max(128),
});

const confirmationBody = z.object({
  challengeId: z.string().uuid(),
  code: z.string().regex(/^[0-9]{6}$/),
  remember: z.boolean().default(false),
});

const devTokenBody = z.object({
  token: z.string().min(16).max(256),
});

const impersonateExchangeBody = z.object({
  code: z.string().min(16).max(256),
});

export async function buildApp(
  db: PrismaClient,
  cfg: Config,
  sendCode: (to: string, code: string) => Promise<void>,
) {
  const app = Fastify({ logger: false, bodyLimit: 65536 });
  const oauth =
    cfg.googleClientId && cfg.googleClientSecret
      ? new OAuth2Client(
          cfg.googleClientId,
          cfg.googleClientSecret,
          `${cfg.origin}/api/auth/google/callback`,
        )
      : undefined;

  const { sessionCookie, oauthCookie, deviceCookie, cookieOpts } =
    cookieNames(cfg);
  const auth = createAuthContext(db, cfg);

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
      },
    },
    frameguard: { action: "deny" },
    referrerPolicy: { policy: "no-referrer" },
    hsts: cfg.secure ? { maxAge: 31536000, includeSubDomains: true } : false,
  });

  await app.register(cookie, { secret: cfg.secret });
  await app.register(rateLimit, { global: false });
  const authLimit = { rateLimit: { max: 10, timeWindow: "1 minute" } };

  app.addHook("onRequest", async (req, reply) => {
    if (req.url.startsWith("/api") || req.url.startsWith("/graphql")) {
      reply.header("Cache-Control", "no-store");
    }
    if (
      ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
      !trustedOrigin(req.headers.origin, cfg.origin)
    ) {
      return reply.code(403).send({ error: "Request origin rejected." });
    }
  });

  app.setErrorHandler((error, _req, reply) => {
    // Never serialize provider, SMTP, database or validation errors: they may contain secrets.
    if (error instanceof Denied) {
      return reply.code(error.statusCode).send({ error: error.message });
    }
    if (error instanceof z.ZodError) {
      return reply.code(400).send({ error: "Check the submitted fields." });
    }
    const status =
      typeof error === "object" && error && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    return reply.code(status >= 400 && status < 500 ? status : 503).send({
      error:
        status === 429
          ? "Too many attempts. Please wait."
          : "Request could not be completed.",
    });
  });

  app.get("/api/health", async () => ({ status: "ok" }));
  app.get("/api/ready", async () => {
    await db.$queryRawUnsafe("SELECT 1");
    return { status: "ready" };
  });

  app.get("/api/me", async (req) => {
    const { actor, impersonation } = await auth.resolveEffectiveIdentity(req);
    if (!impersonation) return publicUser(actor);
    return {
      ...publicUser(impersonation.kidUser),
      impersonation: {
        active: true,
        parentEmail: impersonation.parentUser.email,
        kidId: impersonation.kidUser.id,
        kidDisplayName: impersonation.kidUser.displayName,
        kidUsername: impersonation.kidUser.username,
      },
    };
  });

  app.post(
    "/api/auth/impersonate/exchange",
    { config: authLimit },
    async (req) => {
      const parent = await auth.requireRole(req, "PARENT");
      const { code } = impersonateExchangeBody.parse(req.body);
      const launchHash = digest(code.trim());
      const tabToken = token();
      const tabHash = digest(tabToken);
      const now = new Date();
      const twoMinutesAgo = new Date(now.getTime() - 120_000);

      const imp = await db.$transaction(async (tx) => {
        const claimed = await tx.impersonationSession.updateMany({
          where: {
            launchCodeHash: launchHash,
            tokenHash: null,
            parentUserId: parent.id,
            expiresAt: { gt: now },
            createdAt: { gt: twoMinutesAgo },
          },
          data: {
            launchCodeHash: null,
            tokenHash: tabHash,
          },
        });
        if (!claimed.count) {
          throw new Denied(401, "Impersonation link is invalid or expired.");
        }
        return tx.impersonationSession.findUnique({
          where: { tokenHash: tabHash },
          include: { kid: true },
        });
      });

      if (
        !imp ||
        imp.parentAuthVersion !== parent.authVersion ||
        imp.kidAuthVersion !== imp.kid.authVersion ||
        imp.kid.guardianUserId !== parent.id ||
        !(await auth.permitted(imp.kid))
      ) {
        throw new Denied(401, "Impersonation session is no longer valid.");
      }

      return {
        tabToken,
        kidDisplayName: imp.kid.displayName,
      };
    },
  );

  app.post("/api/auth/impersonate/exit", async (req) => {
    const parent = await auth.current(req);
    const impToken = extractImpersonationToken(req);
    if (impToken) {
      const deleted = await db.impersonationSession.findUnique({
        where: { tokenHash: digest(impToken) },
      });
      if (deleted && deleted.parentUserId === parent.id) {
        await db.$transaction([
          db.impersonationSession.deleteMany({
            where: { id: deleted.id },
          }),
          db.auditLog.create({
            data: {
              eventType: "IMPERSONATION_ENDED",
              actorUserId: parent.id,
              targetUserId: deleted.kidUserId,
              detail: "Parent exited kid impersonation preview tab.",
            },
          }),
        ]);
      }
    }
    return { ok: true };
  });

  app.post("/api/auth/dev-token", { config: authLimit }, async (req, reply) => {
    if (!cfg.devConsoleAuth) {
      throw new Denied(404, "Development token sign-in is disabled.");
    }
    const { token: rawToken } = devTokenBody.parse(req.body);
    const tokenHash = digest(rawToken.trim());
    const now = new Date();

    const consumed = await db.devLoginToken.updateMany({
      where: {
        tokenHash,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      data: { consumedAt: now },
    });
    if (!consumed.count)
      throw new Denied(401, "Invalid or expired one-time token.");

    const record = await db.devLoginToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!record || !(await auth.permitted(record.user))) {
      throw new Denied();
    }
    await auth.issueSession(reply, record.user, "DEV_TOKEN", req);
    return { authenticated: true, user: publicUser(record.user) };
  });

  app.get("/api/auth/google", { config: authLimit }, async (_req, reply) => {
    if (!oauth) {
      return reply.redirect("/?error=sign-in-denied");
    }
    const state = token(),
      nonce = token();
    const { codeVerifier, codeChallenge } =
      await oauth.generateCodeVerifierAsync();
    reply.setCookie(
      oauthCookie,
      JSON.stringify({
        state,
        nonce,
        codeVerifier,
        expires: Date.now() + 600000,
      }),
      { ...cookieOpts, signed: true, maxAge: 600 },
    );
    return reply.redirect(
      oauth.generateAuthUrl({
        scope: ["openid", "email"],
        state,
        nonce,
        code_challenge: codeChallenge,
        code_challenge_method: CodeChallengeMethod.S256,
        prompt: "select_account",
      }),
    );
  });

  app.get(
    "/api/auth/google/callback",
    { config: authLimit },
    async (req, reply) => {
      const raw = req.cookies[oauthCookie];
      reply.clearCookie(oauthCookie, cookieOpts);
      try {
        if (!oauth) throw new Denied();
        const query = z
          .object({ code: z.string().max(4096), state: z.string().max(128) })
          .parse(req.query);
        const signed = raw && req.unsignCookie(raw);
        if (!signed || !signed.valid || !signed.value) throw new Denied();
        const saved = z
          .object({
            state: z.string(),
            nonce: z.string(),
            codeVerifier: z.string(),
            expires: z.number(),
          })
          .parse(JSON.parse(signed.value));
        if (saved.expires < Date.now() || !equal(saved.state, query.state)) {
          throw new Denied();
        }
        const { tokens } = await oauth.getToken({
          code: query.code,
          codeVerifier: saved.codeVerifier,
        });
        if (!tokens.id_token) throw new Denied();
        const ticket = await oauth.verifyIdToken({
          idToken: tokens.id_token,
          audience: cfg.googleClientId,
        });
        const identity = ticket.getPayload();
        if (
          !identity?.sub ||
          !identity.email ||
          !identity.email_verified ||
          (identity as unknown as { nonce?: string }).nonce !== saved.nonce
        ) {
          throw new Denied();
        }
        const email = normalizeEmail(identity.email);
        if (!(await approved(email, cfg.allowlist))) throw new Denied();

        // Google subject is the stable identity. Never auto-link by an unverified email.
        let user = await db.user.findUnique({
          where: { googleSubject: identity.sub },
        });
        if (!user) {
          user = await db.user.create({
            data: {
              googleSubject: identity.sub,
              email,
              roles: ["PARENT"],
              accountStatus: "ACTIVE",
              signInTypes: ["GOOGLE"],
              lastSignInType: "GOOGLE",
            },
          });
        } else if (user.email !== email) {
          user = await db.user.update({
            where: { id: user.id },
            data: { email },
          });
        }
        if (!(await auth.permitted(user))) throw new Denied();
        await auth.issueSession(reply, user, "GOOGLE", req);
        return reply.redirect("/");
      } catch {
        return reply.redirect("/?error=sign-in-denied");
      }
    },
  );

  app.post(
    "/api/auth/password/setup",
    { config: authLimit },
    async (req, reply) => {
      if (extractImpersonationToken(req)) {
        throw new Denied(
          403,
          "Password setup cannot be invoked from an impersonated tab.",
        );
      }
      const user = await auth.current(req);
      if (user.roles.includes("KID")) {
        throw new Denied(403, "Only a parent can change a student password.");
      }
      const input = setupBody.parse(req.body);
      // Google (or dev bootstrap token in local dev) remains recovery; require recent authentication.
      const session = await db.session.findUnique({
        where: { tokenHash: digest(req.cookies[sessionCookie]!) },
      });
      if (
        !session ||
        (session.signInType !== "GOOGLE" &&
          session.signInType !== "DEV_TOKEN") ||
        session.createdAt.getTime() < Date.now() - 600000
      ) {
        throw new Denied(403, "Sign in with Google before setting a password.");
      }
      const passwordHash = await hash(input.password, {
        type: argon2id,
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      });
      const nextTypes = Array.from(
        new Set([...user.signInTypes, "PASSWORD" as const]),
      );
      const updatedUser = await db
        .$transaction(async (tx) => {
          const updated = await tx.user.update({
            where: {
              id: user.id,
              authVersion: user.authVersion,
              accountStatus: "ACTIVE",
            },
            data: {
              authVersion: { increment: 1 },
              username: input.username,
              passwordHash,
              signInTypes: nextTypes.length
                ? nextTypes
                : ["GOOGLE", "PASSWORD"],
              passwordFailures: 0,
              lockedUntil: null,
            },
          });
          await tx.trustedDevice.deleteMany({ where: { userId: user.id } });
          await tx.challenge.deleteMany({ where: { userId: user.id } });
          await tx.session.deleteMany({ where: { userId: user.id } });
          return updated;
        })
        .catch((error: unknown) => {
          if (
            typeof error === "object" &&
            error &&
            "code" in error &&
            error.code === "P2002"
          ) {
            throw new Denied(409, "That username is unavailable.");
          }
          throw error;
        });
      reply.clearCookie(deviceCookie, cookieOpts);
      await auth.issueSession(
        reply,
        updatedUser,
        session.signInType,
        req,
        session.createdAt,
      );
      return { ok: true };
    },
  );

  // A dummy hash keeps an unknown username on the password-verification path.
  const dummyHash = await hash(token(), {
    type: argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  app.post("/api/auth/password", { config: authLimit }, async (req, reply) => {
    const input = loginBody.parse(req.body);
    const user = await db.user.findUnique({
      where: { username: input.username },
    });
    if (user?.lockedUntil && user.lockedUntil > new Date()) throw new Denied();
    if (user?.lockedUntil) {
      await db.user.updateMany({
        where: { id: user.id, lockedUntil: { lte: new Date() } },
        data: { passwordFailures: 0, lockedUntil: null },
      });
    }
    const valid = await verify(user?.passwordHash ?? dummyHash, input.password);
    if (!user || !valid || !(await auth.permitted(user))) {
      if (user && !valid) {
        const updated = await db.user.update({
          where: { id: user.id },
          data: { passwordFailures: { increment: 1 } },
        });
        if (updated.passwordFailures >= 5) {
          await db.user.update({
            where: { id: user.id },
            data: { lockedUntil: new Date(Date.now() + 900000) },
          });
        }
      }
      throw new Denied();
    }
    const accepted = await db.user.updateMany({
      where: {
        id: user.id,
        authVersion: user.authVersion,
        accountStatus: "ACTIVE",
      },
      data: { passwordFailures: 0, lockedUntil: null },
    });
    if (!accepted.count) throw new Denied();

    const device =
      req.cookies[deviceCookie] &&
      (await db.trustedDevice.findUnique({
        where: { tokenHash: digest(req.cookies[deviceCookie]!) },
      }));
    if (
      device &&
      device.userId === user.id &&
      device.authVersion === user.authVersion &&
      device.expiresAt > new Date()
    ) {
      await auth.issueSession(reply, user, "PASSWORD", req);
      return { authenticated: true };
    }

    // Resolve email target: kids route 2FA to their verified active guardian's email.
    let targetEmail = user.email;
    if (user.roles.includes("KID")) {
      if (!user.guardianUserId) throw new Denied();
      const guardian = await db.user.findUnique({
        where: { id: user.guardianUserId },
      });
      if (!guardian || guardian.accountStatus !== "ACTIVE" || !guardian.email) {
        throw new Denied();
      }
      targetEmail = guardian.email;
    }
    if (!targetEmail) throw new Denied();

    const id = randomUUID(),
      code = randomInt(0, 1000000).toString().padStart(6, "0");
    await db.$transaction(async (tx) => {
      await tx.challenge.deleteMany({ where: { userId: user.id } });
      await tx.challenge.create({
        data: {
          id,
          authVersion: user.authVersion,
          userId: user.id,
          codeHash: codeDigest(cfg.secret, id, code),
          expiresAt: new Date(Date.now() + 600000),
        },
      });
    });
    try {
      await sendCode(targetEmail, code);
    } catch {
      await db.challenge.deleteMany({ where: { id } });
      throw new Denied(503, "Confirmation email could not be sent.");
    }
    return { authenticated: false, challengeId: id };
  });

  app.post(
    "/api/auth/password/confirm",
    { config: authLimit },
    async (req, reply) => {
      const input = confirmationBody.parse(req.body);
      const challenge = await db.$transaction(async (tx) => {
        const touched = await tx.challenge.updateMany({
          where: {
            id: input.challengeId,
            attempts: { lt: 5 },
            expiresAt: { gt: new Date() },
          },
          data: { attempts: { increment: 1 } },
        });
        return touched.count
          ? tx.challenge.findUnique({
              where: { id: input.challengeId },
              include: { user: true },
            })
          : null;
      });
      if (
        !challenge ||
        challenge.authVersion !== challenge.user.authVersion ||
        !equal(
          challenge.codeHash,
          codeDigest(cfg.secret, challenge.id, input.code),
        ) ||
        !(await auth.permitted(challenge.user))
      ) {
        throw new Denied();
      }
      const consumed = await db.challenge.deleteMany({
        where: { id: challenge.id },
      });
      if (!consumed.count) throw new Denied();
      if (input.remember) {
        const raw = token();
        await db.trustedDevice.create({
          data: {
            tokenHash: digest(raw),
            userId: challenge.userId,
            authVersion: challenge.authVersion,
            expiresAt: new Date(Date.now() + 30 * DAY),
          },
        });
        reply.setCookie(deviceCookie, raw, {
          ...cookieOpts,
          maxAge: (30 * DAY) / 1000,
        });
      }
      await auth.issueSession(reply, challenge.user, "PASSWORD", req);
      return { authenticated: true };
    },
  );

  app.post("/api/auth/logout", async (req, reply) => {
    if (extractImpersonationToken(req)) {
      throw new Denied(
        403,
        "Use Exit Impersonation instead of logging out from a preview tab.",
      );
    }
    const raw = req.cookies[sessionCookie];
    if (raw) await db.session.deleteMany({ where: { tokenHash: digest(raw) } });
    reply.clearCookie(sessionCookie, cookieOpts);
    return { ok: true };
  });

  app.post("/api/auth/forget-browsers", async (req, reply) => {
    if (extractImpersonationToken(req)) {
      throw new Denied(
        403,
        "Forget browsers cannot be invoked from an impersonated tab.",
      );
    }
    const user = await auth.current(req);
    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: { authVersion: { increment: 1 } },
      }),
      db.trustedDevice.deleteMany({ where: { userId: user.id } }),
      db.session.deleteMany({ where: { userId: user.id } }),
      db.challenge.deleteMany({ where: { userId: user.id } }),
      db.impersonationSession.deleteMany({ where: { parentUserId: user.id } }),
    ]);
    reply
      .clearCookie(deviceCookie, cookieOpts)
      .clearCookie(sessionCookie, cookieOpts);
    return { ok: true };
  });

  registerParentRoutes(app, db, auth);
  registerLearnRoutes(app, db, auth);

  await app.register(mercurius, {
    schema:
      "type User { id: ID!, email: String, username: String, displayName: String, roles: [String!]!, accountStatus: String!, signInTypes: [String!]!, lastSignInType: String } type Query { me: User! }",
    resolvers: {
      Query: {
        me: async (_root, _args, context) => {
          const { actor } = await auth.resolveEffectiveIdentity(
            context.reply.request,
          );
          return publicUser(actor);
        },
      },
    },
    graphiql: false,
    queryDepth: 3,
    errorFormatter: () => ({
      statusCode: 400,
      response: {
        data: null,
        errors: [{ message: "Query unavailable or sign-in required." }],
      },
    }),
  });

  if (process.env.NODE_ENV === "production") {
    await app.register(staticFiles, { root: resolve("dist") });
  }
  return app;
}
