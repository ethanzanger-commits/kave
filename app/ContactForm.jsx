"use client";
import { useState } from "react";
const TOPICS = ["Question", "Something isn't working", "Feedback or idea", "Report a member", "Partnership or press"];
export default function ContactForm({ name = "", email = "" }) {
  const [st, setSt] = useState("idle");
  const id = process.env.NEXT_PUBLIC_FORMSPREE_ID;
  async function send(e) {
    e.preventDefault();
    const f = new FormData(e.target);
    if (f.get("_gotcha")) return;
    f.set("_subject", "Kave contact: " + f.get("topic"));
    setSt("sending");
    try { const r = await fetch("https://formspree.io/f/" + id, { method: "POST", headers: { Accept: "application/json" }, body: f }); setSt(r.ok ? "done" : "error"); } catch { setSt("error"); }
  }
  if (st === "done") return <div className="card"><h2>Message sent</h2><p>Thanks. We read every message and reply within two working days.</p></div>;
  if (!id) return <div className="card"><p>The contact form isn't set up yet.</p></div>;
  return (
    <form onSubmit={send} className="card">
      <input type="text" name="_gotcha" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px" }} />
      <label>Your name<input name="name" defaultValue={name} required maxLength={80} /></label>
      <label>Your email<input name="email" type="email" defaultValue={email} required maxLength={120} /></label>
      <label>What is this about?<select name="topic">{TOPICS.map((t) => <option key={t}>{t}</option>)}</select></label>
      <label>Message<textarea name="message" required minLength={10} maxLength={2000} placeholder="Tell us what's on your mind" /></label>
      {st === "error" && <p className="why">Something went wrong. Please try again in a moment.</p>}
      <p></p><button className="primary" disabled={st === "sending"}>{st === "sending" ? "Sending..." : "Send message"}</button>
    </form>
  );
}
