import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, renameSync } from "node:fs";
const result = spawnSync(
  "node",
  [
    "node_modules/prisma/build/index.js",
    "migrate",
    "diff",
    "--from-empty",
    "--to-schema",
    "prisma/schema.prisma",
    "--script",
  ],
  {
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      CHECKPOINT_DISABLE: "1",
    },
  },
);
if (
  result.status !== 0 ||
  !result.stdout.includes('CREATE TABLE "ai_learning"."users"') ||
  (result.stdout.match(/CREATE TABLE/g)?.length ?? 0) !== 4
) {
  console.error("SQL generation failed. No database connection was attempted.");
  process.exit(1);
}
mkdirSync("prisma/migrations/0001_initial", { recursive: true });
writeFileSync(
  "prisma/migrations/0001_initial/migration.sql.tmp",
  "-- Apply once to a fresh ai_learning schema. Run inside a transaction.\n" +
    result.stdout,
);
renameSync(
  "prisma/migrations/0001_initial/migration.sql.tmp",
  "prisma/migrations/0001_initial/migration.sql",
);
console.log(
  "SQL written to prisma/migrations/0001_initial/migration.sql. No credentials used.",
);
