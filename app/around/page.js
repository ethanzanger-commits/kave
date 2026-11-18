import { auth } from "@/auth";
import SubmitButton from "@/app/SubmitButton";
import { db, client } from "@/db";
import { profiles, users, swipes, blocks } from "@/schema";
import { eq, ne, or, sql, getTableColumns } from "drizzle-orm";
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
import { haystack, matchesQuery } from "@/lib/search";
import { isFinished } from "@/lib/complete";
export const metadata = { title: "People · Kave" };
export default async function Around({ searchParams }) {
  const s = await auth(); if (!s?.user?.id) redirect("/?next=" + encodeURIComponent("/around")); const me = s.user.id;
  const sp = (await searchParams) || {}; const city = sp.city || "", q = String(sp.q || "").slice(0, 80), industry = sp.industry || "", freeOnly = sp.free === "1", n = Math.min(500, Math.max(30, Number(sp.n) || 30));
  const filtering = !!(q.trim() || industry || freeOnly);
  const [mine = {}] = await db.select().from(profiles).where(eq(profiles.userId, me));
  const [meU] = await db.select().from(users).where(eq(users.id, me));
  if (missing(mine, meU?.image).length) redirect("/profile");
  const g = await gate(me, s.user.email);
  const seen = new Set((await db.select({ t: swipes.to }).from(swipes).where(eq(swipes.from, me))).map((x) => x.t));
  const blk = new Set(); (await db.select().from(blocks).where(or(eq(blocks.from, me), eq(blocks.to, me)))).forEach((b) => { const o = b.from === me ? b.to : b.from; seen.add(o); blk.add(o); });
  const { image: _i, ...uCols } = getTableColumns(users);
  const uLite = { ...uCols, hasImage: sql`(${users.image} is not null)`.mapWith(Boolean) };
  const rows = (await db.select({ p: profiles, u: uLite }).from(profiles).innerJoin(users, eq(users.id, profiles.userId)).where(ne(profiles.userId, me)).limit(1000)).filter((r) => isFinished(r.p, r.u.hasImage));
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
      <a href={"/member/" + r.p.userId}>{r.u.hasImage ? <img src={`/api/avatar/${r.p.userId}?v=${+new Date(r.p.updatedAt)}`} alt="" width="64" height="64" referrerPolicy="no-referrer" /> : <div className="avatar">{short(r.u.name, r.u.email)[0]}</div>}</a>
      <div className="info">
        <h3><a href={"/member/" + r.p.userId}>{short(r.u.name, r.u.email)}</a></h3>
        <p>{[r.p.headline, cityOf(r.p)].filter(Boolean).join(", ")}</p>
        <Flair cats={win[r.p.userId]} isNew={isNewProfile(r.p)} />
        <p><a href={"/messages/with/" + r.p.userId}>Message</a></p>
        {!seen.has(r.p.userId) && <form action={swipe.bind(null, r.p.userId, true)}><SubmitButton>Ask for a coffee</SubmitButton></form>}
      </div>
    </li>
  );
  const industries = [...new Set(rows.map((r) => r.p.industry).filter(Boolean))].sort();
  const everyone = rows.filter((r) => !blk.has(r.p.userId) && (!city || cityOf(r.p) === city) && (!industry || r.p.industry === industry) && (!freeOnly || (r.p.freeUntil && r.p.freeUntil > new Date())) && (!q.trim() || matchesQuery(haystack(r), q))).sort((a, b) => rank(b) - rank(a));
  const more = "/around?" + new URLSearchParams({ ...(q && { q }), ...(city && { city }), ...(industry && { industry }), ...(freeOnly && { free: "1" }), n: String(n + 30) }).toString();
  const Section = ({ title, note, list }) => list.length === 0 ? null : <section><h2>{title}</h2><p><small>{note}</small></p><ul className="people">{list.map((r) => <Person key={r.p.userId} r={r} />)}</ul></section>;
  return (
    <main>
      <Nav />
      <h1>People</h1>
      <p className="lead">{rows.length} {rows.length === 1 ? "member" : "members"} across Israel. Ask anyone for a coffee, or open their profile first.</p>
      <form method="get" role="search" action="/around">
        <label>Search<input type="search" name="q" defaultValue={q} placeholder="Name, skill or company, e.g. fintech partnerships" /></label>
        <label>City<select name="city" defaultValue={city}><option value="">All cities</option>{Object.entries(cities).map(([c, k]) => <option key={c} value={c}>{c} ({k})</option>)}</select></label>
        <label>Industry<select name="industry" defaultValue={industry}><option value="">All industries</option>{industries.map((i) => <option key={i} value={i}>{i}</option>)}</select></label>
        <label className="check"><input type="checkbox" name="free" value="1" defaultChecked={freeOnly} />Free for coffee this week</label>
        <p><button className="primary" type="submit">Search</button> {filtering || city ? <a href="/around">Clear</a> : null}</p>
      </form>
      {!filtering && pool.length > 0 && (<>
        <Section title="People worth meeting" note="Picked for you from your skills, city and availability." list={worth} />
        <Section title="New to Kave" note="Joined in the last week." list={newest} />
        <Section title="In your industry" note={mine.industry ? `Also working in ${mine.industry}.` : ""} list={sameInd} />
        <Section title="Different perspectives" note="Another field, with something in common." list={diff} />
      </>)}
      <section><h2>{filtering ? "Results" : "Everyone on Kave"}{city ? ` in ${city}` : ""}</h2><p><small>{everyone.length} {everyone.length === 1 ? "member" : "members"}. Everyone is listed, including people you've already seen.</small></p>
        {everyone.length === 0 ? <p>{filtering ? "No one matches that yet. Try fewer words or clear the filters." : "Nobody here yet."} <a href="/invite">Invite a friend</a>.</p> : <ul className="people">{everyone.slice(0, n).map((r) => <Person key={r.p.userId} r={r} />)}</ul>}
        {everyone.length > n && <p><a className="chip" href={more}>Show more ({everyone.length - n} left)</a></p>}</section>
    </main>
  );
}
