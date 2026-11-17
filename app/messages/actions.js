"use server";
import { auth } from "@/auth";
import { client } from "@/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sendTemplate } from "@/lib/emails";
import { track } from "@/lib/track";
import { short } from "@/lib/leaders";
import { blockUser } from "../actions";
const base = () => process.env.APP_URL || "https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL;
const clean = (v) => String(v || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, 500);
const pair = (x, y) => (x < y ? [x, y] : [y, x]);
const blockedBetween = (x, y) => client`select 1 from block where ("fromId" = ${x} and "toId" = ${y}) or ("fromId" = ${y} and "toId" = ${x}) limit 1`;
async function me() { const s = await auth(); if (!s?.user?.id) redirect("/"); return s; }
// First message: anyone can send one. The other person has to accept before the chat opens.
export async function startThread(toId, fd) {
  const s = await me(), id = s.user.id;
  if (toId === id) redirect("/around");
  const text = clean(fd.get("text")); if (!text) redirect(`/messages/with/${toId}?e=empty`);
  const [rec] = await client`select u.id, u.name, u.email from "user" u join profile p on p."userId" = u.id where u.id = ${toId} and p."ageOk"`;
  if (!rec || (await blockedBetween(id, toId)).length) redirect("/around");
  const [a, b] = pair(id, toId);
  const [old] = await client`select id from dm_thread where a = ${a} and b = ${b}`;
  if (old) redirect(`/messages/${old.id}`);
  const [{ c }] = await client`select count(*)::int as c from dm_thread where initiator = ${id} and "at" > now() - interval '1 day'`;
  if (c >= 10) redirect(`/messages/with/${toId}?e=limit`);
  const [t] = await client`insert into dm_thread (a, b, initiator) values (${a}, ${b}, ${id}) on conflict (a, b) do nothing returning id`;
  if (!t) { const [again] = await client`select id from dm_thread where a = ${a} and b = ${b}`; redirect(`/messages/${again.id}`); }
  await client`insert into dm_message ("threadId", "senderId", body) values (${t.id}, ${id}, ${text})`;
  await track(id, "dm_request");
  try { await sendTemplate(rec.email, "dmRequest", { from: short(s.user.name, s.user.email), text: text.slice(0, 140), base: base(), link: `${base()}/messages/${t.id}` }); } catch {}
  redirect(`/messages/${t.id}`);
}
async function mine(tid, id) {
  const [t] = await client`select * from dm_thread where id = ${tid} and (a = ${id} or b = ${id})`;
  if (!t) return null;
  const other = t.a === id ? t.b : t.a;
  return (await blockedBetween(id, other)).length ? null : { ...t, other };
}
async function notifyAccepted(t, s) {
  try { const [o] = await client`select email from "user" where id = ${t.initiator}`; if (o?.email) await sendTemplate(o.email, "dmAccepted", { from: short(s.user.name, s.user.email), base: base(), link: `${base()}/messages/${t.id}` }); } catch {}
}
export async function sendDm(tid, fd) {
  const s = await me(), id = s.user.id, t = await mine(tid, id); if (!t) return;
  const text = clean(fd.get("text")); if (!text) return;
  if (t.status !== "accepted" && t.initiator === id) return; // one message until they accept
  const [{ c }] = await client`select count(*)::int as c from dm_message where "senderId" = ${id} and "at" > now() - interval '1 day'`;
  if (c >= 200) return;
  await client`insert into dm_message ("threadId", "senderId", body) values (${tid}, ${id}, ${text})`;
  if (t.status !== "accepted") { await client`update dm_thread set status = 'accepted', "lastAt" = now() where id = ${tid}`; await track(id, "dm_accepted"); await notifyAccepted(t, s); }
  else await client`update dm_thread set "lastAt" = now() where id = ${tid}`;
  revalidatePath(`/messages/${tid}`); revalidatePath("/messages");
}
export async function respondDm(tid, accept) {
  const s = await me(), id = s.user.id, t = await mine(tid, id);
  if (!t || t.initiator === id) redirect("/messages");
  await client`update dm_thread set status = ${accept ? "accepted" : "declined"} where id = ${tid}`;
  if (accept && t.status !== "accepted") { await track(id, "dm_accepted"); await notifyAccepted(t, s); }
  revalidatePath("/messages"); redirect(accept ? `/messages/${tid}` : "/messages");
}
export async function blockAndLeave(otherId) { await blockUser(otherId, "block"); redirect("/messages"); }
