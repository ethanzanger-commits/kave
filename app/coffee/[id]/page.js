import Prompts from "../../Prompts";
import Nav from "../../Nav";
import { auth } from "@/auth";
import { db } from "@/db";
import { profiles, users, matches } from "@/schema";
import { eq } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import { fmt } from "@/lib/fmt";
import { why, starters } from "@/lib/match";
export default async function Coffee({ params }) {
  const { id } = await params;
  const s = await auth(); if (!s?.user?.id) redirect("/"); const me = s.user.id;
  const [m] = await db.select().from(matches).where(eq(matches.id, id));
  if (!m || (m.a !== me && m.b !== me)) notFound();
  const oid = m.a === me ? m.b : m.a;
  const [mp = {}] = await db.select().from(profiles).where(eq(profiles.userId, me));
  const [op = {}] = await db.select().from(profiles).where(eq(profiles.userId, oid));
  const [ou] = await db.select().from(users).where(eq(users.id, oid));
  const q = encodeURIComponent((m.place || "") + " " + (mp.neighborhood || ""));
  return (
    <main className="wide">
      <Nav />
      <p className="kicker">Your coffee</p>
      <h1 className="display">Coffee with {(ou?.name || "your match").split(" ")[0]}</h1>
      <p className="lead">{m.when ? fmt(m.when) : "Time to be agreed"}{m.place ? ` at ${m.place}` : ""}</p>
      {m.place && <p><a href={"https://www.google.com/maps/dir/?api=1&destination=" + q} target="_blank" rel="noopener noreferrer">Get directions</a></p>}
      <p className="why"><b>Why you two?</b> {why(mp, op)}</p>
      <div className="card"><h2>Who they are</h2>{ou?.image && <img src={ou.image} alt="" width="96" height="120" referrerPolicy="no-referrer" style={{ float: "right", margin: "0 0 .6rem 1rem" }} />}<p>{[op.headline, op.company].filter(Boolean).join(" at ")}</p>
        {op.about && <p>{op.about}</p>}
        <Prompts p={op} /></div>
      <div className="card"><h2>Topics</h2><ul>{starters(mp, op).map((x) => <li key={x}>{x}</li>)}</ul></div>
      <div className="card"><h2>Quick tips</h2><ul>
        <li>Arrive 5 minutes early and say your name at the door.</li>
        <li>Phone away. Ask first, then share.</li>
        <li>Running late? Message them on kave.</li>
        <li>Leave with one next step: an intro, a call, or a second coffee.</li></ul></div>
    </main>
  );
}
