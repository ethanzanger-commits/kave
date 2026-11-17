import { auth } from "@/auth";
import { client } from "@/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import AdminNav from "../AdminNav";
import SubmitButton from "../../SubmitButton";
export const metadata = { title: "Stories · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";
async function admin() { const s = await auth(); if (!s || !process.env.ADMIN_EMAIL || s.user.email !== process.env.ADMIN_EMAIL) redirect("/"); }
async function setStatus(id, status) { "use server"; await admin(); await client`update story set status = ${status} where id = ${id} and (${status} <> 'approved' or consent)`; revalidatePath("/admin/stories"); }
async function addStory(fd) {
  "use server"; await admin();
  const name = String(fd.get("name") || "").trim().split(" ")[0].slice(0, 40), body = String(fd.get("body") || "").trim().slice(0, 800);
  if (!name || body.length < 10 || fd.get("ok") !== "on") return;
  await client`insert into story (name, body, consent, status, source) values (${name}, ${body}, true, 'approved', 'admin')`;
  revalidatePath("/admin/stories");
}
export default async function Stories() {
  await admin();
  let rows = [], err = "";
  try { rows = await client`select * from story order by (status = 'pending') desc, "at" desc limit 200`; } catch { err = "Run kave13-stories-broadcast.sql in Neon first, then reload."; }
  return (
    <main>
      <AdminNav />
      <h1>Stories</h1>
      {err && <p className="why">{err}</p>}
      <p><small>Only stories with consent can be approved. Approved stories appear in broadcast emails, first name only. <a href="/admin/export?type=stories">Export CSV</a></small></p>
      {rows.map((r) => (
        <div className="card" key={r.id}>
          <p style={{ margin: 0 }}>“{r.body}”</p>
          <p><small><b>{r.name}</b> · {r.status} · {r.consent ? "consent given" : "no consent, can't be shared"} · {r.source}</small></p>
          <div className="row">
            {r.status !== "approved" && r.consent && <form action={setStatus.bind(null, r.id, "approved")}><SubmitButton className="primary">Approve</SubmitButton></form>}
            {r.status !== "hidden" && <form action={setStatus.bind(null, r.id, "hidden")}><SubmitButton>Hide</SubmitButton></form>}
          </div>
        </div>))}
      {!err && rows.length === 0 && <p>No stories yet. Ask members from the broadcast email, or add one you collected below.</p>}
      <div className="card"><h2>Add a story you collected</h2><p><small>From a message or a chat. Only add it once they've agreed to be quoted.</small></p>
        <form action={addStory}><label>First name<input name="name" required maxLength={40} /></label><label>Their words<textarea name="body" rows={4} maxLength={800} required /></label>
          <label className="check"><input type="checkbox" name="ok" required />They agreed to be quoted by first name.</label><SubmitButton className="primary">Add and approve</SubmitButton></form></div>
    </main>
  );
}
