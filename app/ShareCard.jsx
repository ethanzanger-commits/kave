"use client";
import { useState } from "react";
import { trackEvent } from "./actions";
export default function ShareCard({ code }) {
  const [msg, setMsg] = useState("");
  const link = () => location.origin + "/s/" + code;
  const text = () => "Let's grab coffee on Kave.\n\nMeet interesting professionals, discover your local network and turn introductions into actual conversations.\n\nJoin me: " + link();
  async function linkedin() {
    trackEvent("card_shared");
    try { await navigator.clipboard.writeText(text()); setMsg("Post text copied. Paste it into LinkedIn and add a line of your own."); } catch { setMsg("Add a line of your own, then post."); }
    window.open("https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(link()), "_blank", "noopener");
  }
  async function copy() { trackEvent("card_shared"); try { await navigator.clipboard.writeText(link()); setMsg("Link copied."); } catch {} }
  return (
    <div className="card">
      <h2>Share your kave card</h2>
      <p>Invite your network. Every friend who joins earns you badges.</p>
      <img src={`/s/${code}/opengraph-image`} alt="Your kave share card: Let's grab coffee on kave" style={{ width: "100%", height: "auto", borderRadius: 16, border: "1.5px solid #f0e1d3", boxShadow: "none" }} />
      <p></p><button className="primary" onClick={linkedin}>Share on LinkedIn</button><p></p>
      <div className="row">
        <button type="button" onClick={copy}>Copy link</button>
        <button type="button" onClick={() => { trackEvent("card_shared"); window.open("https://wa.me/?text=" + encodeURIComponent("Hey! I'm on Kave, a new platform helping professionals across Israel meet for coffee. Thought you'd be a great addition. Join me: " + link())); }}>WhatsApp</button>
      </div>
      {msg && <p role="status"><b>{msg}</b></p>}
    </div>
  );
}
