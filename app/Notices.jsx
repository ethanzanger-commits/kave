import { auth } from "@/auth";
import { client } from "@/db";
import { dismissNotice } from "./actions";
import SubmitButton from "./SubmitButton";
// Unread notices appear under the menu on every page until dismissed.
export default async function Notices() {
  let rows = [];
  try { const s = await auth(); if (s?.user?.id) rows = await client`select id, text, link from notice where "userId" = ${s.user.id} and "readAt" is null order by "at" desc limit 3`; } catch {}
  return rows.map((r) => (
    <div className="why" role="status" key={r.id} style={{ display: "flex", gap: ".6rem", alignItems: "center", justifyContent: "space-between" }}>
      <span>{r.link ? <a href={r.link}>{r.text}</a> : r.text}</span>
      <form action={dismissNotice.bind(null, r.id)}><SubmitButton style={{ width: "auto", minHeight: 0, padding: ".2rem .6rem", fontSize: ".8rem" }} aria-label="Dismiss">Dismiss</SubmitButton></form>
    </div>
  ));
}
