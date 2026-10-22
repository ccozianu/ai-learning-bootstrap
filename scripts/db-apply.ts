import { readFile } from "node:fs/promises";
import pg from "pg";
import { databaseConfig } from "../src/config.js";
// Run only by the human in a capsule terminal. No shell interpolation or secret-bearing argv.
let client: pg.Client | undefined;
if (!process.argv.includes("--confirm-initial-schema")) {
  console.error(
    "Review the initial SQL, then pass --confirm-initial-schema to apply it.",
  );
  process.exit(1);
}
try {
  client = new pg.Client(databaseConfig());
  await client.connect();
  await client.query("BEGIN");
  await client.query(
    await readFile("prisma/migrations/0001_initial/migration.sql", "utf8"),
  );
  await client.query("COMMIT");
  console.log("Initial schema applied.");
} catch {
  if (client) await client.query("ROLLBACK").catch(() => {});
  console.error(
    "Schema not applied. Check local settings, connectivity, permissions, and whether the schema already exists. Details suppressed to protect credentials.",
  );
  process.exitCode = 1;
} finally {
  await client?.end().catch(() => {});
}
