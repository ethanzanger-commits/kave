import { auth } from "@/auth";
import SubmitButton from "@/app/SubmitButton";
import { db, client } from "@/db";
import { profiles, users, swipes, matches } from "@/schema";
import { and, eq, or } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import Nav from "../../Nav";
import Flair from "../../Flair";
import Prompts from "../../Prompts";
import { swipe, blockUser, toggleSave } from "../../actions";
import { winnerMap, isNewProfile, short } from "@/lib/leaders";
import { why } from "@/lib/match";
import { overlap, AVAIL } from "@/lib/avail";
import { cityOf } from "@/lib/place";
import { endorsementsFor } from "@/lib/social";
export async function generateMetadata() { return { title: "Member · Kave", robots: { index: false } }; }
export default async function Member({ params }) {
  const { id } = await params;
  const s = await auth(); if (!s?.user?.id) redirect("/?next=" + encodeURIComponent(`/member/${id}`)); const me = s.user.id;
  const [p] = await db.select().from(profiles).where(eq(profiles.userId, id));
  const [u] = await db.select().from(users).where(eq(users.id, id));
  if (!p || !p.ageOk || !u) notFound();
  const [mine] = await db.select().from(profiles).where(eq(profiles.userId, me));
  const mineSw = (await db.select().from(swipes).where(and(eq(swipes.from, me), eq(swipes.to, id))))[0];
  const theirSw = (await db.select().from(swipes).where(and(eq(swipes.from, id), eq(swipes.to, me))))[0];
  const [m] = await db.select().from(matches).where(or(and(eq(matches.a, me), eq(matches.b, id)), and(eq(matches.a, id), eq(matches.b, me))));
  const win = await winnerMap(client);
  const endorse = await endorsementsFor(client, id).catch(() => []);
  const [sv] = await client`select 1 as x from saved where "userId" = ${me} and "targetId" = ${id}`.catch(() => []);
  const labels = Object.fromEntries(AVAIL);
  const common = overlap(mine || {}, p);
  const name = short(u.name, u.email);
  return (
    <main>
      <Nav />
      <article className="profile">
        <div className="photo">{u.image ? <img src={u.image} alt={`Photo of ${name}`} referrerPolicy="no-referrer" className="portrait" /> : <div className="avatar">{name[0]}</div>}</div>
        <h1 style={{ marginTop: 0 }}>{name}</h1>
        <p className="role">{[p.headline, p.company].filter(Boolean).join(" at ")}, {cityOf(p)}</p>
        <p><Flair cats={win[id]} isNew={isNewProfile(p)} />{p.foundingNo && <span className="badge">Founding 50 #{p.foundingNo}</span>}</p>
        {p.about && <p>{p.about}</p>}
        <Prompts p={p} />
        {endorse.length > 0 && <section><h2>What people say</h2>{endorse.map((e, i) => <p key={i}>"{e.text}" <small>{short(e.name, e.email)}</small></p>)}</section>}
        {me !== p.userId && <a className="cta li" href={`/messages/with/${p.userId}`}>Message {name}</a>}
        {p.linkedinUrl && <a className="cta li" href={p.linkedinUrl} target="_blank" rel="noopener noreferrer">View {name} on LinkedIn</a>}
        {(p.skills || []).length > 0 && <p>{p.skills.slice(0, 8).map((x) => <span className="chip" key={x}>{x}</span>)}</p>}
        {(p.availability || []).length > 0 && <p><small>Free for coffee: {p.availability.map((k) => labels[k].toLowerCase()).join(", ")}.</small></p>}
        {id !== me && <p className="why">{why(mine || {}, p)}{common.length > 0 ? ` You're both free ${common.join(", ")}.` : ""}</p>}
        {id === me ? <p><a href="/profile">Edit your profile</a></p>
          : m ? <a className="cta" href="/matches">You're matched. Open your coffee</a>
          : mineSw?.yes ? <p className="why">You've asked {name} for a coffee. We'll email you when they reply.</p>
          : theirSw?.yes && !mineSw ? <div><p><b>{name}</b> would like to grab a coffee with you.</p><div className="row"><form action={swipe.bind(null, id, true)}><SubmitButton className="primary">Accept</SubmitButton></form><form action={swipe.bind(null, id, false)}><SubmitButton>Decline</SubmitButton></form></div></div>
          : <div className="row"><form action={swipe.bind(null, id, true)}><SubmitButton className="primary">Ask for a coffee</SubmitButton></form><form action={swipe.bind(null, id, false)}><SubmitButton>Not now</SubmitButton></form></div>}
        {id !== me && <form action={toggleSave.bind(null, id)}><SubmitButton>{sv ? "Saved. Tap to remove" : "Save for later"}</SubmitButton></form>}
        {id !== me && <p><small><form action={blockUser.bind(null, id, "report")} style={{ display: "inline" }}><SubmitButton style={{ width: "auto", minHeight: 0, border: 0, padding: 0, textDecoration: "underline", fontWeight: 400 }}>Report</SubmitButton></form>{" or "}<form action={blockUser.bind(null, id, "block")} style={{ display: "inline" }}><SubmitButton style={{ width: "auto", minHeight: 0, border: 0, padding: 0, textDecoration: "underline", fontWeight: 400 }}>block this member</SubmitButton></form></small></p>}
      </article>
    </main>
  );
}
