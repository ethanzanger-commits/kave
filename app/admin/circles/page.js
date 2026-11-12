import AdminNav from "../AdminNav";
import { auth } from "@/auth";
import { client } from "@/db";
import { redirect } from "next/navigation";
import { createCircle } from "../actions";
export default async function AdminCircles() {
  const s = await auth();
  if (!s || !process.env.ADMIN_EMAIL || s.user.email !== process.env.ADMIN_EMAIL) redirect("/");
  let list = []; try { list = await client`select c.slug, c.name, (select count(*) from circle_member m where m."circleSlug" = c.slug)::int as n from circle c order by c.at`; } catch {}
  return (
    <main>
      <AdminNav />
      <h1>Circles</h1>
      <form action={createCircle}><label>Name<input name="name" required maxLength={60} placeholder="Olim in tech" /></label><label>One-line description<input name="blurb" maxLength={200} placeholder="Newcomers working in Israeli tech" /></label><p></p><button className="primary">Create circle</button></form>
      <div className="card"><h2>Existing circles</h2>{list.length === 0 ? <p>None yet. Run migrations/kave7-community.sql if this page errors.</p> : list.map((c) => <p key={c.slug}><a href={"/c/" + c.slug}>{c.name}</a> ({c.n} members). Invite link: /c/{c.slug}/join</p>)}</div>
    </main>
  );
}
