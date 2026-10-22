import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";
import { databaseConfig } from "./config.js";
export const database = () =>
  new PrismaClient({ adapter: new PrismaPg(databaseConfig()), log: [] });
