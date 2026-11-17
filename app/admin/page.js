import { auth } from "@/auth";
import SubmitButton from "@/app/SubmitButton";
import { db } from "@/db";
import { profiles, matches, swipes, blocks } from "@/schema";
import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { client } from "@/db";
import { loadDemo } from "../actions";
const n = async (q) => Number((await q)[0].c);
export default async function Admin() {
  const s = await auth(); if (!s || !process.env.ADMIN_EMAIL || s.user.email !== process.env.ADMIN_EMAIL) redirect("/");
  const started = await n(db.select({ c: sql`count(*)` }).from(profiles).where(eq(profiles.isDemo, false)));
  const signups = Number((await client`select count(*)::int as c from "user" where id not like 'demo-%'`)[0].c);
  let finished = 0; try { finished = Number((await client`select count(*)::int as c from complete_member`)[0].c); } catch {}
  const demo = await n(db.select({ c: sql`count(*)` }).from(profiles).where(eq(profiles.isDemo, true)));
  const ms = await n(db.select({ c: sql`count(*)` }).from(matches));
  const booked = await n(db.select({ c: sql`count(*)` }).from(matches).where(sql`${matches.when} is not null and coalesce(${matches.status}, 'confirmed') = 'confirmed'`));
  const met = await n(db.select({ c: sql`count(*)` }).from(matches).where(eq(matches.met, true)));
  const reports = await n(db.select({ c: sql`count(*)` }).from(blocks).where(eq(blocks.reason, "report")));
  const active = await n(db.select({ c: sql`count(distinct ${swipes.from})` }).from(swipes));
  return (
    <main><h1>Admin</h1>
      <p><a href="/admin/weekly">Weekly growth</a> · <a href="/admin/people">People to follow up</a> · <a href="/admin/experiments">Experiment log</a> · <a href="/admin/analytics">Analytics</a> · <a href="/admin/insights">Insights</a> · <a href="/admin/stories">Stories</a> · <a href="/admin/broadcast">Broadcast</a></p>
      <p>Sign-ups: <b>{signups}</b> · Profiles started: <b>{started}</b> · <b>Finished profiles: {finished}</b> · Demo people: {demo}</p>
      <p><small>Finished means a photo, city, headline, about me, at least one skill and the 18+ box. That's the number used everywhere in the app, including the milestone counter.</small></p>
      <p>Matches: {ms} · Coffees booked: {booked}</p>
      <p>Coffees that happened: {met} · Open reports: {reports}</p>
      <p>Coffees per active user: {active ? (booked / active).toFixed(2) : "0"}</p>
      <form action={loadDemo}><SubmitButton className="primary">Load 30 demo people</SubmitButton></form></main>
  );
}
