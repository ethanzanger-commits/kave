import { auth } from "@/auth";
import { db } from "@/db";
import { profiles, matches, swipes, blocks } from "@/schema";
import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { loadDemo } from "../actions";
const n = async (q) => Number((await q)[0].c);
export default async function Admin() {
  const s = await auth(); if (!s || !process.env.ADMIN_EMAIL || s.user.email !== process.env.ADMIN_EMAIL) redirect("/");
  const real = await n(db.select({ c: sql`count(*)` }).from(profiles).where(eq(profiles.isDemo, false)));
  const demo = await n(db.select({ c: sql`count(*)` }).from(profiles).where(eq(profiles.isDemo, true)));
  const ms = await n(db.select({ c: sql`count(*)` }).from(matches));
  const booked = await n(db.select({ c: sql`count(*)` }).from(matches).where(sql`${matches.when} is not null and coalesce(${matches.status}, 'confirmed') = 'confirmed'`));
  const met = await n(db.select({ c: sql`count(*)` }).from(matches).where(eq(matches.met, true)));
  const reports = await n(db.select({ c: sql`count(*)` }).from(blocks).where(eq(blocks.reason, "report")));
  const active = await n(db.select({ c: sql`count(distinct ${swipes.from})` }).from(swipes));
  return (
    <main><h1>Admin</h1>
      <p><a href="/admin/analytics">Analytics dashboard</a></p>
      <p>Real profiles: {real} · Demo people: {demo}</p>
      <p>Matches: {ms} · Coffees booked: {booked}</p>
      <p>Coffees that happened: {met} · Open reports: {reports}</p>
      <p>Coffees per active user: {active ? (booked / active).toFixed(2) : "0"}</p>
      <form action={loadDemo}><button className="primary">Load 30 demo people</button></form></main>
  );
}
