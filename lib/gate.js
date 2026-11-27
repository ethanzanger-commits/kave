import { db } from "@/db";
import { profiles, swipes } from "@/schema";
import { and, eq, sql } from "drizzle-orm";
const c = async (q) => Number((await q)[0].c);
// Kave 2.0: discovery, names and coffee requests are never gated behind referrals. We keep the counts so invite prompts can show real progress.
export async function gate(me, email) {
  const need = Number(process.env.UNLOCK_INVITES ?? 3);
  const invited = await c(db.select({ c: sql`count(*)` }).from(profiles).where(and(eq(profiles.invitedBy, me), eq(profiles.ageOk, true))));
  const [mine] = await db.select().from(profiles).where(eq(profiles.userId, me));
  const free = mine?.invitedBy ? 6 : 3;
  const yes = await c(db.select({ c: sql`count(*)` }).from(swipes).where(and(eq(swipes.from, me), eq(swipes.yes, true))));
  const open = (email && email === process.env.ADMIN_EMAIL) || need === 0 || invited >= need;
  return { need, invited, yes, free, open: true, unlocked: open, locked: false };
}
