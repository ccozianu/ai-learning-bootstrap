import { spawnSync } from "node:child_process";
import { mkdirSync, renameSync, writeFileSync } from "node:fs";

const result = spawnSync(
  "node",
  [
    "node_modules/prisma/build/index.js",
    "migrate",
    "diff",
    "--from-schema",
    "prisma/snapshots/0001_initial.prisma",
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
  !result.stdout.includes('CREATE TABLE "ai_learning"."curriculum_series"') ||
  !result.stdout.includes('CREATE TABLE "ai_learning"."knowledge_nodes"')
) {
  console.error(
    "SQL migration diff failed. No database connection was attempted.",
  );
  if (result.stderr) console.error(result.stderr.trim());
  process.exit(1);
}

// Preserve existing Cut 1 active status if upgrading an existing 0001_initial database.
let sql =
  "-- Migration 0002_prototype over frozen 0001_initial. Run inside a transaction.\n" +
  result.stdout;

const dropAndAddPattern =
  'ALTER TABLE "ai_learning"."users" DROP COLUMN "active",\nADD COLUMN     "accountStatus" "ai_learning"."AccountStatus" NOT NULL DEFAULT \'ACTIVE\',';
if (sql.includes(dropAndAddPattern)) {
  sql = sql.replace(
    dropAndAddPattern,
    'ALTER TABLE "ai_learning"."users" ADD COLUMN "accountStatus" "ai_learning"."AccountStatus" NOT NULL DEFAULT \'ACTIVE\';\n' +
      'UPDATE "ai_learning"."users" SET "accountStatus" = CASE WHEN "active" THEN \'ACTIVE\'::"ai_learning"."AccountStatus" ELSE \'SUSPENDED\'::"ai_learning"."AccountStatus" END;\n' +
      'ALTER TABLE "ai_learning"."users" DROP COLUMN "active",',
  );
}

mkdirSync("prisma/migrations/0002_prototype", { recursive: true });
writeFileSync("prisma/migrations/0002_prototype/migration.sql.tmp", sql);
renameSync(
  "prisma/migrations/0002_prototype/migration.sql.tmp",
  "prisma/migrations/0002_prototype/migration.sql",
);
console.log(
  "SQL written to prisma/migrations/0002_prototype/migration.sql. No credentials used.",
);
