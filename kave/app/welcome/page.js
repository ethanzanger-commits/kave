import { auth } from "@/auth";
import { db } from "@/db";
import { profiles, users } from "@/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { missing } from "@/lib/complete";
import ShareCard from "../ShareCard";
export const metadata = { title: "You're in · Kave" };
export default async function Welcome() {
  const s = await auth(); if (!s?.user?.id) redirect("/");
  const [p] = await db.select().from(profiles).where(eq(profiles.userId, s.user.id));
  const [u] = await db.select().from(users).where(eq(users.id, s.user.id));
  if (missing(p, u?.image).length) redirect("/profile");
  return (
    <main>
      <p className="logo">kave<span>.</span></p>
      <h1>You're in{s.user.name ? `, ${s.user.name.split(" ")[0]}` : ""}.</h1>
      <p className="lead">Your account is set up and your profile is live.</p>
      {p.foundingNo && <div className="card"><div className="who"><img className="badgeimg" src="/badges/founding-50.svg" alt="" width="72" height="72" /><div><h2>KAVE FOUNDING 50</h2><p style={{ margin: 0 }}>Member #{p.foundingNo}. Yours for good.</p></div></div></div>}
      <a className="cta" href="/discover">Meet people</a>
      <ShareCard code={p.refCode} />
      <p><a href="/profile">Edit my profile</a> · <a href="/how-to">How it works</a></p>
    </main>
  );
}
