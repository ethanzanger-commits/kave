import { client } from "@/db";
import { sendTemplate } from "@/lib/emails";
import { fmt } from "@/lib/fmt";
import { short } from "@/lib/leaders";
// Gentle, once-only nudges. The unique event key (migration kave17) guarantees nobody is nudged twice for the same thing;
// if that migration is missing, no nudge is sent. System events are stored under the user "system" so they never count as member activity.
async function once(key, matchId, name) {
  try { const r = await client`insert into event ("userId", name, "matchId", key) values ('system', ${name}, ${matchId}, ${key}) on conflict do nothing returning key`; return r.length > 0; } catch { return false; }
}
const nowIL = () => new Date().toLocaleString("sv-SE", { timeZone: "Asia/Jerusalem" }).replace(" ", "T").slice(0, 16);
const back = (h) => new Date(Date.now() - h * 3600e3).toLocaleString("sv-SE", { timeZone: "Asia/Jerusalem" }).replace(" ", "T").slice(0, 16);
export async function runNudges(base, max = 40) {
  const out = { plan: 0, reply: 0, met: 0, skipped: 0 };
  const rows = await client`select m.id, m."whenText" as w, m.place, m.status, m.met, m.at, m."proposedBy" as by, m.a, m.b, ua.name as an, ua.email as ae, ub.name as bn, ub.email as be,
      (select max(e.at) from event e where e."matchId" = m.id and e.name in ('coffee_proposed', 'coffee_rescheduled')) as proposed_at
    from match m join "user" ua on ua.id = m.a join "user" ub on ub.id = m.b
    where m.a not like 'demo-%' and m.b not like 'demo-%' and m.met is null and m.at > now() - interval '30 days' order by m.at limit 400`;
  const both = async (m, tpl, vars) => { for (const [em, other] of [[m.ae, short(m.bn, m.be)], [m.be, short(m.an, m.ae)]]) await sendTemplate(em, tpl, { other, base, ...vars }); };
  const cutoff = back(3);
  for (const m of rows) {
    if (out.plan + out.reply + out.met >= max) break;
    const hrs = (Date.now() - new Date(m.at)) / 3600e3, iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(m.w || "");
    if (!m.w && !m.status && hrs >= 48) { if (await once("nudge_plan:" + m.id, m.id, "nudge_plan")) { await both(m, "nudgePlan", {}); out.plan++; } else out.skipped++; continue; }
    if (m.status === "proposed" && iso && m.w.slice(0, 16) > nowIL() && m.proposed_at && Date.now() - new Date(m.proposed_at) > 36 * 3600e3) {
      if (await once("nudge_reply:" + m.id + ":" + m.w, m.id, "nudge_reply")) {
        const toA = m.by === m.b, em = toA ? m.ae : m.be, other = short(toA ? m.bn : m.an, toA ? m.be : m.ae); // the person who did NOT propose
        await sendTemplate(em, "nudgeReply", { other, when: fmt(m.w), place: m.place, base }); out.reply++;
      } else out.skipped++;
      continue;
    }
    if (iso && (m.status === "confirmed" || (!m.status && m.w)) && m.w.slice(0, 16) < cutoff && hrs < 24 * 14) {
      if (await once("nudge_met:" + m.id, m.id, "nudge_met")) { let done = []; try { done = (await client`select "userId" from coffee_confirmation where "matchId" = ${m.id}`).map((r) => r.userId); } catch {} for (const [uid, em, other] of [[m.a, m.ae, short(m.bn, m.be)], [m.b, m.be, short(m.an, m.ae)]]) if (!done.includes(uid)) await sendTemplate(em, "nudgeMet", { other, base, link: `${base}/coffee/${m.id}` }); out.met++; } else out.skipped++;
    }
  }
  return out;
}
