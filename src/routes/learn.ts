import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { type AuthContext, Denied } from "../auth-helpers.js";
import {
  computeKnowledgeGraph,
  type EvaluationResult,
  evaluateCategorySort,
  evaluateFillInBlanks,
  evaluateMultipleChoice,
} from "../curriculum/evaluator.js";
import {
  type GeneratedExercise,
  generatePracticeExercises,
  getNumeralPhrase,
  resolveGeneratedExercise,
} from "../curriculum/generators.js";
import { CORE_VERBS, GROUP1_VERBS } from "../curriculum/romanian-data.js";
import type { PrismaClient } from "../generated/prisma/client.js";

const attemptSchema = z.object({
  clientEventId: z.string().uuid(),
  lessonId: z.string().min(1).max(120),
  exerciseId: z.string().min(1).max(160),
  answer: z.unknown(),
});

const practiceSchema = z.object({
  seedOffset: z.number().int().min(0).max(10000).default(0),
});

const blanksAnswerSchema = z.array(z.string().max(64)).max(24);
const mcqAnswerSchema = z.string().max(120);
const categorySortSchema = z
  .record(z.string().max(64), z.number().int().min(1).max(4))
  .refine((r) => Object.keys(r).length <= 32, {
    message: "Too many sorted entries.",
  });

function sanitizeExerciseForClient(ex: {
  id: string;
  orderIndex: number;
  exerciseType: string;
  promptEn: string;
  promptRoTemplate: string;
  knowledgeNodeId: string;
  metaJson: unknown;
}) {
  const meta = (ex.metaJson ?? {}) as Record<string, unknown>;
  if (ex.exerciseType === "FILL_IN_BLANKS") {
    return {
      id: ex.id,
      orderIndex: ex.orderIndex,
      exerciseType: ex.exerciseType,
      promptEn: ex.promptEn,
      promptRoTemplate: ex.promptRoTemplate,
      knowledgeNodeId: ex.knowledgeNodeId,
      roSegments: meta.roSegments ?? [],
      blanksCount: meta.blanksCount ?? 1,
      hint: meta.hint ?? "",
    };
  }
  if (ex.exerciseType === "MULTIPLE_CHOICE") {
    return {
      id: ex.id,
      orderIndex: ex.orderIndex,
      exerciseType: ex.exerciseType,
      promptEn: ex.promptEn,
      promptRoTemplate: ex.promptRoTemplate,
      knowledgeNodeId: ex.knowledgeNodeId,
      options: meta.options ?? [],
    };
  }
  if (ex.exerciseType === "CATEGORY_SORT") {
    return {
      id: ex.id,
      orderIndex: ex.orderIndex,
      exerciseType: ex.exerciseType,
      promptEn: ex.promptEn,
      promptRoTemplate: ex.promptRoTemplate,
      knowledgeNodeId: ex.knowledgeNodeId,
      verbs: meta.verbs ?? [],
    };
  }
  return {
    id: ex.id,
    orderIndex: ex.orderIndex,
    exerciseType: ex.exerciseType,
    promptEn: ex.promptEn,
    promptRoTemplate: ex.promptRoTemplate,
    knowledgeNodeId: ex.knowledgeNodeId,
  };
}

function sanitizeGeneratedForClient(ex: GeneratedExercise) {
  return {
    id: ex.id,
    orderIndex: ex.orderIndex,
    exerciseType: ex.exerciseType,
    promptEn: ex.promptEn,
    promptRoTemplate: ex.promptRoTemplate,
    knowledgeNodeId: ex.knowledgeNodeId,
    roSegments: ex.roSegments,
    blanksCount: ex.blanksCount,
    hint: ex.hint,
  };
}

async function assertStudentCurriculumApproved(
  db: PrismaClient,
  kidId: string,
  curriculumVersionId: string,
) {
  const approval = await db.parentCurriculumApproval.findUnique({
    where: {
      kidUserId_curriculumVersionId: {
        kidUserId: kidId,
        curriculumVersionId,
      },
    },
  });
  if (!approval || approval.revokedAt) {
    throw new Denied(
      403,
      "Your parent needs to approve this curriculum before you can open it.",
    );
  }
}

function masteryThreshold(exerciseType: string): number {
  return exerciseType === "CATEGORY_SORT" ? 1 : 3;
}

export function registerLearnRoutes(
  app: FastifyInstance,
  db: PrismaClient,
  auth: AuthContext,
) {
  app.get("/api/learn/overview", async (req) => {
    const kid = await auth.requireRole(req, "KID");
    const [approvals, nodes, dependencies, states, recentAttempts] =
      await Promise.all([
        db.parentCurriculumApproval.findMany({
          where: { kidUserId: kid.id, revokedAt: null },
          include: {
            curriculumVersion: {
              include: {
                curriculum: true,
                series: {
                  orderBy: { orderIndex: "asc" },
                  include: {
                    lessons: {
                      orderBy: { orderIndex: "asc" },
                      select: {
                        id: true,
                        orderIndex: true,
                        slug: true,
                        title: true,
                        kind: true,
                        knowledgeNodeId: true,
                      },
                    },
                  },
                },
              },
            },
          },
        }),
        db.knowledgeNode.findMany({ orderBy: { id: "asc" } }),
        db.knowledgeDependency.findMany(),
        db.studentKnowledgeState.findMany({ where: { studentUserId: kid.id } }),
        db.exerciseAttempt.findMany({
          where: { studentUserId: kid.id, isCorrect: true },
          select: { lessonId: true, exerciseId: true },
        }),
      ]);

    const solvedByLesson = new Map<string, Set<string>>();
    for (const att of recentAttempts) {
      if (!solvedByLesson.has(att.lessonId)) {
        solvedByLesson.set(att.lessonId, new Set());
      }
      solvedByLesson.get(att.lessonId)!.add(att.exerciseId);
    }

    return {
      knowledgeGraph: computeKnowledgeGraph(nodes, dependencies, states),
      curricula: approvals.map((a) => ({
        versionId: a.curriculumVersion.id,
        title: a.curriculumVersion.title,
        description: a.curriculumVersion.curriculum.description,
        attribution: a.curriculumVersion.curriculum.attribution,
        license: a.curriculumVersion.curriculum.license,
        series: a.curriculumVersion.series.map((s) => ({
          ...s,
          lessons: s.lessons.map((l) => ({
            ...l,
            solvedCount: solvedByLesson.get(l.id)?.size ?? 0,
          })),
        })),
      })),
    };
  });

  app.get("/api/learn/lessons/:lessonId", async (req) => {
    const kid = await auth.requireRole(req, "KID");
    const { lessonId } = z
      .object({ lessonId: z.string().min(1).max(120) })
      .parse(req.params);

    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
      include: {
        series: true,
        exercises: { orderBy: { orderIndex: "asc" } },
      },
    });
    if (!lesson) throw new Denied(404, "Lesson not found.");

    await assertStudentCurriculumApproved(
      db,
      kid.id,
      lesson.series.curriculumVersionId,
    );

    const content = (lesson.contentJson ?? {}) as Record<string, unknown>;
    const deckKey = content.showVerbDeck;
    const verbDeck =
      deckKey === "CORE_16"
        ? CORE_VERBS
        : deckKey === "GROUP_1"
          ? GROUP1_VERBS
          : undefined;

    return {
      id: lesson.id,
      seriesId: lesson.seriesId,
      seriesTitle: lesson.series.title,
      title: lesson.title,
      kind: lesson.kind,
      knowledgeNodeId: lesson.knowledgeNodeId,
      contentJson: lesson.contentJson,
      verbDeck,
      exercises: lesson.exercises.map(sanitizeExerciseForClient),
    };
  });

  app.post("/api/learn/lessons/:lessonId/practice", async (req) => {
    const kid = await auth.requireRole(req, "KID");
    const { lessonId } = z
      .object({ lessonId: z.string().min(1).max(120) })
      .parse(req.params);
    const { seedOffset } = practiceSchema.parse(req.body ?? {});

    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
      include: { series: true },
    });
    if (!lesson || lesson.kind !== "PRACTICE_SHEET") {
      throw new Denied(404, "Practice sheet not found.");
    }
    await assertStudentCurriculumApproved(
      db,
      kid.id,
      lesson.series.curriculumVersionId,
    );

    const generated = generatePracticeExercises(
      lesson.seriesId,
      seedOffset,
      12,
    );
    return {
      seedOffset,
      exercises: generated.map(sanitizeGeneratedForClient),
    };
  });

  app.get("/api/learn/numerals/preview", async (req) => {
    await auth.requireRole(req, "KID");
    const query = z
      .object({
        n: z.coerce.number().int().min(0).max(50_000_000),
        gender: z
          .enum(["masculine", "feminine", "neuter"])
          .default("masculine"),
      })
      .parse(req.query);

    return getNumeralPhrase(query.n, query.gender);
  });

  app.post("/api/learn/attempts", async (req) => {
    const kid = await auth.requireRole(req, "KID");
    const input = attemptSchema.parse(req.body);

    const lesson = await db.lesson.findUnique({
      where: { id: input.lessonId },
      include: { series: true },
    });
    if (!lesson) throw new Denied(404, "Lesson not found.");
    await assertStudentCurriculumApproved(
      db,
      kid.id,
      lesson.series.curriculumVersionId,
    );

    // Resolve and evaluate deterministically before opening the atomic transaction.
    let exerciseType = "";
    let knowledgeNodeId = lesson.knowledgeNodeId;
    let evalForAnswer: (rawAnswer: unknown) => EvaluationResult;

    const generated = resolveGeneratedExercise(input.exerciseId);
    if (generated) {
      if (
        lesson.kind !== "PRACTICE_SHEET" ||
        !input.exerciseId.startsWith(`gen:${lesson.seriesId}:`)
      ) {
        throw new Denied(
          400,
          "Exercise does not belong to this practice sheet.",
        );
      }
      exerciseType = generated.exerciseType;
      knowledgeNodeId = generated.knowledgeNodeId;
      evalForAnswer = (raw) =>
        evaluateFillInBlanks(
          generated.acceptedBlanks,
          blanksAnswerSchema.parse(raw),
        );
    } else {
      const dbExercise = await db.exercise.findUnique({
        where: { id: input.exerciseId },
      });
      if (!dbExercise || dbExercise.lessonId !== lesson.id) {
        throw new Denied(404, "Exercise not found.");
      }
      exerciseType = dbExercise.exerciseType;
      knowledgeNodeId = dbExercise.knowledgeNodeId;
      const meta = (dbExercise.metaJson ?? {}) as Record<string, unknown>;
      if (exerciseType === "FILL_IN_BLANKS") {
        const expected = blanksAnswerSchema.parse(meta.acceptedBlanks);
        evalForAnswer = (raw) =>
          evaluateFillInBlanks(expected, blanksAnswerSchema.parse(raw));
      } else if (exerciseType === "MULTIPLE_CHOICE") {
        const expected = mcqAnswerSchema.parse(meta.correct);
        const explanation =
          typeof meta.explanation === "string" ? meta.explanation : undefined;
        evalForAnswer = (raw) =>
          evaluateMultipleChoice(
            expected,
            mcqAnswerSchema.parse(raw),
            explanation,
          );
      } else if (exerciseType === "CATEGORY_SORT") {
        const expected = categorySortSchema.parse(meta.expectedGroups);
        evalForAnswer = (raw) =>
          evaluateCategorySort(expected, categorySortSchema.parse(raw));
      } else {
        throw new Denied(400, "Unsupported exercise type.");
      }
    }

    const finalEval = evalForAnswer(input.answer);
    const threshold = masteryThreshold(exerciseType);

    const buildReplay = async () => {
      const existing = await db.exerciseAttempt.findUnique({
        where: { clientEventId: input.clientEventId },
      });
      if (
        !existing ||
        existing.studentUserId !== kid.id ||
        existing.exerciseId !== input.exerciseId ||
        existing.lessonId !== input.lessonId
      ) {
        throw new Denied();
      }
      const state = await db.studentKnowledgeState.findUnique({
        where: {
          studentUserId_knowledgeNodeId: {
            studentUserId: kid.id,
            knowledgeNodeId: existing.knowledgeNodeId,
          },
        },
      });
      let slotResults: boolean[] | undefined;
      try {
        slotResults = evalForAnswer(existing.submittedAnswer).slotResults;
      } catch {
        slotResults = undefined;
      }
      return {
        idempotentReplay: true,
        isCorrect: existing.isCorrect,
        feedback: existing.feedback,
        slotResults,
        nodeState: state,
      };
    };

    try {
      const updatedState = await db.$transaction(async (tx) => {
        await tx.exerciseAttempt.create({
          data: {
            clientEventId: input.clientEventId,
            studentUserId: kid.id,
            exerciseId: input.exerciseId,
            lessonId: lesson.id,
            knowledgeNodeId,
            submittedAnswer: input.answer as object,
            isCorrect: finalEval.isCorrect,
            feedback: finalEval.feedback,
          },
        });

        // Anti-gaming: only distinct solved exerciseIds count toward mastery threshold.
        const distinctCorrect = await tx.exerciseAttempt.findMany({
          where: {
            studentUserId: kid.id,
            knowledgeNodeId,
            isCorrect: true,
          },
          distinct: ["exerciseId"],
          select: { exerciseId: true },
        });
        const uniqueSolvedCount = distinctCorrect.length;
        const currentState = await tx.studentKnowledgeState.findUnique({
          where: {
            studentUserId_knowledgeNodeId: {
              studentUserId: kid.id,
              knowledgeNodeId,
            },
          },
        });
        const nextMastered =
          Boolean(currentState?.mastered) || uniqueSolvedCount >= threshold;

        return tx.studentKnowledgeState.upsert({
          where: {
            studentUserId_knowledgeNodeId: {
              studentUserId: kid.id,
              knowledgeNodeId,
            },
          },
          update: {
            attemptsCount: { increment: 1 },
            correctCount: uniqueSolvedCount,
            mastered: nextMastered,
            masteredAt:
              currentState?.masteredAt ?? (nextMastered ? new Date() : null),
          },
          create: {
            studentUserId: kid.id,
            knowledgeNodeId,
            attemptsCount: 1,
            correctCount: uniqueSolvedCount,
            mastered: nextMastered,
            masteredAt: nextMastered ? new Date() : null,
          },
        });
      });

      return {
        idempotentReplay: false,
        isCorrect: finalEval.isCorrect,
        feedback: finalEval.feedback,
        slotResults: finalEval.slotResults,
        nodeState: updatedState,
      };
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error &&
        "code" in error &&
        error.code === "P2002"
      ) {
        return buildReplay();
      }
      throw error;
    }
  });
}
