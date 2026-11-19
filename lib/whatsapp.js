import { client } from "@/db";
// The ONLY module that reads member_phone / whatsapp_consent. A number is returned to a person only when BOTH have consented
// for that match, neither has blocked the other, and both have a number saved. No automatic messages are ever sent: we only build a wa.me link.
export const MSG = "Hey! We matched on Kave. Looking forward to connecting and arranging a coffee!";
// Returns digits only (country code first, no +) or null. 0501234567 -> 972501234567; +1 212... stays; 00 prefix = +.
export function normalizePhone(raw) {
  let s = String(raw || "").trim(); if (!s) return null;
  const plus = s.startsWith("+"); s = s.replace(/[^\d]/g, "");
  if (!plus && s.startsWith("00")) s = s.slice(2);
  else if (!plus && s.startsWith("0")) s = "972" + s.slice(1);
  return /^[1-9]\d{7,14}$/.test(s) ? s : null;
}
const safe = async (p, d) => { try { return await p; } catch { return d; } };
// Per-match state for the signed-in person. Never contains a number.
export async function waStates(me, matchIds) {
  if (!matchIds.length) return {};
  const rows = await safe(client`select "matchId", "userId", status from whatsapp_consent where "matchId" = any(${matchIds})`, null);
  if (rows === null) return null; // feature tables not installed yet: hide the feature
  const has = (await safe(client`select 1 from member_phone where "userId" = ${me}`, [])).length > 0, out = {};
  for (const id of matchIds) {
    const mine = rows.find((r) => r.matchId === id && r.userId === me)?.status || "none", theirs = rows.find((r) => r.matchId === id && r.userId !== me)?.status || "none";
    out[id] = { mine, theirs, hasPhone: has, mutual: mine === "shared" && theirs === "shared" };
  }
  return out;
}
// Records my consent. Returns 'requested' (I'm first), 'accepted' (the other already agreed: now mutual) or 'noop' (already shared).
export async function shareConsent(matchId, me, phoneRaw) {
  const [m] = await client`select a, b from match where id = ${matchId} and (a = ${me} or b = ${me})`; if (!m) return "closed";
  const other = m.a === me ? m.b : m.a;
  if ((await client`select 1 from block where ("fromId" = ${me} and "toId" = ${other}) or ("fromId" = ${other} and "toId" = ${me})`).length) return "closed";
  const have = (await client`select 1 from member_phone where "userId" = ${me}`).length > 0;
  if (phoneRaw) { const p = normalizePhone(phoneRaw); if (!p) return "invalid"; await client`insert into member_phone ("userId", phone) values (${me}, ${p}) on conflict ("userId") do update set phone = ${p}, "updatedAt" = now()`; }
  else if (!have) return "need_phone";
  const prev = (await client`select status from whatsapp_consent where "matchId" = ${matchId} and "userId" = ${me}`)[0]?.status;
  if (prev === "shared") return "noop";
  await client`insert into whatsapp_consent ("matchId", "userId", status) values (${matchId}, ${me}, 'shared') on conflict ("matchId", "userId") do update set status = 'shared', at = now()`;
  const theirs = (await client`select status from whatsapp_consent where "matchId" = ${matchId} and "userId" = ${other}`)[0]?.status;
  return theirs === "shared" ? "accepted" : "requested";
}
// Stop sharing for this match immediately. Optionally also delete my saved number.
export async function withdrawConsent(matchId, me, deleteNumber = false) {
  const r = await client`update whatsapp_consent set status = 'withdrawn', at = now() where "matchId" = ${matchId} and "userId" = ${me} and status = 'shared' returning "matchId"`;
  if (deleteNumber) await client`delete from member_phone where "userId" = ${me}`;
  return r.length > 0;
}
// The wa.me link, or null unless consent is mutual. The only place another person's number is read.
export async function waLink(me, matchId) {
  const [m] = await safe(client`select a, b from match where id = ${matchId} and (a = ${me} or b = ${me})`, []); if (!m) return null;
  const other = m.a === me ? m.b : m.a;
  const rows = await safe(client`select c."userId" from whatsapp_consent c where c."matchId" = ${matchId} and c.status = 'shared' and c."userId" in (${me}, ${other})
    and not exists (select 1 from block b where (b."fromId" = ${me} and b."toId" = ${other}) or (b."fromId" = ${other} and b."toId" = ${me}))`, []);
  if (rows.length < 2) return null;
  const [p] = await safe(client`select phone from member_phone where "userId" = ${other}`, []);
  return p?.phone ? `https://wa.me/${p.phone}?text=${encodeURIComponent(MSG)}` : null;
}
// Removes everything we hold for a person (used by delete-account).
export async function wipeWhatsApp(userId) {
  await safe(client`delete from whatsapp_consent where "userId" = ${userId}`); await safe(client`delete from member_phone where "userId" = ${userId}`);
}
