import Prompts from "../../Prompts";
import Nav from "../../Nav";
import CoffeePanel from "../../CoffeePanel";
import { auth } from "@/auth";
import { db, client } from "@/db";
import { profiles, users, matches, thanks } from "@/schema";
import { eq } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { why, starters } from "@/lib/match";
import { cafePins } from "@/lib/cafes";
import { confsFor, coffeeState } from "@/lib/coffee";
import { short } from "@/lib/leaders";
import WhatsAppConnect from "../../WhatsAppConnect";
import { waStates } from "@/lib/whatsapp";
export const dynamic = "force-dynamic";
const ERR = { clash: "One of you already has a coffee at about that time. Pick another time.", past: "That time has already passed. Pick a time in the future.", far: "Please pick a date within the next four months.", invalid: "Please choose a day, a time and a café.", same: "That is already the current plan.", closed: "That isn't possible any more for this coffee.", wa_invalid: "That doesn't look like a phone number. Include the country code, e.g. +1 212 555 0100, or start Israeli numbers with 0.", wa_phone: "Add your number to share it.", slow: "You're going a bit fast. Try again in a little while." };
// Full coffee page, also the landing page for email links: same nav, same actions as My coffees.
export default async function Coffee({ params, searchParams }) {
  const { id } = await params, sp = (await searchParams) || {};
  const s = await auth(); if (!s?.user?.id) redirect("/?next=" + encodeURIComponent(`/coffee/${id}`)); const me = s.user.id;
  const [m] = await db.select().from(matches).where(eq(matches.id, id));
  if (!m || (m.a !== me && m.b !== me)) notFound();
  const oid = m.a === me ? m.b : m.a;
  const [mp = {}] = await db.select().from(profiles).where(eq(profiles.userId, me));
  const [op = {}] = await db.select().from(profiles).where(eq(profiles.userId, oid));
  const [ou] = await db.select().from(users).where(eq(users.id, oid));
  const th = await db.select().from(thanks).where(eq(thanks.matchId, id));
  const confs = await confsFor([id]);
  let fb = null; try { [fb = null] = await client`select 1 as x from coffee_feedback where "matchId" = ${id} and "userId" = ${me}`; } catch {}
  const pins = await cafePins(mp.neighborhood), near = pins.pins.map((x) => x.name).slice(0, 6), host = (await headers()).get("host");
  const wa = (await waStates(me, [id]))?.[id] || null;
  const q = encodeURIComponent((m.place || "") + " " + (mp.neighborhood || "")), name = short(ou?.name, ou?.email), st = coffeeState(m);
  return (
    <main>
      <Nav />
      <p><a href="/matches">All my coffees</a></p>
      <h1>Coffee with {name.split(" ")[0]}</h1>
      {sp.new && <p className="why" role="status">It's a match. Pick a time and place below.</p>}
      {ERR[sp.e] && <p className="why" role="alert">{ERR[sp.e]}</p>}
      <datalist id="cafes">{near.map((c) => <option key={c} value={c} />)}</datalist>
      <CoffeePanel m={m} me={me} name={name} mine={mp} oCity={op.city} confs={confs} fb={fb} thanks={th} near={near} pins={pins} host={host} />
      <WhatsAppConnect id={id} name={name} wa={wa} />
      {m.place && st === "scheduled" && <p><a href={"https://www.google.com/maps/dir/?api=1&destination=" + q} target="_blank" rel="noopener noreferrer">Get directions</a></p>}
      <div className="card"><h2>Who they are</h2><p>{[op.headline, op.company].filter(Boolean).join(" at ")}</p>
        {op.about && <p>{op.about}</p>}
        <Prompts p={op} /></div>
      <p className="why"><b>Why you two?</b> {why(mp, op)}</p>
      <div className="card"><h2>Topics</h2><ul>{starters(mp, op).map((x) => <li key={x}>{x}</li>)}</ul></div>
      <div className="card"><h2>Quick tips</h2><ul>
        <li>Arrive 5 minutes early and say your name at the door.</li>
        <li>Phone away. Ask first, then share.</li>
        <li>Running late? Message them on kave.</li>
        <li>Leave with one next step: an intro, a call, or a second coffee.</li></ul></div>
    </main>
  );
}
