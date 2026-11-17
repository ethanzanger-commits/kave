"use client";
import { useState } from "react";
import { trackEvent } from "./actions";
export default function Share({ link }) {
  const [ok, setOk] = useState(false);
  const text = "Hey! I'm on Kave, a new platform helping professionals across Israel meet for coffee. Thought you'd be a great addition. Join me: " + link;
  const copy = async () => { trackEvent("invite_shared"); try { await navigator.clipboard.writeText(link + "&src=invite-copy"); setOk(true); setTimeout(() => setOk(false), 2000); } catch {} };
  const copyMsg = async () => { trackEvent("invite_shared"); try { await navigator.clipboard.writeText(text.split(link).join(link + "&src=invite-copy")); setOk(true); setTimeout(() => setOk(false), 2000); } catch {} };
  const share = () => (trackEvent("invite_shared"), navigator.share ? navigator.share({ text: text.split(link).join(link + "&src=invite-share") }).catch(() => {}) : copy());
  return (
    <>
      <input readOnly value={link} aria-label="Your invite link" onFocus={(e) => e.target.select()} />
      <p></p><button className="primary" onClick={share}>Invite friends</button>
      <p></p>
      <div className="row">
        <button type="button" onClick={copy}>{ok ? "Copied!" : "Copy link"}</button>
        <button type="button" onClick={copyMsg}>Copy message</button>
        <button type="button" onClick={() => { trackEvent("invite_shared"); window.open("https://wa.me/?text=" + encodeURIComponent(text.split(link).join(link + "&src=invite-whatsapp"))); }}>WhatsApp</button>
      </div>
    </>
  );
}
