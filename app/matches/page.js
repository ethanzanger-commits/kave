import { auth } from "@/auth";
import { db } from "@/db";
import { profiles, users, matches } from "@/schema";
import { eq, or, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { schedule } from "../actions";
import { starters } from "@/lib/match";
import { cafes } from "@/lib/cafes";
export default async function Matches() {
  const s = await auth(); if (!s) redirect("/"); const me = s.user.id;
  const ms = await db.select().from(matches).where(or(eq(matches.a, me), eq(matches.b, me)));
  const ids = ms.map((m) => (m.a === me ? m.b : m.a));
  const others = ids.length ? await db.select({ p: profiles, u: users }).from(profiles).innerJoin(users, eq(users.id, profiles.userId)).where(inArray(profiles.userId, ids)) : [];
  const [mine] = await db.select().from(profiles).where(eq(profiles.userId, me));
  const near = await cafes(mine?.neighborhood);
  const invited = (await db.select({ id: profiles.userId }).from(profiles).where(eq(profiles.invitedBy, me))).length;
  const host = (await headers()).get("host");
  return (
    <main>
      <nav><a href="/discover">Discover</a><a href="/profile">Profile</a></nav>
      <h1>My coffees</h1>
      <p>{ms.length} matches · {ms.filter((m) => m.when).length} coffees booked · {invited} friends invited</p>
      {near.length > 0 && <p>Cafés near {mine.neighborhood}: {near.join(", ")}. <small>Map data © OpenStreetMap contributors</small></p>}
      <datalist id="cafes">{near.map((c) => <option key={c} value={c} />)}</datalist>
      <p>Your invite link: <b>{host}/join?ref={mine?.refCode}</b></p>
      {ms.length === 0 && <p>No matches yet. Say Coffee? to a few people on Discover.</p>}
      {ms.map((m) => {
        const o = others.find((x) => x.p.userId === (m.a === me ? m.b : m.a)); if (!o) return null;
        return (
          <div className="card" key={m.id}>
            <h2>{o.u.name}</h2><p>{o.p.headline}</p>
            <p><b>Try asking:</b></p><ul>{starters(mine, o.p).map((q) => <li key={q}>{q}</li>)}</ul>
            {m.when ? <p>Booked: {m.when} at {m.place}. <a href={`/card/${m.id}`}>Share your coffee card</a></p> : (
              <form action={schedule}><input type="hidden" name="id" value={m.id} />
                <input name="when" placeholder="When? e.g. Sunday 9:30" required />
                <input name="place" list="cafes" placeholder="Which café?" required /><button className="primary">Book coffee</button></form>)}
          </div>);
      })}
    </main>
  );
}
