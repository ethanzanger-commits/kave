"use server";
import { auth, signOut } from "@/auth";
import { db, client } from "@/db";
import { awardFounding } from "@/lib/founding";
import { AV_KEYS } from "@/lib/avail";
import { CITIES } from "@/lib/cities";
import { profiles, accounts, users, swipes, matches, blocks, thanks, events, messages, intros } from "@/schema";
import { cookies } from "next/headers";
import { fmt } from "@/lib/fmt";
import { short } from "@/lib/leaders";
import { track } from "@/lib/track";
import { sendMail } from "@/lib/mail";
import { sendTemplate } from "@/lib/emails";
import { notify } from "@/lib/push";
import { toggleSaved, joinCircle, savePushSub } from "@/lib/social";
import { gate } from "@/lib/gate";
import { and, eq, or, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
const li = (v) => (/^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\//i.test(v || "") ? v : null);
const t = (v, n = 200) => (v ? String(v).slice(0, n) : null);
export async function saveProfile(d) {
  const s = await auth(); if (!s) throw new Error("Sign in first");
  if (!d.ageOk) throw new Error("Confirm you are 18 or older");
  const [pu] = await db.select().from(users).where(eq(users.id, s.user.id));
  if (!pu?.image) throw new Error("Add a profile photo");
  if (!/\S+\s+\S+/.test(d.name || "")) throw new Error("Add your first and last name");
  await db.update(users).set({ name: t(d.name, 80) }).where(eq(users.id, s.user.id));
  if (!t(d.about) || !t(d.headline) || !CITIES.includes(d.city) || !(d.skills || []).length) throw new Error("Complete your profile");
  await track(s.user.id, "profile_saved");
  const v = { ageOk: true, about: t(d.about, 600), lookingFor: t(d.lookingFor, 160), workingOn: t(d.workingOn, 200), showOnHome: !!d.showOnHome, canHelp: t(d.canHelp, 160), weekly: d.weekly !== false, availability: (d.availability || []).filter((x) => AV_KEYS.includes(x)), city: CITIES.includes(d.city) ? d.city : null, headline: t(d.headline), company: t(d.company), industry: t(d.industry), neighborhood: CITIES.includes(d.city) ? d.city : null,
    linkedinUrl: li(d.linkedinUrl), skills: (d.skills || []).slice(0, 50), experience: (d.experience || []).slice(0, 30),
    education: (d.education || []).slice(0, 10), updatedAt: new Date() };
  const ref = (await cookies()).get("ref")?.value; let invitedBy = null;
  if (ref) { const [o] = await db.select({ u: profiles.userId }).from(profiles).where(eq(profiles.refCode, ref)); if (o && o.u !== s.user.id) invitedBy = o.u; }
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
  }
  revalidatePath("/profile");
  return { first, founding: fn };
}
export async function disconnectLinkedIn() {
  const s = await auth(); if (!s) return;
  await db.delete(accounts).where(and(eq(accounts.userId, s.user.id), eq(accounts.provider, "linkedin")));
  revalidatePath("/profile");
}

export async function swipe(to, yes) {
  const s = await auth(); if (!s) throw new Error("Sign in first"); const me = s.user.id;
  if (yes) { const [pre] = await db.select().from(swipes).where(and(eq(swipes.from, to), eq(swipes.to, me), eq(swipes.yes, true))); if (!pre && (await gate(me, s.user.email)).locked) throw new Error("Invite friends to unlock more coffees"); }
  if (yes) await track(me, "coffee_yes");
  await db.insert(swipes).values({ from: me, to, yes }).onConflictDoUpdate({ target: [swipes.from, swipes.to], set: { yes } });
  if (yes) {
    const [back] = await db.select().from(swipes).where(and(eq(swipes.from, to), eq(swipes.to, me), eq(swipes.yes, true)));
    const ex = await db.select().from(matches).where(or(and(eq(matches.a, me), eq(matches.b, to)), and(eq(matches.a, to), eq(matches.b, me))));
    if (!back && !to.startsWith("demo-")) { const [ru] = await db.select().from(users).where(eq(users.id, to)); await sendTemplate(ru?.email, "coffeeRequest", { from: short(s.user.name, s.user.email), base: base() }); await notify(to, short(s.user.name, s.user.email) + " would like to grab coffee", "Open Kave to accept or decline.", "/matches"); }
    if ((back || to.startsWith("demo-")) && !ex.length) {
      await db.insert(matches).values({ a: me, b: to });
      await track(me, "matched"); await track(to, "matched");
      if (back) {
        const us = await db.select().from(users).where(inArray(users.id, [me, to]));
        for (const u of us) { await notify(u.id, "It's a match", "Pick a time and place for your coffee.", "/matches"); await sendTemplate(u.email, "match", { other: short(us.find((x) => x.id !== u.id)?.name, us.find((x) => x.id !== u.id)?.email), base: base() }); }
      }
    }
  }
  revalidatePath("/discover");
}
export async function schedule(fd) {
  const s = await auth(); if (!s) throw new Error("Sign in first"); const id = fd.get("id");
  const [m] = await db.select().from(matches).where(eq(matches.id, id));
  if (!m || (m.a !== s.user.id && m.b !== s.user.id)) throw new Error("Not your match");
  await db.update(matches).set({ when: t(fd.get("when"), 80), place: t(fd.get("place"), 80), status: "proposed", proposedBy: s.user.id, reminded: false }).where(eq(matches.id, id));
  const [ou] = await db.select().from(users).where(eq(users.id, m.a === s.user.id ? m.b : m.a));
  await sendTemplate(ou?.email, "coffeeProposed", { from: short(s.user.name, s.user.email), when: fmt(fd.get("when")), place: fd.get("place"), base: base() }); await notify(ou?.id, short(s.user.name, s.user.email) + " suggested a coffee", "Accept or change the plan.", "/matches");
  revalidatePath("/matches");
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
  const s = await auth(); if (!s) return; const id = s.user.id;
  await db.delete(swipes).where(or(eq(swipes.from, id), eq(swipes.to, id)));
  await db.delete(matches).where(or(eq(matches.a, id), eq(matches.b, id)));
  await db.delete(blocks).where(or(eq(blocks.from, id), eq(blocks.to, id)));
  await db.delete(events).where(eq(events.userId, id));
  await db.delete(messages).where(eq(messages.fromId, id));
  await db.delete(users).where(eq(users.id, id));
  await signOut({ redirectTo: "/" });
}

export async function blockUser(to, reason) {
  const s = await auth(); if (!s) return; const me = s.user.id, r = reason === "report" ? "report" : "block";
  await db.insert(blocks).values({ from: me, to, reason: r }).onConflictDoUpdate({ target: [blocks.from, blocks.to], set: { reason: r } });
  await db.delete(matches).where(or(and(eq(matches.a, me), eq(matches.b, to)), and(eq(matches.a, to), eq(matches.b, me))));
  revalidatePath("/discover"); revalidatePath("/matches");
}
export async function checkIn(fd) {
  const s = await auth(); if (!s) return; const id = fd.get("id");
  const [m] = await db.select().from(matches).where(eq(matches.id, id));
  if (!m || (m.a !== s.user.id && m.b !== s.user.id)) return;
  if (fd.get("met") === "yes") await track(s.user.id, "met");
  await db.update(matches).set({ met: fd.get("met") === "yes" }).where(eq(matches.id, id));
  revalidatePath("/matches");
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
  const s = await auth(); if (!s || !["invite_shared", "card_shared"].includes(name)) return;
  await track(s.user.id, name);
}

const base = () => process.env.APP_URL || "https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL;
export async function respond(fd) {
  const s = await auth(); if (!s) return; const id = fd.get("id"), act = fd.get("a");
  const [m] = await db.select().from(matches).where(eq(matches.id, id));
  if (!m || (m.a !== s.user.id && m.b !== s.user.id)) return;
  const other = m.a === s.user.id ? m.b : m.a;
  if (act === "accept" && m.proposedBy !== s.user.id && m.when) { await db.update(matches).set({ status: "confirmed" }).where(eq(matches.id, id)); await track(s.user.id, "booked"); await track(other, "booked"); }
  else if (act === "cancel") await db.update(matches).set({ status: null, when: null, place: null, proposedBy: null }).where(eq(matches.id, id));
  else return;
  const [ou] = await db.select().from(users).where(eq(users.id, other));
  await sendTemplate(ou?.email, act === "accept" ? "coffeeConfirmed" : "coffeeCancelled", { from: short(s.user.name, s.user.email), base: base() }); await notify(ou?.id, act === "accept" ? "Coffee confirmed" : "Coffee cancelled", short(s.user.name, s.user.email), "/matches");
  revalidatePath("/matches");
}
export async function sendMessage(fd) {
  const s = await auth(); if (!s) return; const id = fd.get("id"), text = t(fd.get("text"), 500); if (!text) return;
  const [m] = await db.select().from(matches).where(eq(matches.id, id));
  if (!m || (m.a !== s.user.id && m.b !== s.user.id)) return;
  const prev = (await db.select().from(messages).where(eq(messages.matchId, id))).sort((x, y) => y.at - x.at)[0];
  await db.insert(messages).values({ matchId: id, fromId: s.user.id, text });
  if (!prev || prev.fromId !== s.user.id) {
    const [ou] = await db.select().from(users).where(eq(users.id, m.a === s.user.id ? m.b : m.a));
    await sendTemplate(ou?.email, "newMessage", { from: short(s.user.name, s.user.email), text, base: base() }); await notify(ou?.id, "New message from " + short(s.user.name, s.user.email), String(text).slice(0, 80), "/matches");
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
  const mine = await db.select().from(matches).where(or(eq(matches.a, me), eq(matches.b, me)));
  const ok = (u) => mine.some((m) => m.met === true && (m.a === u || m.b === u));
  if (!ok(x) || !ok(y)) return;
  await db.insert(intros).values({ byId: me, a: x, b: y, note: t(fd.get("note"), 200) });
  const us = await db.select().from(users).where(inArray(users.id, [x, y]));
  for (const u of us) await sendTemplate(u.email, "intro", { by: short(s.user.name, s.user.email), other: short(us.find((z) => z.id !== u.id)?.name, us.find((z) => z.id !== u.id)?.email), base: base() });
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
