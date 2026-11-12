import { requireAdmin } from "@/lib/admin";
import { client } from "@/db";
import AdminNav from "../AdminNav";
import { inactive, stalled, incomplete } from "@/lib/growth";
import { missing } from "@/lib/complete";
export default async function People({ searchParams }) {
  await requireAdmin();
  const view = (await searchParams)?.view || "incomplete";
  let rows = [], err = "";
  try {
    if (view === "inactive") rows = (await inactive(client, 14)).map((r) => ({ ...r, note: `last active ${r.days} days ago` }));
    else if (view === "stalled") rows = (await stalled(client)).map((r) => ({ ...r, note: `finished ${r.days} days ago, no coffee request yet` }));
    else rows = (await incomplete(client)).map((r) => ({ ...r, note: `joined ${r.days} days ago, missing ${missing(r, r.image).join(", ")}, ${r.reminders} reminders sent` }));
  } catch { err = "Run migrations/kave8-growth.sql in Neon first, then reload."; }
  const tab = (v, l) => <a className={v === view ? "chip" : "chip cafe"} href={"/admin/people?view=" + v}>{l}</a>;
  return (
    <main>
      <AdminNav />
      <h1>People to reach</h1>
      <p>{tab("incomplete", "Incomplete profiles")}{tab("stalled", "Finished, no coffee yet")}{tab("inactive", "Inactive 14+ days")}</p>
      {err && <p className="why">{err}</p>}
      <p><b>{rows.length}</b> {rows.length === 1 ? "person" : "people"}. A personal message works better than a mass email.</p>
      {rows.length > 0 && <><label>All emails (copy into the BCC field)<textarea readOnly rows={3} value={rows.map((r) => r.email).filter(Boolean).join(", ")} /></label>
        <ul className="people">{rows.map((r) => <li key={r.id}><div className="info"><h3>{r.name || "No name"} <small>{r.source || "unknown source"}</small></h3><p><a href={"mailto:" + r.email}>{r.email}</a></p><p><small>{r.note}</small></p></div></li>)}</ul></>}
    </main>
  );
}
