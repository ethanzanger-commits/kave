import { db } from "@/db";
import { users, matches } from "@/schema";
import { eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { fmt } from "@/lib/fmt";
export default async function Card({ params }) {
  const { id } = await params;
  const [m] = await db.select().from(matches).where(eq(matches.id, id));
  if (!m?.when || m.status === "proposed") notFound();
  const us = await db.select().from(users).where(inArray(users.id, [m.a, m.b]));
  const first = (u) => (u?.name || "Someone").split(" ")[0]; // first names only, nothing else is public
  return (
    <main><div className="card"><h1>{first(us.find((u) => u.id === m.a))} + {first(us.find((u) => u.id === m.b))}</h1>
      <p>Coffee: {fmt(m.when)}, {m.place}.</p>
      <p><a href={"https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(m.place || "")} target="_blank" rel="noopener noreferrer">Open in Google Maps</a></p><p>Booked on kave. Meet someone outside your network.</p></div></main>
  );
}
