"use client";
import { useEffect, useState } from "react";
import { trackEvent } from "./actions";
import LinkedInButton from "./LinkedInButton";
export default function ShareCard({ code }) {
  const [msg, setMsg] = useState("");
  const [post, setPost] = useState("");
  const link = () => location.origin + "/s/" + code;
  useEffect(() => { setPost("I just joined Kave, a coffee-matching community for Israeli tech professionals.\n\nIf you'd like to meet interesting people outside your usual circle, join me: " + location.origin + "/s/" + code); }, [code]);
  async function copy() { trackEvent("card_shared"); try { await navigator.clipboard.writeText(link()); setMsg("Link copied."); } catch { setMsg("Couldn't copy. Press and hold the link to copy it."); } }
  return (
    <div className="card">
      <h2>Share your kave card</h2>
      <p>Invite your network. Every friend who joins earns you badges.</p>
      <img src={`/s/${code}/opengraph-image`} alt="Your kave share card: Let's grab coffee on kave" style={{ width: "100%", height: "auto", borderRadius: 16, border: "1.5px solid #f0e1d3", boxShadow: "none" }} />
      <label>Your LinkedIn post (edit it, make it yours)<textarea rows={5} maxLength={600} value={post} onChange={(e) => setPost(e.target.value)} /></label>
      <p><LinkedInButton className="primary" text={post}>Post on LinkedIn</LinkedInButton></p>
      <small>The text is copied too. If LinkedIn opens with an empty box, just paste it.</small>
      <div className="row" style={{ marginTop: ".6rem" }}>
        <button type="button" onClick={copy}>Copy link</button>
        <button type="button" onClick={() => { trackEvent("card_shared"); window.open("https://wa.me/?text=" + encodeURIComponent("Hey! I'm on Kave, a new platform helping professionals across Israel meet for coffee. Thought you'd be a great addition. Join me: " + link())); }}>WhatsApp</button>
      </div>
      {msg && <p role="status"><b>{msg}</b></p>}
    </div>
  );
}
