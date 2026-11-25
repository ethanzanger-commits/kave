// 250 Growth Campaign. Every number comes from real rows through complete_member / member_activity (never event counts).
// Days are Israel-time calendar days. Nothing is backfilled or guessed: missing data is returned as null so the page can say "Unavailable".
import { client } from "@/db";
import { missing } from "@/lib/complete";
export const TARGET = 250, DAYS = 30;
export const CHECKPOINTS = [[7, 151], [14, 184], [21, 217], [30, 250]];
export const MANUAL_STEP = 4; // reminder.step 1-3 belong to the hourly cron; 4 = one manual recovery reminder per member
const IL = "Asia/Jerusalem";
export const ymdOk = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || "")) && !Number.isNaN(Date.parse(s + "T12:00:00Z"));
export const todayIL = (now = new Date()) => now.toLocaleDateString("sv-SE", { timeZone: IL });
export const addDays = (ymd, n) => new Date(Date.parse(ymd + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);
export const diffDays = (a, b) => Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 864e5);

// Campaign progress. start === null means the admin has not set a start date: day counts are unavailable (null), not zero.
export function progress({ start, today, completed, target = TARGET, days = DAYS }) {
  const remaining = Math.max(0, target - completed), pct = target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 0;
  if (!start) return { remaining, pct, dayNo: null, daysLeft: null, perDay: null, over: false };
  const dayNo = diffDays(start, today) + 1, daysLeft = Math.max(0, days - dayNo + 1);
  return { remaining, pct, dayNo, daysLeft, over: dayNo > days, notStarted: dayNo < 1, perDay: remaining === 0 ? 0 : daysLeft > 0 ? Math.ceil((remaining / daysLeft) * 10) / 10 : null };
}

// Cumulative completed profiles at the end of campaign day n. `byDay` maps YYYY-MM-DD to completions that day.
// `undated` = completed profiles with no completedAt; they cannot be placed in time, so they are counted as already done before the campaign.
export function cumulativeAt({ byDay, undated = 0, start, n }) {
  const end = addDays(start, n - 1);
  let t = undated;
  for (const [d, c] of Object.entries(byDay)) if (d <= end) t += c;
  return t;
}
export function checkpointRows({ byDay, undated, start, today, target = CHECKPOINTS }) {
  if (!start) return target.map(([n, goal]) => ({ n, goal, actual: null, state: "unavailable", diff: null }));
  return target.map(([n, goal]) => {
    const end = addDays(start, n - 1), passed = today > end, reached = today >= end;
    const actual = reached || today >= start ? cumulativeAt({ byDay, undated, start, n: Math.min(n, diffDays(start, today) + 1) }) : null;
    return { n, goal, end, actual, diff: actual == null ? null : actual - goal, state: !passed ? "pending" : actual >= goal ? "met" : "missed" };
  });
}

// Channels. Sources are the slugs the app already stores in user.source. Unknown = no source recorded (not zero).
export const BUCKETS = [["direct", "Direct", ["direct"]], ["referral", "Referral", ["referral"]], ["invite-copy", "Invite copy", ["invite-copy"]], ["card-copy", "Card copy", ["card-copy"]], ["card-linkedin", "Card LinkedIn", ["card-linkedin"]], ["share-card", "Share card (WhatsApp)", ["card-whatsapp", "card-share"]]];
export const rate = (done, reg) => (reg > 0 ? Math.round((done / reg) * 1000) / 10 : null);
export function aggregateChannels(rows, hasStart) {
  const out = new Map(), add = (key, label, kind) => { if (!out.has(key)) out.set(key, { key, label, kind, registered: 0, completed: 0, cReg: 0, cDone: 0 }); return out.get(key); };
  for (const [k, label] of BUCKETS) add(k, label, "tracked");
  add("unknown", "Unknown (no source recorded)", "unknown");
  for (const r of rows) {
    const s = r.source ? String(r.source) : null, b = !s ? "unknown" : BUCKETS.find((x) => x[2].includes(s))?.[0];
    const e = b ? out.get(b) : add("other:" + s, s, "other");
    e.registered += r.registered; e.completed += r.completed; e.cReg += r.c_registered || 0; e.cDone += r.c_completed || 0;
  }
  return [...out.values()].map((e) => ({ ...e, rate: rate(e.completed, e.registered), cRate: hasStart ? rate(e.cDone, e.cReg) : null })).sort((a, b) => (a.kind === "other") - (b.kind === "other") || b.registered - a.registered);
}

export async function getConfig(q = client) {
  const m = Object.fromEntries((await q`select key, value from setting where key in ('campaign250_start')`).map((r) => [r.key, r.value]));
  return { start: ymdOk(m.campaign250_start) ? m.campaign250_start : null };
}
export const totals = async (q = client) => (await q`select
  (select count(*) from "user" where id not like 'demo-%')::int as registered,
  (select count(*) from complete_member)::int as completed,
  (select count(*) from complete_member where "completedAt" is null)::int as undated,
  (select count(*) from member_activity where first_ask is not null or first_match is not null)::int as activated`)[0];
export async function dayCounts(q = client) {
  const regs = await q`select ((u."createdAt" at time zone 'UTC') at time zone 'Asia/Jerusalem')::date::text as day, count(*)::int as n from "user" u where u.id not like 'demo-%' and u."createdAt" is not null group by 1`;
  const done = await q`select ((c."completedAt" at time zone 'UTC') at time zone 'Asia/Jerusalem')::date::text as day, count(*)::int as n from complete_member c where c."completedAt" is not null group by 1`;
  return { regs: Object.fromEntries(regs.map((r) => [r.day, r.n])), done: Object.fromEntries(done.map((r) => [r.day, r.n])) };
}
export function series({ regs, done, start, today, days = DAYS }) {
  if (!start) return null;
  const end = addDays(start, days - 1), last = today < end ? today : end, out = [];
  for (let d = start; d <= last; d = addDays(d, 1)) out.push({ day: d, regs: regs[d] || 0, completed: done[d] || 0 });
  return out;
}
export const weeksOf = (s) => (s || []).reduce((w, r, i) => { const k = Math.floor(i / 7); (w[k] ||= { week: k + 1, from: r.day, to: r.day, regs: 0, completed: 0 }); w[k].to = r.day; w[k].regs += r.regs; w[k].completed += r.completed; return w; }, []);
export async function channelRows(q = client, start = null) {
  const s = start || "2100-01-01";
  return q`select u.source, count(*)::int as registered, count(c.id)::int as completed,
    (count(*) filter (where ((u."createdAt" at time zone 'UTC') at time zone 'Asia/Jerusalem')::date >= ${s}::date))::int as c_registered,
    (count(c.id) filter (where ((c."completedAt" at time zone 'UTC') at time zone 'Asia/Jerusalem')::date >= ${s}::date))::int as c_completed
    from "user" u left join complete_member c on c.id = u.id where u.id not like 'demo-%' group by u.source`;
}
export async function sourceOptions(q = client) { return (await q`select distinct source from "user" where id not like 'demo-%' and source is not null order by 1`).map((r) => r.source); }

// Registered members without a finished profile. Private: admin pages only. last_activity is null when the member has no recorded request, message or tracked action (page visits are not recorded).
export async function incompleteMembers(q = client, { from = null, to = null, source = null, limit = 300 } = {}) {
  const f = ymdOk(from) ? from : null, t = ymdOk(to) ? to : null, s = source ? String(source).slice(0, 40) : null;
  const rows = await q`select u.id, u.name, u.email, u.source, u.image, u."createdAt" as signup, p."userId" as has_profile, p.headline, p.about, p.city, p.skills, p."ageOk",
      (select max(t) from (select max(s.at) as t from swipe s where s."fromId" = u.id union all select max(m.at) from message m where m."fromId" = u.id union all select max(e.at) from event e where e."userId" = u.id and e.name <> 'ref_visit') x) as last_activity,
      (select count(*) from reminder r where r."userId" = u.id and r.status = 'sent')::int as reminders,
      (select max(r."sentAt") from reminder r where r."userId" = u.id and r.status = 'sent') as last_reminder,
      exists (select 1 from reminder r where r."userId" = u.id and r.step = ${MANUAL_STEP}) as manual_sent,
      (u.email is not null and lower(u.email) in (select email from optout)) as opted_out
    from "user" u left join profile p on p."userId" = u.id
    where u.id not like 'demo-%' and u.id not in (select id from complete_member)
      and (${f}::text is null or ((u."createdAt" at time zone 'UTC') at time zone 'Asia/Jerusalem')::date >= ${f}::date)
      and (${t}::text is null or ((u."createdAt" at time zone 'UTC') at time zone 'Asia/Jerusalem')::date <= ${t}::date)
      and (${s}::text is null or (${s} = 'unknown' and u.source is null) or u.source = ${s})
    order by u."createdAt" desc limit ${limit}`;
  return rows.map((r) => ({ ...r, status: r.has_profile ? "Missing: " + (missing(r, r.image).join(", ") || "nothing (finalising)") : "Not started (no profile saved)" }));
}
export const recoveryStats = async (q = client) => (await q`select
  (select count(*) from reminder where status = 'sent')::int as sent,
  (select count(*) from reminder where status = 'sent' and step = ${MANUAL_STEP})::int as manual_sent,
  (select count(distinct r."userId") from reminder r join complete_member c on c.id = r."userId" where r.status = 'sent' and c."completedAt" > r."sentAt")::int as done_after`)[0];

export async function experimentList(q = client) {
  const list = await q`select id, name, channel, to_char("startsOn", 'YYYY-MM-DD') as starts, to_char("endsOn", 'YYYY-MM-DD') as ends, "targetRegistrations" as t_reg, "targetCompleted" as t_done, status from experiment order by at desc`;
  for (const e of list) {
    if (!e.channel) { e.actual = null; continue; }
    const [a] = await q`select count(*)::int as registered, count(c.id)::int as completed from "user" u left join complete_member c on c.id = u.id where u.id not like 'demo-%' and u.source = ${e.channel} and u."createdAt" >= coalesce(${e.starts}::date, '2000-01-01'::date) and u."createdAt" < coalesce(${e.ends}::date, '2100-01-01'::date) + 1`;
    e.actual = { ...a, rate: rate(a.completed, a.registered) };
  }
  return list;
}
