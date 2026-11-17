import { readFile } from "node:fs/promises";
import pg from "pg";
import { databaseConfig } from "../src/config.js";

// Run only on explicit operator acceptance. No shell interpolation or secret-bearing argv.
const confirm =
  process.argv.includes("--confirm-prototype-schema") ||
  process.argv.includes("--confirm-initial-schema");
const reset = process.argv.includes("--reset-schema");

if (!confirm) {
  console.error(
    "Review the migration SQL, then pass --confirm-prototype-schema [--reset-schema] to apply it.",
  );
  process.exit(1);
}

let client: pg.Client | undefined;
try {
  client = new pg.Client(databaseConfig());
  await client.connect();
  await client.query("BEGIN");

  if (reset) {
    await client.query('DROP SCHEMA IF EXISTS "ai_learning" CASCADE;');
  }

  const tablesRes = await client.query<{ table_name: string }>(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'ai_learning'",
  );
  const existingTables = new Set(tablesRes.rows.map((r) => r.table_name));

  if (!existingTables.has("users")) {
    await client.query(
      await readFile("prisma/migrations/0001_initial/migration.sql", "utf8"),
    );
    await client.query(
      await readFile("prisma/migrations/0002_prototype/migration.sql", "utf8"),
    );
    console.log("Initial + prototype schemas applied cleanly.");
  } else if (!existingTables.has("curriculum_series")) {
    await client.query(
      await readFile("prisma/migrations/0002_prototype/migration.sql", "utf8"),
    );
    console.log(
      "Upgraded existing 0001_initial schema to 0002_prototype cleanly.",
    );
  } else {
    console.log("Prototype schema is already up to date.");
  }

  await client.query("COMMIT");
} catch {
  if (client) await client.query("ROLLBACK").catch(() => {});
  console.error(
    "Schema not applied. Check local settings, connectivity, and permissions. Details suppressed to protect credentials.",
  );
  process.exitCode = 1;
} finally {
  await client?.end().catch(() => {});
}
