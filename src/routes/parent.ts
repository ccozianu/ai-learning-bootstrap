import { hash } from "argon2";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { type AuthContext, Denied } from "../auth-helpers.js";
import { computeKnowledgeGraph } from "../curriculum/evaluator.js";
import type { PrismaClient } from "../generated/prisma/client.js";

const createKidSchema = z
  .object({
    username: z.string().regex(/^[a-z0-9_]{3,32}$/),
    displayName: z.string().trim().min(1).max(60),
    birthYear: z.number().int(),
    password: z.string().min(12).max(128),
    gdprConsentGranted: z.boolean(),
  })
  .superRefine((val, ctx) => {
    const currentYear = new Date().getUTCFullYear();
    if (val.birthYear < currentYear - 18 || val.birthYear > currentYear - 4) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Birth year out of student age range.",
        path: ["birthYear"],
      });
    }
  });

const consentSchema = z.object({
  grant: z.boolean(),
});

const resetPasswordSchema = z.object({
  password: z.string().min(12).max(128),
});

const approvalSchema = z.object({
  kidId: z.string().uuid(),
  curriculumVersionId: z.string().min(1).max(120),
  approved: z.boolean(),
});

async function assertOwnKid(db: PrismaClient, parentId: string, kidId: string) {
  const kid = await db.user.findUnique({ where: { id: kidId } });
  if (!kid || !kid.roles.includes("KID") || kid.guardianUserId !== parentId) {
    throw new Denied(404, "Student account not found.");
  }
  return kid;
}

export function registerParentRoutes(
  app: FastifyInstance,
  db: PrismaClient,
  auth: AuthContext,
) {
  app.get("/api/parent/dashboard", async (req) => {
    const parent = await auth.requireRole(req, "PARENT");

    const [kids, approvals, curricula, nodes, dependencies] = await Promise.all(
      [
        db.user.findMany({
          where: { guardianUserId: parent.id, roles: { has: "KID" } },
          orderBy: { createdAt: "asc" },
          include: {
            knowledgeStates: true,
            _count: { select: { attempts: true } },
          },
        }),
        db.parentCurriculumApproval.findMany({
          where: { parentUserId: parent.id, revokedAt: null },
        }),
        db.curriculumVersion.findMany({
          where: { status: "PUBLISHED" },
          include: {
            curriculum: true,
            series: {
              orderBy: { orderIndex: "asc" },
              include: {
                lessons: {
                  orderBy: { orderIndex: "asc" },
                  select: {
                    id: true,
                    title: true,
                    kind: true,
                    knowledgeNodeId: true,
                  },
                },
              },
            },
          },
        }),
        db.knowledgeNode.findMany({ orderBy: { id: "asc" } }),
        db.knowledgeDependency.findMany(),
      ],
    );

    return {
      kids: kids.map((k) => ({
        id: k.id,
        username: k.username,
        displayName: k.displayName,
        birthYear: k.birthYear,
        accountStatus: k.accountStatus,
        gdprConsentGrantedAt: k.gdprConsentGrantedAt,
        gdprConsentWithdrawnAt: k.gdprConsentWithdrawnAt,
        attemptsTotal: k._count.attempts,
        approvedVersionIds: approvals
          .filter((a) => a.kidUserId === k.id)
          .map((a) => a.curriculumVersionId),
        mastery: computeKnowledgeGraph(nodes, dependencies, k.knowledgeStates),
      })),
      curricula: curricula.map((cv) => ({
        id: cv.id,
        version: cv.version,
        title: cv.title,
        curriculumTitle: cv.curriculum.title,
        description: cv.curriculum.description,
        license: cv.curriculum.license,
        attribution: cv.curriculum.attribution,
        series: cv.series,
      })),
    };
  });

  app.post("/api/parent/kids", async (req, reply) => {
    const parent = await auth.requireRole(req, "PARENT");
    const input = createKidSchema.parse(req.body);

    const passwordHash = await hash(input.password, {
      type: 2,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    const now = new Date();
    const kid = await db
      .$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            username: input.username,
            displayName: input.displayName,
            roles: ["KID"],
            accountStatus: input.gdprConsentGranted
              ? "ACTIVE"
              : "PENDING_PARENT_CONSENT",
            guardianUserId: parent.id,
            birthYear: input.birthYear,
            birthYearAttestedAt: now,
            gdprConsentGrantedAt: input.gdprConsentGranted ? now : null,
            gdprConsentVersion: input.gdprConsentGranted ? "v1.0-ro" : null,
            passwordHash,
            signInTypes: ["PASSWORD"],
          },
        });
        await tx.auditLog.create({
          data: {
            eventType: "KID_CREATED",
            actorUserId: parent.id,
            targetUserId: created.id,
            detail: input.gdprConsentGranted
              ? "Created kid account with immediate GDPR parental consent."
              : "Created kid account pending GDPR parental consent.",
          },
        });
        return created;
      })
      .catch((error: unknown) => {
        if (
          typeof error === "object" &&
          error &&
          "code" in error &&
          error.code === "P2002"
        ) {
          throw new Denied(409, "That student username is already taken.");
        }
        throw error;
      });

    return reply.code(201).send({
      id: kid.id,
      username: kid.username,
      displayName: kid.displayName,
      accountStatus: kid.accountStatus,
    });
  });

  app.post("/api/parent/kids/:kidId/consent", async (req) => {
    const parent = await auth.requireRole(req, "PARENT");
    const { kidId } = z.object({ kidId: z.string().uuid() }).parse(req.params);
    const input = consentSchema.parse(req.body);
    const kid = await assertOwnKid(db, parent.id, kidId);

    if (
      kid.accountStatus === "ANONYMIZED" ||
      kid.accountStatus === "SUSPENDED"
    ) {
      throw new Denied(
        403,
        "Suspended or anonymized accounts cannot be updated via parental consent.",
      );
    }
    if (!input.grant && kid.accountStatus === "PENDING_PARENT_CONSENT") {
      throw new Denied(400, "GDPR consent has not been granted yet.");
    }

    const now = new Date();
    await db.$transaction(async (tx) => {
      if (input.grant) {
        await tx.user.update({
          where: { id: kid.id },
          data: {
            accountStatus: "ACTIVE",
            gdprConsentGrantedAt: now,
            gdprConsentWithdrawnAt: null,
            gdprConsentVersion: "v1.0-ro",
          },
        });
      } else {
        await tx.user.update({
          where: { id: kid.id },
          data: {
            accountStatus: "CONSENT_WITHDRAWN",
            gdprConsentWithdrawnAt: now,
            authVersion: { increment: 1 },
          },
        });
        await tx.session.deleteMany({ where: { userId: kid.id } });
        await tx.trustedDevice.deleteMany({ where: { userId: kid.id } });
        await tx.challenge.deleteMany({ where: { userId: kid.id } });
      }
      await tx.auditLog.create({
        data: {
          eventType: input.grant
            ? "KID_CONSENT_GRANTED"
            : "KID_CONSENT_WITHDRAWN",
          actorUserId: parent.id,
          targetUserId: kid.id,
          detail: input.grant
            ? "Parent granted GDPR consent."
            : "Parent withdrew GDPR consent and revoked active sessions.",
        },
      });
    });

    return {
      ok: true,
      accountStatus: input.grant ? "ACTIVE" : "CONSENT_WITHDRAWN",
    };
  });

  app.post("/api/parent/kids/:kidId/reset-password", async (req) => {
    const parent = await auth.requireRole(req, "PARENT");
    const { kidId } = z.object({ kidId: z.string().uuid() }).parse(req.params);
    const input = resetPasswordSchema.parse(req.body);
    const kid = await assertOwnKid(db, parent.id, kidId);
    if (kid.accountStatus === "ANONYMIZED") {
      throw new Denied(400, "Anonymized student records cannot be modified.");
    }

    const passwordHash = await hash(input.password, {
      type: 2,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: kid.id },
        data: {
          passwordHash,
          authVersion: { increment: 1 },
          passwordFailures: 0,
          lockedUntil: null,
          signInTypes: ["PASSWORD"],
        },
      });
      await tx.session.deleteMany({ where: { userId: kid.id } });
      await tx.trustedDevice.deleteMany({ where: { userId: kid.id } });
      await tx.challenge.deleteMany({ where: { userId: kid.id } });
      await tx.auditLog.create({
        data: {
          eventType: "KID_PASSWORD_RESET",
          actorUserId: parent.id,
          targetUserId: kid.id,
          detail: "Parent reset kid passphrase and invalidated prior sessions.",
        },
      });
    });

    return { ok: true };
  });

  app.delete("/api/parent/kids/:kidId", async (req) => {
    const parent = await auth.requireRole(req, "PARENT");
    const { kidId } = z.object({ kidId: z.string().uuid() }).parse(req.params);
    const kid = await assertOwnKid(db, parent.id, kidId);

    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: kid.id },
        data: {
          username: null,
          displayName: null,
          passwordHash: null,
          birthYear: null,
          birthYearAttestedAt: null,
          guardianUserId: null,
          accountStatus: "ANONYMIZED",
          authVersion: { increment: 1 },
        },
      });
      await tx.session.deleteMany({ where: { userId: kid.id } });
      await tx.trustedDevice.deleteMany({ where: { userId: kid.id } });
      await tx.challenge.deleteMany({ where: { userId: kid.id } });
      await tx.exerciseAttempt.updateMany({
        where: { studentUserId: kid.id },
        data: { submittedAnswer: {} },
      });
      await tx.auditLog.create({
        data: {
          eventType: "KID_ERASED",
          actorUserId: parent.id,
          targetUserId: kid.id,
          detail:
            "GDPR kid erasure executed; PII cleared and attempts scrubbed.",
        },
      });
    });

    return { ok: true };
  });

  app.post("/api/parent/approvals", async (req) => {
    const parent = await auth.requireRole(req, "PARENT");
    const input = approvalSchema.parse(req.body);
    const kid = await assertOwnKid(db, parent.id, input.kidId);
    if (kid.accountStatus === "ANONYMIZED") {
      throw new Denied(400, "Cannot approve curriculum for erased account.");
    }

    const version = await db.curriculumVersion.findUnique({
      where: { id: input.curriculumVersionId },
    });
    if (!version || version.status !== "PUBLISHED") {
      throw new Denied(404, "Published curriculum version not found.");
    }

    await db.$transaction(async (tx) => {
      const updateData = input.approved
        ? {
            parentUserId: parent.id,
            approvedAt: new Date(),
            revokedAt: null,
          }
        : {
            parentUserId: parent.id,
            revokedAt: new Date(),
          };
      await tx.parentCurriculumApproval.upsert({
        where: {
          kidUserId_curriculumVersionId: {
            kidUserId: kid.id,
            curriculumVersionId: version.id,
          },
        },
        update: updateData,
        create: {
          parentUserId: parent.id,
          kidUserId: kid.id,
          curriculumVersionId: version.id,
          revokedAt: input.approved ? null : new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          eventType: input.approved
            ? "CURRICULUM_APPROVED"
            : "CURRICULUM_REVOKED",
          actorUserId: parent.id,
          targetUserId: kid.id,
          detail: `${input.approved ? "Approved" : "Revoked"} ${version.id}.`,
        },
      });
    });

    return { ok: true };
  });
}
