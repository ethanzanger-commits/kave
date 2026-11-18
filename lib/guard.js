import { db } from "@/db";
import { blocks } from "@/schema";
import { and, eq, or } from "drizzle-orm";
// True if either person has blocked or reported the other.
export async function blockedBetween(a, b) {
  if (!a || !b) return false;
  const r = await db.select().from(blocks).where(or(and(eq(blocks.from, a), eq(blocks.to, b)), and(eq(blocks.from, b), eq(blocks.to, a)))).limit(1);
  return r.length > 0;
}
