"use client";
import { useState } from "react";
import LinkedInButton from "../LinkedInButton";
export default function ContactsUpload({ invite }) {
  const [res, setRes] = useState(null), [msg, setMsg] = useState(""), [busy, setBusy] = useState(false);
  async function onFile(e) {
    const f = e.target.files[0]; if (!f) return;
    setBusy(true); setRes(null); setMsg("Checking your contacts…");
    try {
      const fd = new FormData(); fd.append("file", f);
      const r = await fetch("/api/contacts", { method: "POST", body: fd }); const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setRes(j); setMsg("");
    } catch (err) { setMsg(err.message || "Couldn't read that file."); }
    setBusy(false); e.target.value = "";
  }
  return (
    <div>
      <label className="drop">Upload Connections.csv (or the whole LinkedIn data ZIP)<input type="file" accept=".csv,.zip" onChange={onFile} disabled={busy} /></label>
      {msg && <p role="status"><b>{msg}</b></p>}
      {res && (<>
        <h2>{res.found.length === 0 ? "No matches yet" : `${res.found.length} of your ${res.total} contacts ${res.found.length === 1 ? "is" : "are"} on Kave`}</h2>
        {res.found.length > 0 && <ul className="people">{res.found.map((m) => <li key={m.id}><div className="info"><h3><a href={"/member/" + m.id}>{m.name}</a></h3><p>{[m.headline, m.company, m.city].filter(Boolean).join(", ")}</p><small>Matched by {m.how}</small></div></li>)}</ul>}
        <div className="card"><h2>Bring the rest</h2><p>{res.total - res.found.length} of your contacts aren't on Kave, as far as we can tell. Post an invite and they can join through your link.</p>
          <LinkedInButton className="primary" text={"I'm on Kave, a coffee-matching community for Israeli tech. If you'd like to meet new people over coffee, join me: " + invite}>Invite my network on LinkedIn</LinkedInButton></div>
      </>)}
    </div>
  );
}
