"use server";
import { auth, signOut } from "@/auth";
import { cleanLinkedIn } from "@/lib/linkedin";
import { notifyReferrer, notify as addNotice } from "@/lib/notify";
import { redirect } from "next/navigation";
import { hit } from "@/lib/limit";
import { blockedBetween } from "@/lib/guard";
import { db, client } from "@/db";
import { awardFounding } from "@/lib/founding";
import { AV_KEYS } from "@/lib/avail";
import { CITIES } from "@/lib/cities";
import { logCoffee } from "@/lib/matchlog";
import { profiles, accounts, users, swipes, matches, blocks, thanks, events, messages, intros } from "@/schema";
import { cookies } from "next/headers";
import { fmt } from "@/lib/fmt";
import { wipeWhatsApp } from "@/lib/whatsapp";
import { short } from "@/lib/leaders";
import { track } from "@/lib/track";
import { sendMail } from "@/lib/mail";
import { sendTemplate } from "@/lib/emails";
import { notify } from "@/lib/push";
import { toggleSaved, joinCircle, savePushSub } from "@/lib/social";
import { gate } from "@/lib/gate";
import { and, eq, or, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
const li = cleanLinkedIn;
const t = (v, n = 200) => (v ? String(v).slice(0, n) : null);
// Input hygiene for list fields that arrive from the browser: right type, bounded size.
const strs = (a, max, len) => (Array.isArray(a) ? a : []).map((x) => String(x ?? "").trim().slice(0, len)).filter(Boolean).slice(0, max);
const objs = (a, max) => (Array.isArray(a) ? a : []).slice(0, max).filter((x) => x && typeof x === "object" && !Array.isArray(x)).map((x) => Object.fromEntries(Object.entries(x).slice(0, 12).map(([k, v]) => [String(k).slice(0, 40), typeof v === "number" || typeof v === "boolean" ? v : v == null ? null : String(v).slice(0, 400)])));
export async function saveProfile(d) {
  const s = await auth(); if (!s) throw new Error("Sign in first");
  d = d && typeof d === "object" ? d : {};
  if (!d.ageOk) throw new Error("Confirm you are 18 or older");
  const [pu] = await db.select().from(users).where(eq(users.id, s.user.id));
  if (!pu?.image) throw new Error("Add a profile photo");
  if (!/\S+\s+\S+/.test(d.name || "")) throw new Error("Add your first and last name");
  await db.update(users).set({ name: t(d.name, 80) }).where(eq(users.id, s.user.id));
  if (!t(d.about) || !t(d.headline) || !CITIES.includes(d.city) || !strs(d.skills, 50, 60).length) throw new Error("Complete your profile");
  await track(s.user.id, "profile_saved");
  const v = { ageOk: true, about: t(d.about, 600), lookingFor: t(d.lookingFor, 160), workingOn: t(d.workingOn, 200), showOnHome: !!d.showOnHome, canHelp: t(d.canHelp, 160), weekly: d.weekly !== false, availability: strs(d.availability, 20, 30).filter((x) => AV_KEYS.includes(x)), city: CITIES.includes(d.city) ? d.city : null, headline: t(d.headline), company: t(d.company), industry: t(d.industry), neighborhood: CITIES.includes(d.city) ? d.city : null,
    linkedinUrl: li(d.linkedinUrl), skills: strs(d.skills, 50, 60), experience: objs(d.experience, 30),
    education: objs(d.education, 10), updatedAt: new Date() };
  const ref = (await cookies()).get("ref")?.value; let invitedBy = null;
  if (ref) { const [o] = await db.select({ u: profiles.userId }).from(profiles).where(eq(profiles.refCode, ref)); if (o && o.u !== s.user.id) invitedBy = o.u; }
  const [sa] = await client`select "referrerId" from signup_attr where "userId" = ${s.user.id}`.catch(() => []);
  if (sa?.referrerId && sa.referrerId !== s.user.id) invitedBy = sa.referrerId;
  if (!invitedBy) { const [ru0] = await client`select "referredBy" from "user" where id = ${s.user.id}`; if (ru0?.referredBy && ru0.referredBy !== s.user.id) invitedBy = ru0.referredBy; }
  const [prev] = await db.select().from(profiles).where(eq(profiles.userId, s.user.id));
  const first = !prev?.ageOk;
  const vv = first ? { ...v, completedAt: new Date() } : v;
  await db.insert(profiles).values({ userId: s.user.id, ...vv, refCode: Math.random().toString(36).slice(2, 8), invitedBy }).onConflictDoUpdate({ target: profiles.userId, set: vv });
  const fn = await awardFounding(client, s.user.id);
  const cs = (await cookies()).get("circle")?.value;
  if (cs && /^[a-z0-9-]{1,40}$/.test(cs)) await joinCircle(client, cs, s.user.id);
  if (first) {
    await track(s.user.id, "profile_completed");
    await sendTemplate(s.user.email, "welcome", { name: s.user.name, founding: fn, base: base() });
    if (invitedBy) { try { await notifyReferrer(invitedBy, t(d.name, 80), base()); } catch {} }
  }
  try { await client`delete from profile_draft where "userId" = ${s.user.id}`; } catch {}
  revalidatePath("/profile");
  return { first, founding: fn };
}
const DRAFT_TEXT = ["name", "headline", "company", "industry", "city", "about", "lookingFor", "canHelp", "workingOn", "linkedinUrl", "neighborhood"];
// Saves a half-finished profile to the account, so signing in on another device or browser never loses it.
export async function saveDraft(d) {
  const s = await auth(); if (!s?.user?.id) return;
  const o = {}; for (const k of DRAFT_TEXT) if (d?.[k]) o[k] = String(d[k]).slice(0, 700);
  o.skills = (d?.skills || []).slice(0, 50).map((x) => String(x).slice(0, 40)); o.availability = (d?.availability || []).slice(0, 20).map((x) => String(x).slice(0, 30));
  if (!Object.values(o).some((v) => (Array.isArray(v) ? v.length : v))) return;
  await client`insert into profile_draft ("userId", data) values (${s.user.id}, ${JSON.stringify(o)}::jsonb) on conflict ("userId") do update set data = excluded.data, "updatedAt" = now()`;
}
export async function dismissNotice(id) {
  const s = await auth(); if (!s?.user?.id) return;
  await client`update notice set "readAt" = now() where id = ${id} and "userId" = ${s.user.id}`;
  revalidatePath("/", "layout");
}
export async function disconnectLinkedIn() {
  const s = await auth(); if (!s) return;
  await db.delete(accounts).where(and(eq(accounts.userId, s.user.id), eq(accounts.provider, "linkedin")));
  revalidatePath("/profile");
}

export async function swipe(to, yes) {
  const s = await auth(); if (!s) throw new Error("Sign in first"); const me = s.user.id;
  to = String(to || ""); yes = !!yes;
  if (!to || to === me) return; // never ask yourself
  if (!(await hit("swipe:" + me, 60, 3600))) throw new Error("You're going a bit fast. Please try again in a little while.");
  const [mine] = await db.select().from(profiles).where(eq(profiles.userId, me));
  if (!mine?.ageOk) redirect("/profile");
  if (!to.startsWith("demo-")) { // the other person must exist, be finished, and not be blocked either way
    const [tp] = await db.select().from(profiles).where(eq(profiles.userId, to));
    if (!tp?.ageOk || (await blockedBetween(me, to))) return;
  }
  if (yes) { const [pre] = await db.select().from(swipes).where(and(eq(swipes.from, to), eq(swipes.to, me), eq(swipes.yes, true))); if (!pre && (await gate(me, s.user.email)).locked) redirect("/discover?locked=1"); }
  const [prev] = await db.select().from(swipes).where(and(eq(swipes.from, me), eq(swipes.to, to)));
  if (yes) await track(me, "coffee_yes");
  await db.insert(swipes).values({ from: me, to, yes }).onConflictDoUpdate({ target: [swipes.from, swipes.to], set: { yes } });
  if (yes) {
    const [back] = await db.select().from(swipes).where(and(eq(swipes.from, to), eq(swipes.to, me), eq(swipes.yes, true)));
    const ex = await db.select().from(matches).where(or(and(eq(matches.a, me), eq(matches.b, to)), and(eq(matches.a, to), eq(matches.b, me))));
    if (!back && !to.startsWith("demo-") && !prev?.yes) { // tell them once, not every time the button is pressed
      const who = short(s.user.name, s.user.email), [ru] = await db.select().from(users).where(eq(users.id, to));
      await addNotice(to, who + " would like to grab coffee", "/matches");
      await sendTemplate(ru?.email, "coffeeRequest", { from: who, base: base(), link: `${base()}/member/${me}` }); await notify(to, who + " would like to grab coffee", "Open Kave to accept or decline.", "/matches");
    }
    if ((back || to.startsWith("demo-")) && !ex.length) {
      const [nm] = await db.insert(matches).values({ a: me, b: to }).onConflictDoNothing().returning(); // a simultaneous double match is dropped
      if (nm) {
        await track(me, "matched"); await track(to, "matched");
        if (back) {
          const us = await db.select().from(users).where(inArray(users.id, [me, to]));
          for (const u of us) { await notify(u.id, "It's a match", "Pick a time and place for your coffee.", "/matches"); await sendTemplate(u.email, "match", { other: short(us.find((x) => x.id !== u.id)?.name, us.find((x) => x.id !== u.id)?.email), base: base(), link: `${base()}/coffee/${nm.id}` }); }
        }
      }
    }
  }
  revalidatePath("/discover");
}
export async function loadDemo() {
  const s = await auth(); if (!s || s.user.email !== process.env.ADMIN_EMAIL) throw new Error("Admin only");
  const N = ["Noa", "Dan", "Maya", "Eitan", "Shira", "Yoni", "Tal", "Lior", "Avi", "Dana"], C = ["Jerusalem", "Tel Aviv", "Modi'in", "Beit Shemesh"];
  const R = ["Founder", "Marketer", "Developer", "Recruiter", "Investor", "Operator"], K = ["growth", "partnerships", "B2B SaaS", "AdTech", "fintech", "AI", "product", "sales"];
  for (let i = 0; i < 30; i++) {
    const id = `demo-${i}`;
    await db.insert(users).values({ id, name: `${N[i % 10]} ${String.fromCharCode(65 + i)}.` }).onConflictDoNothing();
    await db.insert(profiles).values({ userId: id, headline: R[i % 6], industry: K[i % 8], neighborhood: C[i % 4], skills: [K[i % 8], K[(i + 3) % 8]], isDemo: true }).onConflictDoNothing();
  }
  revalidatePath("/admin");
}

export async function deleteAccount() {
  const s = await auth(); if (!s) return; const id = s.user.id, email = s.user.email;
  const mine = (await db.select().from(matches).where(or(eq(matches.a, id), eq(matches.b, id)))).map((m) => m.id);
  if (mine.length) { await db.delete(thanks).where(inArray(thanks.matchId, mine)); await db.delete(messages).where(inArray(messages.matchId, mine)); }
  await db.delete(thanks).where(eq(thanks.fromId, id));
  try { if (mine.length) await client`delete from coffee_confirmation where "matchId" = any(${mine})`; if (mine.length) await client`delete from coffee_feedback where "matchId" = any(${mine})`; await client`delete from coffee_confirmation where "userId" = ${id}`; await client`delete from coffee_feedback where "userId" = ${id}`; } catch {}
  await wipeWhatsApp(id);
  await db.delete(intros).where(or(eq(intros.byId, id), eq(intros.a, id), eq(intros.b, id)));
  await db.delete(swipes).where(or(eq(swipes.from, id), eq(swipes.to, id)));
  await db.delete(matches).where(or(eq(matches.a, id), eq(matches.b, id)));
  await db.delete(blocks).where(or(eq(blocks.from, id), eq(blocks.to, id)));
  await db.delete(events).where(eq(events.userId, id));
  await db.delete(messages).where(eq(messages.fromId, id));
  // Tables added by later migrations: best effort, a missing table must not block deletion. (optout is kept on purpose so we never email them again.)
  for (const run of [
    () => client`delete from dm_thread where a = ${id} or b = ${id}`, () => client`delete from saved where "userId" = ${id} or "targetId" = ${id}`,
    () => client`delete from circle_member where "userId" = ${id}`, () => client`delete from push_sub where "userId" = ${id}`, () => client`delete from notice where "userId" = ${id}`,
    () => client`delete from reminder where "userId" = ${id}`, () => client`delete from signup_attr where "userId" = ${id}`, () => client`delete from profile_draft where "userId" = ${id}`,
    () => client`delete from story where "userId" = ${id}`, () => client`delete from monthly_winner where "userId" = ${id}`, () => client`delete from broadcast_sent where "userId" = ${id}`,
    () => client`delete from intent where email = ${String(email || "").toLowerCase()}`,
  ]) { try { await run(); } catch {} }
  await db.delete(users).where(eq(users.id, id));
  await signOut({ redirectTo: "/" });
}
export async function blockUser(to, reason) {
  const s = await auth(); if (!s) return; const me = s.user.id, r = reason === "report" ? "report" : "block";
  to = String(to || ""); if (!to || to === me) return;
  await db.insert(blocks).values({ from: me, to, reason: r }).onConflictDoUpdate({ target: [blocks.from, blocks.to], set: { reason: r } });
  for (const g of await db.select().from(matches).where(or(and(eq(matches.a, me), eq(matches.b, to)), and(eq(matches.a, to), eq(matches.b, me))))) await logCoffee(me, g.id, "match_removed", { reason: r, status: g.status || null, met: g.met ?? null, createdAt: g.at });
  await db.delete(matches).where(or(and(eq(matches.a, me), eq(matches.b, to)), and(eq(matches.a, to), eq(matches.b, me))));
  await db.delete(swipes).where(or(and(eq(swipes.from, me), eq(swipes.to, to)), and(eq(swipes.from, to), eq(swipes.to, me)))); // old yes votes must not re-create the match
  revalidatePath("/discover"); revalidatePath("/matches");
}

export async function savePhoto(dataUrl) {
  const s = await auth(); if (!s) return;
  if (!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(dataUrl || "") || dataUrl.length > 80000) throw new Error("Bad photo");
  await db.update(users).set({ image: dataUrl }).where(eq(users.id, s.user.id));
  revalidatePath("/profile");
}
export async function sendThanks(fd) {
  const s = await auth(); if (!s) return; const id = fd.get("id");
  const [m] = await db.select().from(matches).where(eq(matches.id, id));
  if (!m || m.met !== true || (m.a !== s.user.id && m.b !== s.user.id)) return;
  const text = t(fd.get("text"), 140); if (!text) return;
  await db.insert(thanks).values({ matchId: id, fromId: s.user.id, text, isPublic: fd.get("public") === "on" }).onConflictDoNothing();
  revalidatePath("/matches");
}

export async function trackEvent(name) {
  const s = await auth(); if (!s || !["invite_shared", "card_shared", "linkedin_shared"].includes(name)) return;
  await track(s.user.id, name);
}

const base = () => process.env.APP_URL || "https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL;
export async function sendMessage(fd) {
  const s = await auth(); if (!s) return; const id = fd.get("id"), text = t(fd.get("text"), 500); if (!text) return;
  if (!(await hit("msg:" + s.user.id, 60, 3600))) return;
  const [m] = await db.select().from(matches).where(eq(matches.id, id));
  if (!m || (m.a !== s.user.id && m.b !== s.user.id)) return;
  const prev = (await db.select().from(messages).where(eq(messages.matchId, id))).sort((x, y) => y.at - x.at)[0];
  await db.insert(messages).values({ matchId: id, fromId: s.user.id, text });
  if (!prev || prev.fromId !== s.user.id) {
    const [ou] = await db.select().from(users).where(eq(users.id, m.a === s.user.id ? m.b : m.a));
    await sendTemplate(ou?.email, "newMessage", { from: short(s.user.name, s.user.email), text, base: base(), link: `${base()}/coffee/${id}` }); await notify(ou?.id, "New message from " + short(s.user.name, s.user.email), String(text).slice(0, 80), "/matches");
  }
  await track(s.user.id, "message_sent"); revalidatePath("/matches");
}
export async function toggleFree() {
  const s = await auth(); if (!s) return;
  const [p] = await db.select().from(profiles).where(eq(profiles.userId, s.user.id)); if (!p) return;
  const on = p.freeUntil && p.freeUntil > new Date();
  const end = new Date(); end.setDate(end.getDate() + ((7 - end.getDay()) % 7 || 7)); end.setHours(23, 59, 0, 0);
  await db.update(profiles).set({ freeUntil: on ? null : end }).where(eq(profiles.userId, s.user.id));
  revalidatePath("/discover");
}
export async function makeIntro(fd) {
  const s = await auth(); if (!s) return; const me = s.user.id, x = fd.get("a"), y = fd.get("b");
  if (!x || !y || x === y) return;
  if (!(await hit("intro:" + me, 10, 86400))) return;
  const mine = await db.select().from(matches).where(or(eq(matches.a, me), eq(matches.b, me)));
  const ok = (u) => mine.some((m) => m.met === true && (m.a === u || m.b === u));
  if (!ok(x) || !ok(y)) return;
  await db.insert(intros).values({ byId: me, a: x, b: y, note: t(fd.get("note"), 200) });
  const us = await db.select().from(users).where(inArray(users.id, [x, y]));
  for (const u of us) await sendTemplate(u.email, "intro", { by: short(s.user.name, s.user.email), other: short(us.find((z) => z.id !== u.id)?.name, us.find((z) => z.id !== u.id)?.email), base: base(), link: `${base()}/member/${us.find((z) => z.id !== u.id)?.id}` });
  await track(me, "intro_made"); revalidatePath("/matches");
}
export async function answerIntro(fd) {
  const s = await auth(); if (!s) return; const me = s.user.id, id = fd.get("id"), yes = fd.get("yes") === "1";
  const [i] = await db.select().from(intros).where(eq(intros.id, id));
  if (!i || (i.a !== me && i.b !== me)) return;
  const set = i.a === me ? { aYes: yes } : { bYes: yes };
  await db.update(intros).set(set).where(eq(intros.id, id));
  if ((set.aYes ?? i.aYes) && (set.bYes ?? i.bYes)) {
    const ex = await db.select().from(matches).where(or(and(eq(matches.a, i.a), eq(matches.b, i.b)), and(eq(matches.a, i.b), eq(matches.b, i.a))));
    const bl = await db.select().from(blocks).where(or(and(eq(blocks.from, i.a), eq(blocks.to, i.b)), and(eq(blocks.from, i.b), eq(blocks.to, i.a))));
    if (!ex.length && !bl.length) { await db.insert(matches).values({ a: i.a, b: i.b }); await track(i.a, "intro_accepted"); await track(i.b, "intro_accepted"); }
  }
  revalidatePath("/matches");
}

export async function hideThanks(fd) {
  const s = await auth(); if (!s) return; const id = fd.get("id");
  const [m] = await db.select().from(matches).where(eq(matches.id, id));
  if (!m || (m.a !== s.user.id && m.b !== s.user.id)) return;
  await client`update thanks set hidden = true where "matchId" = ${id} and "fromId" <> ${s.user.id}`;
  revalidatePath("/matches");
}
export async function toggleSave(target) {
  const s = await auth(); if (!s || target === s.user.id) return;
  await toggleSaved(client, s.user.id, target);
  revalidatePath("/saved"); revalidatePath("/member/" + target);
}
export async function joinCircleAction(slug) { const s = await auth(); if (!s) return; await joinCircle(client, slug, s.user.id); revalidatePath("/c/" + slug); }
export async function leaveCircle(slug) { const s = await auth(); if (!s) return; await client`delete from circle_member where "circleSlug" = ${slug} and "userId" = ${s.user.id}`; revalidatePath("/c/" + slug); }
export async function savePush(sub) {
  const s = await auth(); if (!s || !sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) return;
  await savePushSub(client, s.user.id, sub);
}
