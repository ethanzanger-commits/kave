"use client";
import { useState } from "react";
import { trackEvent } from "./actions";
export default function Share({ link }) {
  const [ok, setOk] = useState(false);
  const [li, setLi] = useState(false);
  const post = "I'm meeting people over coffee through Kave, a community for professionals in Israel. It shows you why two people should meet, then you pick a café and go. If you'd like an invite, here it is: " + link;
  const text = "Hey! I'm on Kave, a new platform helping professionals across Israel meet for coffee. Thought you'd be a great addition. Join me: " + link;
  const copy = async () => { trackEvent("invite_shared"); try { await navigator.clipboard.writeText(link); setOk(true); setTimeout(() => setOk(false), 2000); } catch {} };
  const copyMsg = async () => { trackEvent("invite_shared"); try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 2000); } catch {} };
  const linkedin = async () => { trackEvent("invite_shared"); try { await navigator.clipboard.writeText(post); setLi(true); setTimeout(() => setLi(false), 6000); } catch {} window.open("https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(link), "_blank", "noopener"); };
  const share = () => (trackEvent("invite_shared"), navigator.share ? navigator.share({ text }).catch(() => {}) : copy());
  return (
    <>
      <input readOnly value={link} aria-label="Your invite link" onFocus={(e) => e.target.select()} />
      <p className="sharemsg">{text}</p>
      <button className="primary" onClick={() => { trackEvent("invite_shared"); window.open("https://wa.me/?text=" + encodeURIComponent(text)); }}>Send on WhatsApp</button>
      <p></p>
      <div className="row">
        <button type="button" onClick={linkedin}>Post on LinkedIn</button>
        <button type="button" onClick={share}>Share&hellip;</button>
        <button type="button" onClick={copy}>{ok ? "Copied" : "Copy link"}</button>
        <button type="button" onClick={copyMsg}>Copy message</button>
      </div>
      {li && <p className="sharemsg">Draft copied. Paste it into your LinkedIn post and make it yours.</p>}
    </>
  );
}
