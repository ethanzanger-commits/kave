import { auth } from "@/auth";
import { db, client } from "@/db";
import { profiles, users, swipes, blocks } from "@/schema";
import { eq, ne, or } from "drizzle-orm";
import { redirect } from "next/navigation";
import { gate } from "@/lib/gate";
import { missing } from "@/lib/complete";
import { swipe } from "../actions";
import Nav from "../Nav";
import Flair from "../Flair";
import { cityOf } from "@/lib/place";
import { winnerMap, isNewProfile, short } from "@/lib/leaders";
import { score } from "@/lib/match";
import { overlap } from "@/lib/avail";
export const metadata = { title: "People · Kave" };
export default async function Around({ searchParams }) {
  const s = await auth(); if (!s?.user?.id) redirect("/"); const me = s.user.id;
  const city = (await searchParams)?.city || "";
  const [mine = {}] = await db.select().from(profiles).where(eq(profiles.userId, me));
  const [meU] = await db.select().from(users).where(eq(users.id, me));
  if (missing(mine, meU?.image).length) redirect("/profile");
  const g = await gate(me, s.user.email);
  const seen = new Set((await db.select({ t: swipes.to }).from(swipes).where(eq(swipes.from, me))).map((x) => x.t));
  (await db.select().from(blocks).where(or(eq(blocks.from, me), eq(blocks.to, me)))).forEach((b) => seen.add(b.from === me ? b.to : b.from));
  const rows = (await db.select({ p: profiles, u: users }).from(profiles).innerJoin(users, eq(users.id, profiles.userId)).where(ne(profiles.userId, me)).limit(300)).filter((r) => r.p.ageOk && r.p.about);
  const win = await winnerMap(client);
  const cities = {}; rows.forEach((r) => { const c = cityOf(r.p) || "Elsewhere"; cities[c] = (cities[c] || 0) + 1; });
  const pool = rows.filter((r) => !seen.has(r.p.userId) && (!city || cityOf(r.p) === city));
  const rank = (r) => score(mine, r.p) + (overlap(mine, r.p).length ? 2 : 0) + ((win[r.p.userId] || []).length ? 3 : 0) + (r.p.freeUntil && r.p.freeUntil > new Date() ? 1 : 0);
  const worth = [...pool].sort((a, b) => rank(b) - rank(a)).slice(0, 3);
  const used = new Set(worth.map((r) => r.p.userId)), fresh = (l) => l.filter((r) => !used.has(r.p.userId));
  const newest = fresh(pool.filter((r) => isNewProfile(r.p))).slice(0, 5); newest.forEach((r) => used.add(r.p.userId));
  const sameInd = mine.industry ? fresh(pool.filter((r) => r.p.industry === mine.industry)).slice(0, 4) : []; sameInd.forEach((r) => used.add(r.p.userId));
  const diff = fresh(pool.filter((r) => r.p.industry && r.p.industry !== mine.industry)).sort((a, b) => score(mine, b.p) - score(mine, a.p)).slice(0, 4);
  const Person = ({ r }) => (
    <li>
      <a href={"/member/" + r.p.userId}>{r.u.image ? <img src={r.u.image} alt="" width="64" height="64" referrerPolicy="no-referrer" /> : <div className="avatar">{short(r.u.name, r.u.email)[0]}</div>}</a>
      <div className="info">
        <h3><a href={"/member/" + r.p.userId}>{short(r.u.name, r.u.email)}</a></h3>
        <p>{[r.p.headline, cityOf(r.p)].filter(Boolean).join(", ")}</p>
        <Flair cats={win[r.p.userId]} isNew={isNewProfile(r.p)} />
        <form action={swipe.bind(null, r.p.userId, true)}><button>Ask for a coffee</button></form>
      </div>
    </li>
  );
  const Section = ({ title, note, list }) => list.length === 0 ? null : <section><h2>{title}</h2><p><small>{note}</small></p><ul className="people">{list.map((r) => <Person key={r.p.userId} r={r} />)}</ul></section>;
  return (
    <main className="wide">
      <Nav />
      <h1 className="display">People</h1>
      <p className="lead">{rows.length} {rows.length === 1 ? "member" : "members"} across Israel. Ask anyone for a coffee, or open their profile first.</p>
      <p><a className="chip" href="/around">All cities</a>{Object.entries(cities).map(([c, n]) => <a className="chip cafe" key={c} href={"/around?city=" + encodeURIComponent(c)}>{c} ({n})</a>)}</p>
      {!g.open ? (
        <div className="card"><h2>Names unlock with {g.need} friends</h2><p>Names appear once {g.need} friends join through your link ({g.invited} so far).</p><a href="/invite">Get your invite link</a></div>
      ) : pool.length === 0 ? (
        <div className="card"><p>Nobody new to show right now. Invite a friend and there will be more people to meet.</p><a href="/invite">Get your invite link</a></div>
      ) : (
        <>
          <Section title="People worth meeting" note="Picked for you from your skills, city and availability." list={worth} />
          <Section title="New to Kave" note="Joined in the last week." list={newest} />
          <Section title="In your industry" note={mine.industry ? `Also working in ${mine.industry}.` : ""} list={sameInd} />
          <Section title="Different perspectives" note="Another field, with something in common." list={diff} />
        </>
      )}
    </main>
  );
}
