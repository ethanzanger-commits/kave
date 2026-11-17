"use client";
import { useEffect, useState } from "react";
import LinkedInButton from "./LinkedInButton";
import { trackEvent } from "./actions";
export default function BadgeShare({ code, label }) {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(location.origin), []);
  const text = `I'm a ${label} on Kave, a coffee-matching community for Israeli tech. Meeting new people over coffee has been worth it.\n\n${origin}/b/${code}?src=badge-linkedin`;
  return (
    <div className="card">
      <h2>Share your badge</h2>
      <img src={`/b/${code}/opengraph-image`} alt={`Your Kave badge: ${label}`} width="1200" height="630" style={{ width: "100%", height: "auto", border: "1.5px solid var(--ink)" }} />
      <p><LinkedInButton className="primary" text={text}>Post my badge on LinkedIn</LinkedInButton></p>
      <div className="row">
        <button type="button" onClick={() => { trackEvent("invite_shared"); window.open("https://wa.me/?text=" + encodeURIComponent(text.replace("badge-linkedin", "badge-whatsapp")), "_blank", "noopener"); }}>WhatsApp</button>
        <a href={`/b/${code}/opengraph-image`} download={`kave-badge.png`}>Download image</a>
      </div>
      <p><small>The post links to a page that shows your badge as a picture in the LinkedIn preview.</small></p>
    </div>
  );
}
