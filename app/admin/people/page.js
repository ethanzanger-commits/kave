import { auth } from "@/auth";
import { client } from "@/db";
import { redirect } from "next/navigation";
import AdminNav from "../AdminNav";
import { incomplete, inactive } from "@/lib/growth";
import { missing } from "@/lib/complete";
export const metadata = { title: "People · Admin", robots: { index: false } };
export default async function People() {
  const s = await auth();
  if (!s || !process.env.ADMIN_EMAIL || s.user.email !== process.env.ADMIN_EMAIL) redirect("/");
  let inc = [], ina = [], err = "";
  try { [inc, ina] = await Promise.all([incomplete(client), inactive(client, 14)]); } catch { err = "Run migrations/kave8-growth.sql in Neon first, then reload."; }
  return (
    <main>
      <AdminNav />
      <h1>People to follow up</h1>
      {err && <p className="why">{err}</p>}
      <section className="card"><h2>Unfinished profiles ({inc.length})</h2><p><small>Newest first. A personal message works best.</small></p>
        {inc.slice(0, 40).map((r) => <p key={r.id} style={{ margin: ".6rem 0" }}><b>{r.name || "No name"}</b>, <a href={"mailto:" + r.email}>{r.email}</a><br /><small>{Math.floor(r.days)} days ago, via {r.source}. Missing: {missing(r, r.image).join(", ")}. {r.rem} reminders sent.</small></p>)}</section>
      <section className="card"><h2>Quiet members ({ina.length})</h2><p><small>Finished profiles with no activity for 14 days.</small></p>
        {ina.slice(0, 40).map((r) => <p key={r.id} style={{ margin: ".6rem 0" }}><b>{r.name || "No name"}</b>, <a href={"mailto:" + r.email}>{r.email}</a><br /><small>Last seen {Math.floor(r.idle_days)} days ago.</small></p>)}</section>
    </main>
  );
}
