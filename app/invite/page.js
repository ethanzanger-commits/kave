import Nav from "../Nav";
import { auth } from "@/auth";
import { db } from "@/db";
import { profiles, users } from "@/schema";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { TIERS } from "@/lib/rewards";
import { short } from "@/lib/leaders";
import Share from "../Share";
export default async function Invite() {
  const s = await auth(); if (!s?.user?.id) redirect("/");
  const [me] = await db.select().from(profiles).where(eq(profiles.userId, s.user.id));
  if (!me?.refCode) redirect("/profile");
  const joined = await db.select({ name: users.name, email: users.email }).from(profiles).innerJoin(users, eq(users.id, profiles.userId)).where(and(eq(profiles.invitedBy, s.user.id), eq(profiles.ageOk, true)));
  const n = joined.length, next = TIERS.find((t) => t.n > n), top = TIERS[TIERS.length - 1].n;
  const link = `https://${(await headers()).get("host")}/join?ref=${me.refCode}`;
  return (
    <main>
      <Nav />
      <h1>Your network is better over coffee.</h1>
      <p className="lead">Know someone who should be on Kave? Bring them along.</p>
      <div className="card">
        <b>{n} {n === 1 ? "friend" : "friends"} joined</b>{next && <span> · {next.n - n} more for {next.name}</span>}
        <div className="bar"><div style={{ width: Math.min(100, (n / top) * 100) + "%" }} /></div>
        <Share link={link} />
      </div>
      <div className="card">
        <h2>Perks</h2>
        {TIERS.map((t) => <div key={t.n} style={{ display: "flex", gap: ".8rem", alignItems: "center", margin: ".5rem 0", opacity: n >= t.n ? 1 : 0.45 }}><img className="badgeimg" src={`/badges/${t.slug}.svg`} alt="" width="56" height="56" /><p style={{ margin: 0 }}><b>{t.name}</b> · {t.n} {t.n === 1 ? "friend" : "friends"}: {t.perk}{n >= t.n ? " ✓" : ""}</p></div>)}
      </div>
      {n > 0 && <p>Joined so far: {joined.map((j) => short(j.name, j.email)).join(", ")}</p>}
    </main>
  );
}
