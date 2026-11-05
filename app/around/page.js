import { auth } from "@/auth";
import { db } from "@/db";
import { profiles, users } from "@/schema";
import { eq, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { gate } from "@/lib/gate";
export default async function Around() {
  const s = await auth(); if (!s) redirect("/"); const me = s.user.id;
  const g = await gate(me, s.user.email);
  const rows = await db.select({ p: profiles, u: users }).from(profiles).innerJoin(users, eq(users.id, profiles.userId)).where(ne(profiles.userId, me)).limit(300);
  const by = {}; for (const r of rows) (by[r.p.neighborhood || "Somewhere"] ??= []).push(r);
  return (
    <main>
      <nav><a href="/discover">Discover</a><a href="/matches">My coffees</a><a href="/profile">Profile</a></nav>
      <h1>Who's around</h1>
      {Object.entries(by).map(([n, list]) => (
        <div className="card" key={n}><h2>{n}: {list.length}</h2>
          {g.open ? <ul>{list.slice(0, 15).map((r) => <li key={r.p.userId}>{(r.u.name || "Someone").split(" ")[0]}, {r.p.headline}</li>)}</ul>
            : <p>Invite {g.need - g.invited} more {g.need - g.invited === 1 ? "friend" : "friends"} to see who.</p>}</div>))}
    </main>
  );
}
