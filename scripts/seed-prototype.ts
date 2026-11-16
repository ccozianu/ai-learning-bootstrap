import { seedPrototypeCurriculum } from "../src/curriculum/seed.js";
import { database } from "../src/db.js";

const db = database();
try {
  const parentEmail = process.env.DEV_PARENT_EMAIL?.trim().toLowerCase();
  const forceReseed = process.argv.includes("--force");
  const res = await seedPrototypeCurriculum(db, parentEmail, forceReseed);
  const [nodes, deps, series, lessons, exercises, parents] = await Promise.all([
    db.knowledgeNode.count(),
    db.knowledgeDependency.count(),
    db.curriculumSeries.count(),
    db.lesson.count(),
    db.exercise.count(),
    db.user.count({ where: { roles: { has: "PARENT" } } }),
  ]);
  console.log(
    JSON.stringify({
      seeded: true,
      curriculumAction: res.curriculumAction,
      knowledgeNodes: nodes,
      knowledgeDependencies: deps,
      curriculumSeries: series,
      lessons,
      exercises,
      parents,
    }),
  );
} catch {
  console.error("Seed failed. Check database connectivity and schema.");
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
