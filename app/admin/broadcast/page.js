import { auth } from "@/auth";
import { client } from "@/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import AdminNav from "../AdminNav";
import SubmitButton from "../../SubmitButton";
import { sendMail } from "@/lib/mail";
import { sig } from "@/lib/unsub";
export const metadata = { title: "Broadcast · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const BATCH = 15;
const base = () => process.env.APP_URL || "https://" + (process.env.VERCEL_PROJECT_PRODUCTION_URL || "kave-seven.vercel.app");
async function admin() { const s = await auth(); if (!s || !process.env.ADMIN_EMAIL || s.user.email !== process.env.ADMIN_EMAIL) redirect("/"); return s; }
const DEFAULT_BODY = `Hi {first},

Kave just crossed 50 members, and you're one of them. Thank you for being early.

Kave exists for one reason: so "we should grab coffee" actually happens. Here's how you make it work:

1. Meet for coffee. Every coffee you book makes the matches better for everyone.
2. Bring someone you'd like to meet. Your invite link is on the Invite page. Every friend who finishes a profile earns you badges and priority matching.
3. Tell us what happened. When a coffee goes well, share your story and we'll feature it, with your permission.

{stories}

SHARE YOUR STORY: {base}/story

OPEN KAVE: {base}

Ethan`;
const eligible = (b, limit) => client`select u.id, u.name, u.email from "user" u join profile p on p."userId" = u.id
  where p."ageOk" and not coalesce(p."isDemo", false) and u.id not like 'demo-%' and not exists (select 1 from optout o where lower(o.email) = lower(u.email))
  and not exists (select 1 from broadcast_sent s where s.broadcast_id = ${b} and s."userId" = u.id) order by p."completedAt" nulls last limit ${limit}`;
async function compose(b, email, name) {
  const [row] = await client`select * from broadcast where id = ${b}`; if (!row) return null;
  let st = "";
  if (row.stories) { const ss = await client`select name, body from story where status = 'approved' and consent order by "at" desc limit 3`; st = ss.length ? "From the community:\n\n" + ss.map((x) => `"${x.body}" (${x.name})`).join("\n\n") : ""; }
  const first = (name || "").split(" ")[0] || "there";
  const text = row.body.replaceAll("{first}", first).replaceAll("{base}", base()).replaceAll("{stories}", st).replace(/\n{3,}/g, "\n\n") + `\n\nUnsubscribe: ${base()}/unsubscribe?e=${encodeURIComponent(email)}&t=${sig(email)}`;
  return [row.subject.replaceAll("{first}", first), text];
}
async function save(fd) {
  "use server"; await admin();
  const subject = String(fd.get("subject") || "").trim().slice(0, 150), body = String(fd.get("body") || "").trim().slice(0, 8000);
  if (!subject || !body) redirect("/admin/broadcast");
  const [r] = await client`insert into broadcast (subject, body, stories) values (${subject}, ${body}, ${fd.get("stories") === "on"}) returning id`;
  redirect("/admin/broadcast?b=" + r.id);
}
async function test(b) { "use server"; const s = await admin(); const m = await compose(b, s.user.email, s.user.name); const ok = m && (await sendMail(s.user.email, "[TEST] " + m[0], m[1])); redirect(`/admin/broadcast?b=${b}&t=${ok ? "ok" : "fail"}`); }
async function sendBatch(b) {
  "use server"; await admin();
  let sent = 0, stopped = false;
  for (const u of await eligible(b, BATCH)) {
    const m = await compose(b, u.email, u.name); if (!m) break;
    if (!(await sendMail(u.email, m[0], m[1], { low: true }))) { stopped = true; break; }
    await client`insert into broadcast_sent (broadcast_id, "userId") values (${b}, ${u.id}) on conflict do nothing`; sent++;
  }
  revalidatePath("/admin/broadcast"); redirect(`/admin/broadcast?b=${b}&sent=${sent}${stopped ? "&stopped=1" : ""}`);
}
export default async function Broadcast({ searchParams }) {
  const s = await admin(); const sp = (await searchParams) || {};
  let left = [], done = 0, preview = null, err = "";
  try {
    if (sp.b) { left = await eligible(sp.b, 1000); [{ c: done }] = await client`select count(*)::int as c from broadcast_sent where broadcast_id = ${sp.b}`; preview = await compose(sp.b, "member@example.com", "Dana Cohen"); }
  } catch { err = "Run kave13-stories-broadcast.sql in Neon first, then reload."; }
  return (
    <main>
      <AdminNav />
      <h1>Broadcast</h1>
      {err && <p className="why">{err}</p>}
      {!sp.b ? (
        <form action={save}>
          <p><small>Goes to members with finished profiles who haven't unsubscribed. <b>{"{first}"}</b> becomes their first name, <b>{"{stories}"}</b> becomes up to 3 approved stories, and an unsubscribe link is added.</small></p>
          <label>Subject<input name="subject" defaultValue="Kave just crossed 50 members. Thank you." maxLength={150} required /></label>
          <label>Message<textarea name="body" rows={20} defaultValue={DEFAULT_BODY} required /></label>
          <label className="check"><input type="checkbox" name="stories" defaultChecked />Include approved stories</label>
          <SubmitButton className="primary" pendingText="Saving…">Save and preview</SubmitButton>
        </form>
      ) : preview ? (<>
        {sp.t === "ok" && <p className="why" role="status">Test sent to {s.user.email}.</p>}
        {sp.t === "fail" && <p className="why" role="alert">Test failed. Check your email settings.</p>}
        {sp.sent != null && <p className="why" role="status">Sent {sp.sent} email{sp.sent === "1" ? "" : "s"}.{sp.stopped ? " Stopped early because today's email limit was reached. Come back tomorrow." : ""}</p>}
        <div className="card"><p><small>Subject</small></p><h2 style={{ marginTop: 0 }}>{preview[0]}</h2><p style={{ whiteSpace: "pre-wrap" }}>{preview[1]}</p></div>
        <p><b>{done}</b> sent, <b>{left.length}</b> still to send.</p>
        <div className="row"><form action={test.bind(null, sp.b)}><SubmitButton>Send test to me</SubmitButton></form>
          {left.length > 0 && <form action={sendBatch.bind(null, sp.b)}><SubmitButton className="primary" pendingText="Sending…">Send next {Math.min(BATCH, left.length)} to members</SubmitButton></form>}</div>
        <p><small>Always send the test first. Each click sends up to {BATCH} real emails. Click again for the next group. Nobody gets the same broadcast twice. <a href="/admin/broadcast">Write a new one</a></small></p>
      </>) : <p>Broadcast not found. <a href="/admin/broadcast">Start a new one</a>.</p>}
    </main>
  );
}
