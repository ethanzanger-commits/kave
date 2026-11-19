import { client } from "@/db";
import { isPast, nowIL } from "@/lib/fmt";
// Coffee lifecycle. A coffee is "completed" ONLY when both people confirm it happened (coffee_confirmation); accepting or scheduling never counts.
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
export const validWhen = (w) => ISO.test(String(w || ""));
const ms = (w) => Date.parse(String(w).slice(0, 16) + ":00Z"); // wall-clock arithmetic only (both sides are Israel time)
export const GAP_MIN = 90;
export const STATE_LABEL = { no_plan: "No time yet", proposed: "Waiting for a reply", scheduled: "Scheduled", awaiting_confirmation: "Awaiting confirmation", completed: "Completed", did_not_happen: "Did not happen" };
// m: match row with .when/.status/.met. Returns one of the keys above.
export function coffeeState(m) {
  if (m.met === true) return "completed";
  if (m.met === false) return "did_not_happen";
  if (m.status === "proposed" && m.when) return "proposed";
  if (!m.when || (m.status && m.status !== "confirmed")) return "no_plan";
  return isPast(m.when) ? "awaiting_confirmation" : "scheduled";
}
// confs: [{userId, outcome}]. null = still waiting. Demo partners never answer, so one answer settles it.
export function resolveOutcome(confs, otherIsDemo = false) {
  if (otherIsDemo) return confs.length ? confs[0].outcome === "met" : null;
  return confs.length >= 2 ? confs.every((c) => c.outcome === "met") : null;
}
export const confsFor = async (matchIds) => {
  if (!matchIds.length) return [];
  try { return await client`select "matchId", "userId", outcome from coffee_confirmation where "matchId" = any(${matchIds})`; } catch { return []; }
};
// Does either person already have a live coffee within GAP_MIN of `when`? Returns the clashing match id or null.
export async function clash(userIds, when, exceptId) {
  if (!validWhen(when)) return null;
  const rows = await client`select id, "whenText" as w from match where (a = any(${userIds}) or b = any(${userIds})) and id <> ${exceptId} and met is null and "whenText" is not null and (status = 'proposed' or status = 'confirmed' or status is null)`;
  const t = ms(when);
  const hit = rows.find((r) => validWhen(String(r.w).slice(0, 16)) && !isPast(r.w) && Math.abs(ms(r.w) - t) < GAP_MIN * 60000);
  return hit ? hit.id : null;
}
// What needs this person to act (home screen + coffees page).
export async function pendingActions(me) {
  const now = nowIL(), safe = async (p) => { try { return await p; } catch { return []; } };
  const [req, prop, conf] = await Promise.all([
    safe(client`select s."fromId" as id, u.name, u.email from swipe s join "user" u on u.id = s."fromId" join profile p on p."userId" = s."fromId" where s."toId" = ${me} and s.yes and p."ageOk"
      and not exists (select 1 from swipe r where r."fromId" = ${me} and r."toId" = s."fromId")
      and not exists (select 1 from block b where (b."fromId" = ${me} and b."toId" = s."fromId") or (b."fromId" = s."fromId" and b."toId" = ${me})) limit 20`),
    safe(client`select m.id, m."whenText" as w, u.name, u.email from match m join "user" u on u.id = (case when m.a = ${me} then m.b else m.a end) where (m.a = ${me} or m.b = ${me}) and m.status = 'proposed' and m."proposedBy" <> ${me} and m."whenText" is not null and m.met is null limit 20`),
    safe(client`select m.id, m."whenText" as w, u.name, u.email from match m join "user" u on u.id = (case when m.a = ${me} then m.b else m.a end) where (m.a = ${me} or m.b = ${me}) and m.met is null and (m.status = 'confirmed' or m.status is null)
      and m."whenText" ~ '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}' and left(m."whenText", 16) < ${now} and not exists (select 1 from coffee_confirmation c where c."matchId" = m.id and c."userId" = ${me}) limit 20`),
  ]);
  return { req, prop, conf, count: req.length + prop.length + conf.length };
}
export async function pendingCount(me) {
  try { return (await pendingActions(me)).count; } catch { return 0; }
}
