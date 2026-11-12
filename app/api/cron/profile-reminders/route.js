import { client } from "@/db";
import { sendMail } from "@/lib/mail";
import { reminderCfg } from "@/lib/settings";
import { sig } from "@/lib/unsub";
import { missing } from "@/lib/complete";
import { copy } from "@/lib/emails";
export const maxDuration = 60;
const isDone = async (id, image) => { const [p] = await client`select * from profile where "userId" = ${id}`; return missing(p, image).length === 0; };
export async function GET(req) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new Response("no", { status: 401 });
  const cfg = await reminderCfg(client);
  if (cfg.paused) return Response.json({ paused: true });
  const base = process.env.APP_URL || "https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const [{ n: taken }] = await client`select count(*)::int as n from profile where "foundingNo" is not null`;
  const hrs = { 1: cfg.h1, 2: cfg.h2, 3: cfg.h3 };
  const users = await client`select u.id, u.name, u.email, u.image, extract(epoch from (now() - u."createdAt")) / 3600 as age from "user" u where u.email is not null and u.id not like 'demo-%' and u."createdAt" > now() - interval '30 days' and u."createdAt" < now() - make_interval(hours => ${cfg.h1}) and lower(u.email) not in (select email from optout) order by u."createdAt" limit 200`;
  let sent = 0, failed = 0, skipped = 0;
  for (const u of users) {
    if (sent >= 100) break;
    if (await isDone(u.id, u.image)) continue;
    const done = new Set((await client`select step from reminder where "userId" = ${u.id}`).map((r) => r.step));
    const step = [1, 2, 3].find((n) => !done.has(n) && Number(u.age) >= hrs[n]);
    if (!step) continue;
    const claim = await client`insert into reminder ("userId", step, status) values (${u.id}, ${step}, 'queued') on conflict ("userId", step) do nothing returning id`;
    if (!claim[0]) continue;
    const rid = claim[0].id;
    if ((step === 2 && taken >= 50) || (await isDone(u.id, u.image))) { await client`update reminder set status = 'skipped' where id = ${rid}`; skipped++; continue; }
    const link = `${base}/api/r?id=${rid}`, foot = `\n\nUnsubscribe from these reminders: ${base}/unsubscribe?e=${encodeURIComponent(u.email)}&t=${sig(u.email)}`;
    const [subj, body] = copy("reminder" + step, { link });
    const ok = await sendMail(u.email, subj, body + foot);
    if (ok) { await client`update reminder set status = 'sent', "sentAt" = now() where id = ${rid}`; sent++; }
    else { await client`update reminder set status = 'failed', error = 'send failed' where id = ${rid}`; failed++; }
  }
  return Response.json({ sent, failed, skipped });
}
