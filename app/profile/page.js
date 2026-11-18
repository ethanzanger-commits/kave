import Nav from "../Nav";
import SubmitButton from "@/app/SubmitButton";
import ShareCard from "../ShareCard";
import { auth, signOut } from "@/auth";
import { db, client } from "@/db";
import { communityStats } from "@/lib/community";
import Milestone from "../Milestone";
import Flair from "../Flair";
import { cookies } from "next/headers";
import PushButton from "../PushButton";
import { winnerMap } from "@/lib/leaders";
import { profiles, accounts, users, swipes, matches } from "@/schema";
import { missing } from "@/lib/complete";
import { and, eq, or } from "drizzle-orm";
import { redirect } from "next/navigation";
import ProfileForm from "../ProfileForm";
import { disconnectLinkedIn, deleteAccount } from "../actions";
export default async function Profile() {
  const s = await auth(); if (!s?.user?.id) redirect("/?next=" + encodeURIComponent("/profile"));
  const id = s.user.id;
  const [p] = await db.select().from(profiles).where(eq(profiles.userId, id));
  const [u] = await db.select().from(users).where(eq(users.id, id));
  if (u && !u.source) {
    const ck = await cookies(), rf = ck.get("ref")?.value, cr = ck.get("circle")?.value, sc = ck.get("src")?.value;
    let by = null;
    if (rf) { const [o] = await client`select "userId" from profile where "refCode" = ${rf}`; if (o && o.userId !== id) by = o.userId; }
    await client`update "user" set source = ${rf ? "referral" : cr ? "circle:" + cr : sc || "direct"}, "referredBy" = ${by} where id = ${id} and source is null`;
  }
  const miss = missing(p, u?.image);
  const stats = await communityStats(client);
  const win = await winnerMap(client);
    const sw = (await db.select().from(swipes).where(eq(swipes.from, id))).length;
  const ms = await db.select().from(matches).where(or(eq(matches.a, id), eq(matches.b, id)));
  const step = miss.length ? ["Finish your profile", `Still needed: ${miss.join(", ")}. Then you can start meeting people.`, ""]
    : sw === 0 ? ["Meet your first people", "Go to Discover and tap Coffee? on someone who looks interesting.", "/discover"]
    : ms.length === 0 ? ["Waiting for a match", "A match needs both people to say yes. Invite friends so there are more people to meet.", "/invite"]
    : !ms.some((m) => m.when && m.status !== "proposed") ? ["Book your coffee", "Open My coffees, pick a café and a time.", "/matches"]
    : ["Bring someone along", "Invite friends and earn badges.", "/invite"];
  const setup = miss.length > 0;
  let draft = null, cityCounts = {};
  try { if (!p?.ageOk) { const [r] = await client`select data from profile_draft where "userId" = ${s.user.id}`; draft = r?.data || null; } cityCounts = Object.fromEntries((await client`select city, count(*)::int as n from complete_member where city is not null group by city`).map((r) => [r.city, r.n])); } catch {}
  const linked = (await db.select().from(accounts).where(and(eq(accounts.userId, id), eq(accounts.provider, "linkedin")))).length > 0;
  return (
    <main>
      <div className="who">
        {u?.image ? <img src={u?.image} alt="" width="56" height="56" referrerPolicy="no-referrer" /> : <div className="avatar">{(s.user.name || "?")[0]}</div>}
        <div><h1>{s.user.name || "Welcome"}</h1>
          {linked && <span className="badge">Connected with LinkedIn</span>}</div>
      </div>
      <Nav />
      {!setup && p?.linkedinUrl && <a href={p.linkedinUrl} target="_blank" rel="noopener noreferrer">View LinkedIn profile</a>}
      {!setup && process.env.UNLOCK_INVITES !== "0" && <p className="why">Invite 3 friends to unlock unlimited coffee requests. <a href="/invite">Get your link</a></p>}
      {p?.foundingNo && <div className="card"><div className="who"><img className="badgeimg" src="/badges/founding-50.svg" alt="" width="72" height="72" /><div><h2>KAVE FOUNDING 50</h2><p style={{ margin: 0 }}>Member #{p.foundingNo}. Yours for good.</p></div></div></div>}
      {setup && <div className="why"><b>Create your profile. It takes about two minutes.</b>{stats.foundingLeft > 0 ? ` Finish it to claim one of the first 50 Kave spots (${stats.foundingLeft} left).` : ""}</div>}
      {!miss.length && <p className="why">✓ Your account is set up and your profile is live.</p>}
      {!setup && (win[id] || []).length > 0 && <div className="card"><h2>Monthly winner</h2><p><Flair cats={win[id]} /></p><p style={{ margin: 0 }}>You won last month, so you have special flair and priority in search all month.</p></div>}
      {!setup && !/\S+\s+\S+/.test(u?.name || "") && <p className="why">Add your first and last name below so people see who you are.</p>}
      {!setup && process.env.VAPID_PUBLIC_KEY && <PushButton vapid={process.env.VAPID_PUBLIC_KEY} />}
      {!setup && <Milestone stats={stats} />}
      {!miss.length && <div className="card"><small>Your next step</small><h2>{step[0]}</h2><p>{step[1]}</p>{step[2] && <a className="chip" href={step[2]}>Let's go</a>}</div>}
      {!miss.length && p?.refCode && <ShareCard code={p.refCode} />}
      <ProfileForm draft={draft} cityCounts={cityCounts} image={u?.image || ""} initial={{ ...(p || {}), updatedAt: undefined, userId: undefined, name: u?.name || "" }} />
      <div className="row">
        {linked && <form action={disconnectLinkedIn}><SubmitButton>Disconnect LinkedIn</SubmitButton></form>}
        <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}><SubmitButton>Sign out</SubmitButton></form>
        <form action={deleteAccount}><SubmitButton>Delete my account</SubmitButton></form>
      </div>
    </main>
  );
}
