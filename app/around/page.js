import { auth } from "@/auth";
import { db, client } from "@/db";
import { profiles, users, swipes, blocks } from "@/schema";
import { eq, ne, or } from "drizzle-orm";
import { redirect } from "next/navigation";
import { missing } from "@/lib/complete";
import { swipe } from "../actions";
import { reasons } from "@/lib/match";
import Nav from "../Nav";
import Flair from "../Flair";
import { cityOf } from "@/lib/place";
import { winnerMap, isNewProfile, short } from "@/lib/leaders";
import { score } from "@/lib/match";
import { overlap } from "@/lib/avail";
export const metadata = { title: "People · Kave" };
export default async function Around({ searchParams }) {
  const s = await auth(); if (!s?.user?.id) redirect("/"); const me = s.user.id;
  const q = (await searchParams) || {};
  const city = q.city || "", industry = q.industry || "", skill = String(q.skill || "").trim().toLowerCase(), helpq = String(q.help || "").trim().toLowerCase();
  const filtered = Boolean(city || industry || skill || helpq);
  const [mine = {}] = await db.select().from(profiles).where(eq(profiles.userId, me));
  const [meU] = await db.select().from(users).where(eq(users.id, me));
  if (missing(mine, meU?.image).length) redirect("/profile");
  const seen = new Set((await db.select({ t: swipes.to }).from(swipes).where(eq(swipes.from, me))).map((x) => x.t));
  (await db.select().from(blocks).where(or(eq(blocks.from, me), eq(blocks.to, me)))).forEach((b) => seen.add(b.from === me ? b.to : b.from));
  const rows = (await db.select({ p: profiles, u: users }).from(profiles).innerJoin(users, eq(users.id, profiles.userId)).where(ne(profiles.userId, me)).limit(300)).filter((r) => r.p.ageOk && r.p.about);
  const win = await winnerMap(client);
  const cities = {}; rows.forEach((r) => { const c = cityOf(r.p) || "Elsewhere"; cities[c] = (cities[c] || 0) + 1; });
  const industries = [...new Set(rows.map((r) => r.p.industry).filter(Boolean))].sort();
  const match = (r) => (!city || cityOf(r.p) === city) && (!industry || r.p.industry === industry)
    && (!skill || (r.p.skills || []).some((x) => String(x).toLowerCase().includes(skill)))
    && (!helpq || String(r.p.canHelp || "").toLowerCase().includes(helpq));
  const pool = rows.filter((r) => !seen.has(r.p.userId) && match(r));
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
        {(() => { const rs = reasons(mine, r.p)[0]; return rs ? <p className="hint">{rs.t}</p> : (r.p.canHelp ? <p className="hint">Can help with: {r.p.canHelp}</p> : null); })()}
        <Flair cats={win[r.p.userId]} isNew={isNewProfile(r.p)} />
        <form action={swipe.bind(null, r.p.userId, true)}><button>I'd like to meet</button></form>
      </div>
    </li>
  );
  const Section = ({ title, note, list }) => list.length === 0 ? null : <section><h2>{title}</h2><p><small>{note}</small></p><ul className="people">{list.map((r) => <Person key={r.p.userId} r={r} />)}</ul></section>;
  return (
    <main className="wide">
      <Nav />
      <h1 className="display">People</h1>
      <p className="lead">{rows.length} {rows.length === 1 ? "member" : "members"} across Israel. Ask anyone for a coffee, or open their profile first.</p>
      <form className="filters" method="get" action="/around">
        <label>City<select name="city" defaultValue={city}><option value="">All cities</option>{Object.entries(cities).map(([c, n]) => <option key={c} value={c}>{c} ({n})</option>)}</select></label>
        <label>Industry<select name="industry" defaultValue={industry}><option value="">Any industry</option>{industries.map((i) => <option key={i} value={i}>{i}</option>)}</select></label>
        <label>Skill<input name="skill" defaultValue={q.skill || ""} placeholder="e.g. growth" /></label>
        <label>Can help with<input name="help" defaultValue={q.help || ""} placeholder="e.g. hiring" /></label>
        <button className="primary">Filter</button>
      </form>
      {filtered && <p className="meta"><a href="/around">Clear filters</a></p>}
      {pool.length === 0 ? (
        <div className="empty"><b>{filtered ? "Nobody matches those filters." : "Nobody new to show right now."}</b> {filtered ? "Try fewer filters. " : ""}You can <a href="/discover?view=dismissed">revisit people you passed on</a> or <a href="/invite">invite someone you'd like to see here</a>.</div>
      ) : filtered ? (
        <Section title={`${pool.length} ${pool.length === 1 ? "person" : "people"}`} note="Sorted by how well they fit you." list={[...pool].sort((a, b) => rank(b) - rank(a)).slice(0, 40)} />
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
