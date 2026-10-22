import { defineConfig } from "prisma/config";
// Offline tooling only. Prisma 7.10.1 diff silently emits no SQL without datasource configuration.
// This inert URL is never a live connection; scripts/db-apply.ts reads POSTGRES_* locally.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: "postgresql://unused:unused@127.0.0.1:1/unused" },
});
