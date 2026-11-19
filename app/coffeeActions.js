"use server";
import { auth } from "@/auth";
import { db, client } from "@/db";
import { matches, users } from "@/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hit } from "@/lib/limit";
import { logCoffee } from "@/lib/matchlog";
import { track } from "@/lib/track";
import { notify } from "@/lib/notify";
import { sendTemplate } from "@/lib/emails";
import { short } from "@/lib/leaders";
import { fmt, nowIL } from "@/lib/fmt";
import { coffeeState, resolveOutcome, validWhen, clash } from "@/lib/coffee";
import { swipe } from "@/app/actions";
const base = () => process.env.APP_URL || "https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL;
const t = (v, n = 200) => (v ? String(v).trim().slice(0, n) : "");
const bad = (id, e) => redirect(`/coffee/${id}?e=${e}`); // errors show as a plain message on the coffee page
const refresh = (id) => { revalidatePath("/matches"); revalidatePath(`/coffee/${id}`); revalidatePath("/discover"); };
async function mineOrThrow(id) {
  const s = await auth(); if (!s?.user?.id) redirect("/?next=" + encodeURIComponent(`/coffee/${id}`));
  const [m] = await db.select().from(matches).where(eq(matches.id, id));
  if (!m || (m.a !== s.user.id && m.b !== s.user.id)) redirect("/matches");
  const other = m.a === s.user.id ? m.b : m.a, [ou] = await db.select().from(users).where(eq(users.id, other));
  return { s, me: s.user.id, m, other, ou, mn: short(s.user.name, s.user.email) };
}
// Accept a coffee request, then go straight to picking a time.
export async function acceptRequest(from) {
  const s = await auth(); if (!s?.user?.id) redirect("/");
  await swipe(from, true);
  const [r] = await client`select id from match where (a = ${s.user.id} and b = ${from}) or (a = ${from} and b = ${s.user.id}) limit 1`;
  redirect(r ? `/coffee/${r.id}?new=1` : "/matches");
}
export async function schedule(fd) {
  const id = String(fd.get("id") || ""), { me, m, other, ou, mn } = await mineOrThrow(id);
  if (!(await hit("sched:" + me, 30, 3600)) || !(await hit("sched:m:" + id, 12, 86400))) bad(id, "slow");
  const when = t(fd.get("when"), 16), place = t(fd.get("place"), 80), st = coffeeState({ ...m, when: m.when });
  if (!["no_plan", "proposed", "scheduled"].includes(st)) bad(id, "closed");
  if (!validWhen(when) || place.length < 2) bad(id, "invalid");
  if (when <= nowIL()) bad(id, "past");
  if (Date.parse(when + ":00Z") - Date.now() > 120 * 864e5) bad(id, "far");
  if (m.when === when && m.place === place && ((m.status === "proposed" && m.proposedBy === me) || m.status === "confirmed")) bad(id, "same"); // double-click / duplicate
  if (await clash([me, other], when, id)) bad(id, "clash");
  const re = !!m.when; // had a plan already: this is a reschedule / counter-proposal
  await db.update(matches).set({ when, place, status: "proposed", proposedBy: me, reminded: false, cheatSent: false }).where(eq(matches.id, id));
  await logCoffee(me, id, re ? "coffee_rescheduled" : "coffee_proposed", { when, place, prevStatus: m.status || null });
  await sendTemplate(ou?.email, re ? "coffeeRescheduled" : "coffeeProposed", { from: mn, when: fmt(when), place, base: base(), link: `${base()}/coffee/${id}` });
  await notify(ou?.id, mn + (re ? " suggested a new time" : " suggested a coffee"), "Accept or change the plan.", `/coffee/${id}`);
  refresh(id);
}
export async function respond(fd) {
  const id = String(fd.get("id") || ""), act = fd.get("a"), { me, m, other, ou, s, mn } = await mineOrThrow(id), st = coffeeState(m);
  if (act === "accept") {
    if (st !== "proposed" || m.proposedBy === me) { refresh(id); return; } // already answered: no duplicate event or email
    if (await clash([me, other], m.when, id)) bad(id, "clash");
    const done = await client`update match set status = 'confirmed' where id = ${id} and status = 'proposed' returning id`;
    if (!done.length) { refresh(id); return; }
    await logCoffee(me, id, "coffee_confirmed", { when: m.when, place: m.place, proposedBy: m.proposedBy });
    await track(me, "booked"); await track(other, "booked");
    const v = { when: fmt(m.when), place: m.place, base: base(), link: `${base()}/coffee/${id}` };
    await sendTemplate(ou?.email, "coffeeConfirmed", { from: mn, ...v }); await sendTemplate(s.user.email, "coffeeConfirmed", { from: short(ou?.name, ou?.email), ...v });
    await notify(other, "Coffee confirmed", mn, `/coffee/${id}`);
  } else if (act === "cancel") {
    if (!["proposed", "scheduled"].includes(st)) { refresh(id); return; }
    const done = await client`update match set status = null, "whenText" = null, place = null, "proposedBy" = null where id = ${id} and "whenText" is not null and met is null returning id`;
    if (!done.length) { refresh(id); return; }
    await logCoffee(me, id, "coffee_cancelled", { prevStatus: m.status || null, when: m.when, place: m.place, proposedBy: m.proposedBy, by: me });
    await sendTemplate(ou?.email, "coffeeCancelled", { from: mn, base: base(), link: `${base()}/coffee/${id}` });
    await notify(other, "Coffee cancelled", mn, `/coffee/${id}`);
  }
  refresh(id);
}
// Each person answers separately. met flips only when the answers are in: both "yes" = completed; anything else once both answered = did not happen.
export async function confirmCoffee(fd) {
  const id = String(fd.get("id") || ""), { me, m, other, mn } = await mineOrThrow(id), outcome = fd.get("met") === "yes" ? "met" : "not_met";
  if (coffeeState(m) !== "awaiting_confirmation") { refresh(id); return; }
  const ins = await client`insert into coffee_confirmation ("matchId", "userId", outcome) values (${id}, ${me}, ${outcome}) on conflict do nothing returning outcome`;
  if (!ins.length) { refresh(id); return; } // already answered: first answer stands
  await logCoffee(me, id, "coffee_participant_confirmed", { outcome }, `pc:${id}:${me}`);
  const confs = await client`select "userId", outcome from coffee_confirmation where "matchId" = ${id}`;
  const res = resolveOutcome(confs, String(other).startsWith("demo-"));
  if (res === null) await notify(other, `${mn} answered about your coffee`, "Please tell us whether it happened.", `/coffee/${id}`);
  else {
    await client`update match set met = ${res} where id = ${id} and met is null`;
    if (res) { await logCoffee(me, id, "coffee_completed", { confirmedBy: "both" }, "completed:" + id); await track(me, "met"); await track(other, "met"); }
    else await logCoffee(me, id, "coffee_not_completed", {}, "notcompleted:" + id);
  }
  refresh(id);
}
// Private. Stored once per person, only ever read back by its author.
export async function saveFeedback(fd) {
  const id = String(fd.get("id") || ""), { me, m } = await mineOrThrow(id);
  const mine = (await client`select outcome from coffee_confirmation where "matchId" = ${id} and "userId" = ${me}`)[0];
  const legacy = m.met === true && !(await client`select 1 from coffee_confirmation where "matchId" = ${id} limit 1`).length;
  if (mine?.outcome !== "met" && !legacy) bad(id, "closed");
  const again = ["yes", "maybe", "no"].includes(fd.get("again")) ? fd.get("again") : null, r = parseInt(fd.get("rating"), 10), rating = r >= 1 && r <= 5 ? r : null, note = t(fd.get("note"), 500) || null;
  if (!again) bad(id, "invalid");
  const ins = await client`insert into coffee_feedback ("matchId", "userId", again, rating, note) values (${id}, ${me}, ${again}, ${rating}, ${note}) on conflict do nothing returning "matchId"`;
  if (ins.length) await logCoffee(me, id, "coffee_feedback_submitted", {}, `fb:${id}:${me}`); // no feedback content in events
  refresh(id);
}
