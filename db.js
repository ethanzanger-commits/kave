import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
const raw = (process.env.DATABASE_URL || "").trim().replace(/^psql\s+/, "").replace(/^['"]|['"]$/g, "");
const ok = /^postgres(ql)?:\/\//.test(raw);
if (!ok && process.env.NEXT_PHASE !== "phase-production-build") throw new Error("DATABASE_URL is missing or not a postgresql:// URL");
export const client = neon(ok ? raw : "postgres://build:build@localhost/build");
export const db = drizzle(client);
