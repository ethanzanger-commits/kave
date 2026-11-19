import { client } from "@/db";
import { sendLow } from "@/lib/mail";
import { fmt, nowIL } from "@/lib/fmt";
import { cheatEmail } from "@/lib/cheat";
import { copy } from "@/lib/emails";
import { short } from "@/lib/leaders";
// Reminders for SCHEDULED coffees only (confirmed by both). One email per person per reminder per time slot:
// the unique event key is claimed first, and released if sending fails so the next run retries. Safe to run hourly or daily, and after a reschedule (the time is part of the key).
async function claim(key, matchId, name) {
  try { return (await client`insert into event ("userId", name, "matchId", key) values ('system', ${name}, ${matchId}, ${key}) on conflict do nothing returning key`).length > 0; } catch { return false; }
}
const release = async (key) => { try { await client`delete from event where key = ${key}`; } catch {} };
export async function runReminders(base, now = nowIL()) {
  const today = now.slice(0, 10), tomorrow = new Date(Date.parse(today + "T12:00:00Z") + 864e5).toISOString().slice(0, 10), hour = Number(now.slice(11, 13)), out = { dayBefore: 0, morningOf: 0, failed: 0 };
  const rows = await client`select m.id, m."whenText" as w, m.place, m.a, m.b, ua.name as an, ua.email as ae, ub.name as bn, ub.email as be from match m join "user" ua on ua.id = m.a join "user" ub on ub.id = m.b
    where m.a not like 'demo-%' and m.b not like 'demo-%' and m.met is null and (m.status = 'confirmed' or m.status is null) and m."whenText" ~ '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}' and left(m."whenText", 10) in (${today}, ${tomorrow})`;
  for (const m of rows) {
    const w = m.w.slice(0, 16), people = [{ id: m.a, email: m.ae, name: m.an, other: short(m.bn, m.be), oid: m.b }, { id: m.b, email: m.be, name: m.bn, other: short(m.an, m.ae), oid: m.a }];
    if (w.slice(0, 10) === tomorrow && hour >= 7) for (const p of people) {
      const key = `rem_day:${m.id}:${p.id}:${w}`; if (!(await claim(key, m.id, "reminder_day"))) continue;
      if (await sendLow(p.email, ...copy("dayBefore", { other: p.other, when: fmt(m.w), place: m.place, base, link: `${base}/coffee/${m.id}` }))) out.dayBefore++; else { await release(key); out.failed++; }
    }
    if (w.slice(0, 10) === today && w > now && hour >= 6) {
      const ps = await client`select * from profile where "userId" = any(${[m.a, m.b]})`;
      for (const p of people) {
        const me = ps.find((x) => x.userId === p.id), o = ps.find((x) => x.userId === p.oid); if (!me || !o) continue;
        const key = `rem_morning:${m.id}:${p.id}:${w}`; if (!(await claim(key, m.id, "reminder_morning"))) continue;
        const [subj, intro] = copy("morningOf", { other: p.other });
        const cheat = cheatEmail({ ...me, neighborhood: me.neighborhood }, { ...o, headline: o.headline, company: o.company, about: o.about, workingOn: o.workingOn, canHelp: o.canHelp, lookingFor: o.lookingFor, skills: o.skills, industry: o.industry, neighborhood: o.neighborhood }, p.other, { id: m.id, when: m.w, place: m.place }, base);
        if (await sendLow(p.email, subj, intro + "\n\n" + cheat)) out.morningOf++; else { await release(key); out.failed++; }
      }
    }
  }
  return out;
}
