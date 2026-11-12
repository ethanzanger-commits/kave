import { db } from "@/db";
import { matches, users, profiles } from "@/schema";
import { eq, inArray } from "drizzle-orm";
import { sendMail } from "@/lib/mail";
import { fmt } from "@/lib/fmt";
import { cheatEmail } from "@/lib/cheat";
import { copy } from "@/lib/emails";
import { short } from "@/lib/leaders";
export const maxDuration = 60;
const day = (ms) => new Date(Date.now() + ms).toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
export async function GET(req) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new Response("no", { status: 401 });
  const base = process.env.APP_URL || "https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const ok = (m) => m.when && (m.status === "confirmed" || m.status == null);
  const all = (await db.select().from(matches)).filter(ok);
  let sent = 0;
  for (const m of all.filter((x) => x.when.startsWith(day(864e5)) && !x.reminded)) {
    const us = await db.select().from(users).where(inArray(users.id, [m.a, m.b]));
    for (const u of us) { await sendMail(u.email, ...copy("dayBefore", { other: short(us.find((x) => x.id !== u.id)?.name, us.find((x) => x.id !== u.id)?.email), when: fmt(m.when), place: m.place, base })); sent++; }
    await db.update(matches).set({ reminded: true }).where(eq(matches.id, m.id));
  }
  for (const m of all.filter((x) => x.when.startsWith(day(0)) && !x.cheatSent)) {
    const us = await db.select().from(users).where(inArray(users.id, [m.a, m.b]));
    const ps = await db.select().from(profiles).where(inArray(profiles.userId, [m.a, m.b]));
    for (const u of us) {
      const me = ps.find((p) => p.userId === u.id), o = ps.find((p) => p.userId !== u.id), ou = us.find((x) => x.id !== u.id);
      if (!me || !o) continue;
      { const nm = short(ou?.name, ou?.email); const [subj, intro] = copy("morningOf", { other: nm }); await sendMail(u.email, subj, intro + "\n\n" + cheatEmail(me, o, nm, m, base)); } sent++;
    }
    await db.update(matches).set({ cheatSent: true }).where(eq(matches.id, m.id));
  }
  return Response.json({ sent });
}
