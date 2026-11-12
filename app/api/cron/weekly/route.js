import { db } from "@/db";
import { profiles, users, swipes, blocks } from "@/schema";
import { eq } from "drizzle-orm";
import { score, why } from "@/lib/match";
import { sendMail } from "@/lib/mail";
import { track } from "@/lib/track";
import { short } from "@/lib/leaders";
import { client } from "@/db";
import { sig } from "@/lib/unsub";
import { sendTemplate } from "@/lib/emails";
export const maxDuration = 60;
export async function GET(req) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new Response("no", { status: 401 });
  const rows = await db.select({ p: profiles, u: users }).from(profiles).innerJoin(users, eq(users.id, profiles.userId)).where(eq(profiles.ageOk, true)).limit(500);
  const seen = {}, add = (a, b) => (seen[a] ??= new Set()).add(b);
  (await db.select().from(swipes)).forEach((s) => add(s.from, s.to));
  (await db.select().from(blocks)).forEach((b) => { add(b.from, b.to); add(b.to, b.from); });
  const out = new Set((await client`select email from optout`).map((r) => r.email));
  const base = process.env.APP_URL || "https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL; let sent = 0;
  for (const me of rows) {
    if (!me.u.email || me.p.isDemo || me.p.weekly === false || out.has(me.u.email.toLowerCase())) continue;
    const pick = rows.filter((x) => x.p.userId !== me.p.userId && !x.p.isDemo && !seen[me.p.userId]?.has(x.p.userId)).sort((a, b) => score(me.p, b.p) + (b.p.freeUntil > new Date() ? 3 : 0) - score(me.p, a.p) - (a.p.freeUntil > new Date() ? 3 : 0))[0];
    if (!pick) continue;
    await sendTemplate(me.u.email, "weekly", { first: (me.u.name || "").split(" ")[0], pick: short(pick.u.name, pick.u.email), headline: pick.p.headline, why: why(me.p, pick.p), base, unsub: `${base}/unsubscribe?e=${encodeURIComponent(me.u.email)}&t=${sig(me.u.email)}` }); await track(me.p.userId, "weekly_sent"); sent++;
  }
  return Response.json({ sent });
}
