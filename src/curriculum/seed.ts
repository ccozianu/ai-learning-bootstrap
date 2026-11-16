import { createHash } from "node:crypto";
import type { PrismaClient } from "../generated/prisma/client.js";
import { normalizeEmail } from "../security.js";
import { generatePracticeExercises } from "./generators.js";
import {
  CASTLE_A_QUIZ_ITEMS,
  CORE_VERBS,
  CURRICULUM_DATA,
  GROUP1_VERBS,
  KNOWLEDGE_DEPENDENCIES,
  KNOWLEDGE_NODES,
  ORDINAL_EXERCISES,
  PRONOUN_CHECKPOINT_EXERCISES,
  SERIES_DATA,
} from "./romanian-data.js";

function computeCurriculumHash(): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        curriculum: CURRICULUM_DATA,
        series: SERIES_DATA,
        nodes: KNOWLEDGE_NODES,
        dependencies: KNOWLEDGE_DEPENDENCIES,
        coreVerbs: CORE_VERBS,
        group1Verbs: GROUP1_VERBS,
        pronounCheckpoints: PRONOUN_CHECKPOINT_EXERCISES,
        castleQuiz: CASTLE_A_QUIZ_ITEMS,
        ordinals: ORDINAL_EXERCISES,
        starterPractice: [
          generatePracticeExercises("ro-verbs-ch1", 0, 12),
          generatePracticeExercises("ro-verbs-ch2", 0, 12),
          generatePracticeExercises("ro-numerals-ch1", 0, 12),
        ],
      }),
    )
    .digest("hex");
}

export async function seedPrototypeCurriculum(
  db: PrismaClient,
  devParentEmail?: string,
  forceReseed = false,
): Promise<{
  devParentUserId?: string;
  curriculumAction: "seeded" | "unchanged" | "skipped_immutable_conflict";
}> {
  const computedHash = computeCurriculumHash();

  return db.$transaction(
    async (tx) => {
      let curriculumAction:
        "seeded" | "unchanged" | "skipped_immutable_conflict" = "seeded";

      const existingVersion = await tx.curriculumVersion.findUnique({
        where: { id: CURRICULUM_DATA.version.id },
      });

      if (existingVersion && !forceReseed) {
        curriculumAction =
          existingVersion.contentHash === computedHash
            ? "unchanged"
            : "skipped_immutable_conflict";
      } else {
        // 1. Knowledge graph nodes & DAG edges
        for (const node of KNOWLEDGE_NODES) {
          await tx.knowledgeNode.upsert({
            where: { id: node.id },
            update: { title: node.title, description: node.description },
            create: {
              id: node.id,
              title: node.title,
              description: node.description,
            },
          });
        }
        for (const dep of KNOWLEDGE_DEPENDENCIES) {
          await tx.knowledgeDependency.upsert({
            where: {
              prerequisiteNodeId_dependentNodeId: {
                prerequisiteNodeId: dep.prerequisiteNodeId,
                dependentNodeId: dep.dependentNodeId,
              },
            },
            update: {},
            create: dep,
          });
        }

        // 2. Curriculum & immutable CurriculumVersion
        await tx.curriculum.upsert({
          where: { id: CURRICULUM_DATA.id },
          update: {
            title: CURRICULUM_DATA.title,
            description: CURRICULUM_DATA.description,
            sourceUrl: CURRICULUM_DATA.sourceUrl,
            license: CURRICULUM_DATA.license,
            attribution: CURRICULUM_DATA.attribution,
          },
          create: {
            id: CURRICULUM_DATA.id,
            title: CURRICULUM_DATA.title,
            description: CURRICULUM_DATA.description,
            language: CURRICULUM_DATA.language,
            ageBand: CURRICULUM_DATA.ageBand,
            sourceUrl: CURRICULUM_DATA.sourceUrl,
            license: CURRICULUM_DATA.license,
            attribution: CURRICULUM_DATA.attribution,
          },
        });

        await tx.curriculumVersion.upsert({
          where: { id: CURRICULUM_DATA.version.id },
          update: {
            title: CURRICULUM_DATA.version.title,
            contentHash: computedHash,
          },
          create: {
            id: CURRICULUM_DATA.version.id,
            curriculumId: CURRICULUM_DATA.id,
            version: CURRICULUM_DATA.version.version,
            title: CURRICULUM_DATA.version.title,
            contentHash: computedHash,
            status: "PUBLISHED",
          },
        });

        // 3. Ordered CurriculumSeries & Lessons
        for (const s of SERIES_DATA) {
          await tx.curriculumSeries.upsert({
            where: { id: s.id },
            update: {
              curriculumVersionId: CURRICULUM_DATA.version.id,
              orderIndex: s.orderIndex,
              slug: s.slug,
              title: s.title,
              subtitle: s.subtitle,
              description: s.description,
              knowledgeNodeId: s.knowledgeNodeId,
            },
            create: {
              id: s.id,
              curriculumVersionId: CURRICULUM_DATA.version.id,
              orderIndex: s.orderIndex,
              slug: s.slug,
              title: s.title,
              subtitle: s.subtitle,
              description: s.description,
              lessonPresenterKey: s.lessonPresenterKey,
              exercisePresenterKey: s.exercisePresenterKey,
              exerciseGeneratorKey: s.exerciseGeneratorKey,
              exerciseEvaluatorKey: s.exerciseEvaluatorKey,
              knowledgeNodeId: s.knowledgeNodeId,
            },
          });

          for (const lesson of s.lessons) {
            await tx.lesson.upsert({
              where: { id: lesson.id },
              update: {
                seriesId: s.id,
                orderIndex: lesson.orderIndex,
                slug: lesson.slug,
                title: lesson.title,
                kind: lesson.kind,
                knowledgeNodeId: lesson.knowledgeNodeId,
                contentJson: lesson.contentJson as object,
              },
              create: {
                id: lesson.id,
                seriesId: s.id,
                orderIndex: lesson.orderIndex,
                slug: lesson.slug,
                title: lesson.title,
                kind: lesson.kind,
                contentJson: lesson.contentJson as object,
                knowledgeNodeId: lesson.knowledgeNodeId,
              },
            });
          }
        }

        // 4. Canonical Exercises across all nodes (including root pronoun node!)
        for (const cp of PRONOUN_CHECKPOINT_EXERCISES) {
          await tx.exercise.upsert({
            where: { id: cp.id },
            update: {
              lessonId: "ro-v1-tenses",
              orderIndex: cp.orderIndex,
              promptEn: cp.promptEn,
              promptRoTemplate: cp.promptRoTemplate,
              knowledgeNodeId: "ro_pronouns_infinitive",
              metaJson: {
                options: cp.options,
                correct: cp.correct,
                explanation: cp.explanation,
              },
            },
            create: {
              id: cp.id,
              lessonId: "ro-v1-tenses",
              orderIndex: cp.orderIndex,
              exerciseType: "MULTIPLE_CHOICE",
              promptEn: cp.promptEn,
              promptRoTemplate: cp.promptRoTemplate,
              metaJson: {
                options: cp.options,
                correct: cp.correct,
                explanation: cp.explanation,
              },
              knowledgeNodeId: "ro_pronouns_infinitive",
              provenance: "HUMAN",
            },
          });
        }

        const expectedKingdomGroups = Object.fromEntries(
          CORE_VERBS.map((v) => [`a ${v.inf}`, v.group]),
        );
        await tx.exercise.upsert({
          where: { id: "ex-ch2-kingdom-sort" },
          update: {
            lessonId: "ro-v2-kingdoms",
            orderIndex: 1,
            knowledgeNodeId: "ro_verb_kingdoms_4",
            metaJson: {
              verbs: CORE_VERBS.map((v) => ({
                ro: `a ${v.inf}`,
                en: `to ${v.enInf}`,
              })),
              expectedGroups: expectedKingdomGroups,
            },
          },
          create: {
            id: "ex-ch2-kingdom-sort",
            lessonId: "ro-v2-kingdoms",
            orderIndex: 1,
            exerciseType: "CATEGORY_SORT",
            promptEn:
              "Sort all 16 core verbs into their correct Romanian Conjugation Kingdom (I: -a, II: -ea, III: -e, IV: -i/-î).",
            promptRoTemplate: "Kingdom Sorting Challenge (16 verbs)",
            metaJson: {
              verbs: CORE_VERBS.map((v) => ({
                ro: `a ${v.inf}`,
                en: `to ${v.enInf}`,
              })),
              expectedGroups: expectedKingdomGroups,
            },
            knowledgeNodeId: "ro_verb_kingdoms_4",
            provenance: "HUMAN",
          },
        });

        for (const item of CASTLE_A_QUIZ_ITEMS) {
          await tx.exercise.upsert({
            where: { id: item.id },
            update: {
              lessonId: "ro-v2-castle-a",
              orderIndex: item.orderIndex,
              promptEn: item.promptEn,
              promptRoTemplate: item.promptRoTemplate,
              knowledgeNodeId: "ro_verb_group1_a_family",
              metaJson: {
                options: item.options,
                correct: item.correct,
                explanation: item.explanation,
              },
            },
            create: {
              id: item.id,
              lessonId: "ro-v2-castle-a",
              orderIndex: item.orderIndex,
              exerciseType: "MULTIPLE_CHOICE",
              promptEn: item.promptEn,
              promptRoTemplate: item.promptRoTemplate,
              metaJson: {
                options: item.options,
                correct: item.correct,
                explanation: item.explanation,
              },
              knowledgeNodeId: "ro_verb_group1_a_family",
              provenance: "HUMAN",
            },
          });
        }

        for (const ord of ORDINAL_EXERCISES) {
          await tx.exercise.upsert({
            where: { id: ord.id },
            update: {
              lessonId: "ro-num-ordinals",
              orderIndex: ord.orderIndex,
              promptEn: ord.promptEn,
              promptRoTemplate: ord.promptRoTemplate,
              knowledgeNodeId: "ro_ordinal_numerals",
              metaJson: {
                options: ord.options,
                correct: ord.correct,
                explanation: ord.explanation,
              },
            },
            create: {
              id: ord.id,
              lessonId: "ro-num-ordinals",
              orderIndex: ord.orderIndex,
              exerciseType: "MULTIPLE_CHOICE",
              promptEn: ord.promptEn,
              promptRoTemplate: ord.promptRoTemplate,
              metaJson: {
                options: ord.options,
                correct: ord.correct,
                explanation: ord.explanation,
              },
              knowledgeNodeId: "ro_ordinal_numerals",
              provenance: "HUMAN",
            },
          });
        }

        const practiceBindings = [
          { seriesId: "ro-verbs-ch1", lessonId: "ro-v1-practice" },
          { seriesId: "ro-verbs-ch2", lessonId: "ro-v2-practice" },
          { seriesId: "ro-numerals-ch1", lessonId: "ro-num-practice" },
        ] as const;

        for (const binding of practiceBindings) {
          const items = generatePracticeExercises(binding.seriesId, 0, 12);
          for (const ex of items) {
            await tx.exercise.upsert({
              where: { id: ex.id },
              update: {
                lessonId: binding.lessonId,
                orderIndex: ex.orderIndex,
                promptEn: ex.promptEn,
                promptRoTemplate: ex.promptRoTemplate,
                knowledgeNodeId: ex.knowledgeNodeId,
                metaJson: {
                  roSegments: ex.roSegments,
                  blanksCount: ex.blanksCount,
                  acceptedBlanks: ex.acceptedBlanks,
                  hint: ex.hint,
                },
              },
              create: {
                id: ex.id,
                lessonId: binding.lessonId,
                orderIndex: ex.orderIndex,
                exerciseType: "FILL_IN_BLANKS",
                promptEn: ex.promptEn,
                promptRoTemplate: ex.promptRoTemplate,
                metaJson: {
                  roSegments: ex.roSegments,
                  blanksCount: ex.blanksCount,
                  acceptedBlanks: ex.acceptedBlanks,
                  hint: ex.hint,
                },
                knowledgeNodeId: ex.knowledgeNodeId,
                provenance: "PROCEDURAL_SPEC",
              },
            });
          }
        }
      }

      // 5. Dev bootstrap parent account when configured
      if (!devParentEmail) return { curriculumAction };
      const email = normalizeEmail(devParentEmail);
      const existing = await tx.user.findUnique({ where: { email } });
      if (existing) {
        const updated = existing.roles.includes("PARENT")
          ? existing
          : await tx.user.update({
              where: { id: existing.id },
              data: {
                roles: [...existing.roles.filter((r) => r !== "KID"), "PARENT"],
                accountStatus: "ACTIVE",
              },
            });
        return { devParentUserId: updated.id, curriculumAction };
      }

      const created = await tx.user.create({
        data: {
          email,
          displayName: "Parent Owner",
          roles: ["PARENT"],
          accountStatus: "ACTIVE",
          signInTypes: ["DEV_TOKEN"],
          lastSignInType: "DEV_TOKEN",
        },
      });
      return { devParentUserId: created.id, curriculumAction };
    },
    { timeout: 60_000, maxWait: 10_000 },
  );
}
