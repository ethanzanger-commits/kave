import { db } from "@/db";
import { profiles, swipes } from "@/schema";
import { and, eq, sql } from "drizzle-orm";
const c = async (q) => Number((await q)[0].c);
// Everyone gets 3 free coffee requests. After that, inviting UNLOCK_INVITES friends unlocks everything (0 turns the gate off).
export async function gate(me, email) {
  const need = Number(process.env.UNLOCK_INVITES ?? 3);
  const invited = await c(db.select({ c: sql`count(*)` }).from(profiles).where(eq(profiles.invitedBy, me)));
  const yes = await c(db.select({ c: sql`count(*)` }).from(swipes).where(and(eq(swipes.from, me), eq(swipes.yes, true))));
  const open = (email && email === process.env.ADMIN_EMAIL) || need === 0 || invited >= need;
  return { need, invited, yes, open, locked: !open && yes >= 3 };
}
