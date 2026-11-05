"use server";
import { auth } from "@/auth";
import { db } from "@/db";
import { profiles, accounts, users, swipes, matches } from "@/schema";
import { cookies } from "next/headers";
import { sendMail } from "@/lib/mail";
import { gate } from "@/lib/gate";
import { and, eq, or, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
const li = (v) => (/^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\//i.test(v || "") ? v : null);
const t = (v, n = 200) => (v ? String(v).slice(0, n) : null);
export async function saveProfile(d) {
  const s = await auth(); if (!s) throw new Error("Sign in first");
  const v = { headline: t(d.headline), company: t(d.company), industry: t(d.industry), neighborhood: t(d.neighborhood),
    linkedinUrl: li(d.linkedinUrl), skills: (d.skills || []).slice(0, 50), experience: (d.experience || []).slice(0, 30),
    education: (d.education || []).slice(0, 10), updatedAt: new Date() };
  const ref = (await cookies()).get("ref")?.value; let invitedBy = null;
  if (ref) { const [o] = await db.select({ u: profiles.userId }).from(profiles).where(eq(profiles.refCode, ref)); if (o && o.u !== s.user.id) invitedBy = o.u; }
  await db.insert(profiles).values({ userId: s.user.id, ...v, refCode: Math.random().toString(36).slice(2, 8), invitedBy }).onConflictDoUpdate({ target: profiles.userId, set: v });
  revalidatePath("/profile");
}
export async function disconnectLinkedIn() {
  const s = await auth(); if (!s) return;
  await db.delete(accounts).where(and(eq(accounts.userId, s.user.id), eq(accounts.provider, "linkedin")));
  revalidatePath("/profile");
}

export async function swipe(to, yes) {
  const s = await auth(); if (!s) throw new Error("Sign in first"); const me = s.user.id;
  if (yes && (await gate(me, s.user.email)).locked) throw new Error("Invite friends to unlock more coffees");
  await db.insert(swipes).values({ from: me, to, yes }).onConflictDoUpdate({ target: [swipes.from, swipes.to], set: { yes } });
  if (yes) {
    const [back] = await db.select().from(swipes).where(and(eq(swipes.from, to), eq(swipes.to, me), eq(swipes.yes, true)));
    const ex = await db.select().from(matches).where(or(and(eq(matches.a, me), eq(matches.b, to)), and(eq(matches.a, to), eq(matches.b, me))));
    if ((back || to.startsWith("demo-")) && !ex.length) {
      await db.insert(matches).values({ a: me, b: to });
      if (back) {
        const us = await db.select().from(users).where(inArray(users.id, [me, to]));
        for (const u of us) await sendMail(u.email, "It's a coffee match on kave", `You and ${us.find((x) => x.id !== u.id)?.name || "someone"} both said yes. Pick a time and a café: ${process.env.APP_URL}/matches`);
      }
    }
  }
  revalidatePath("/discover");
}
export async function schedule(fd) {
  const s = await auth(); if (!s) throw new Error("Sign in first"); const id = fd.get("id");
  const [m] = await db.select().from(matches).where(eq(matches.id, id));
  if (!m || (m.a !== s.user.id && m.b !== s.user.id)) throw new Error("Not your match");
  await db.update(matches).set({ when: t(fd.get("when"), 80), place: t(fd.get("place"), 80) }).where(eq(matches.id, id));
  const [ou] = await db.select().from(users).where(eq(users.id, m.a === s.user.id ? m.b : m.a));
  await sendMail(ou?.email, "Coffee proposed on kave", `${s.user.name || "Your match"} suggested ${fd.get("when")} at ${fd.get("place")}: ${process.env.APP_URL}/matches`);
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
