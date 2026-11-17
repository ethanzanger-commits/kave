"use client";
import { useEffect, useState } from "react";
import { trackEvent } from "../actions";
const STYLES = { casual: "Casual", pro: "Professional", reason: "Specific reason" };
const build = (style, f, reason, link) => {
  const hi = f ? `Hey ${f}` : "Hey", why = reason.trim();
  if (style === "pro") return `Hi${f ? " " + f : ""}, I'm part of Kave, a community that matches professionals for in-person coffee across Israel. ${why ? `Given ${why}, ` : ""}I think you'd meet useful people there. Here's my invite: ${link}`;
  if (style === "reason") return `${hi}, you should meet some of the people on Kave. ${why || "It makes it easy to meet someone new over coffee."} Here's my link, it takes two minutes to join: ${link}`;
  return `${hi}, I've been meeting people through Kave, a coffee-matching community for Israeli tech. I thought of you${why ? " because " + why : ""}. Join me: ${link}`;
};
export default function PersonalInvite({ link }) {
  const [friend, setFriend] = useState(""), [reason, setReason] = useState(""), [style, setStyle] = useState("casual"), [text, setText] = useState(""), [edited, setEdited] = useState(false), [msg, setMsg] = useState("");
  useEffect(() => { if (!edited) setText(build(style, friend.trim().split(" ")[0], reason, link)); }, [friend, reason, style, edited, link]);
  const done = (m) => { trackEvent("invite_shared"); setMsg(m); };
  const ch = (c) => text.split(link).join(link + "&src=invite-" + c), enc = (c) => encodeURIComponent(ch(c));
  const send = () => { if (navigator.share) navigator.share({ text: ch("share") }).then(() => done("Shared.")).catch(() => {}); else copy(); };
  const copy = async () => { try { await navigator.clipboard.writeText(ch("copy")); done("Message copied. Paste it wherever you like."); } catch { setMsg("Couldn't copy. Press and hold the message to copy it."); } };
  return (
    <div className="card">
      <h2>Invite someone you know</h2>
      <p>A personal note works far better than a bare link. Pick a style, add a reason, and send.</p>
      <label>Their first name (optional)<input value={friend} onChange={(e) => setFriend(e.target.value)} placeholder="e.g. Dana" /></label>
      <label>Why them? (optional)<input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. you're new to Tel Aviv, or you work in fintech" /></label>
      <p>{Object.entries(STYLES).map(([k, l]) => <button type="button" key={k} className={"chip" + (style === k ? " on" : "")} aria-pressed={style === k} onClick={() => { setStyle(k); setEdited(false); }}>{l}</button>)}</p>
      <label>Your message<textarea rows={5} value={text} onChange={(e) => { setText(e.target.value); setEdited(true); }} /></label>
      <p><button type="button" className="primary" onClick={send}>Send</button></p>
      <div className="row">
        <button type="button" onClick={() => { done("Opening WhatsApp."); window.open("https://wa.me/?text=" + enc("whatsapp"), "_blank", "noopener"); }}>WhatsApp</button>
        <button type="button" onClick={() => { done("Opening your messages."); location.href = "sms:?&body=" + enc("sms"); }}>Text</button>
        <button type="button" onClick={() => { done("Opening your email."); location.href = "mailto:?subject=" + encodeURIComponent("Thought of you for Kave") + "&body=" + enc("email"); }}>Email</button>
        <button type="button" onClick={() => { try { navigator.clipboard.writeText(ch("linkedin")); } catch {} done("Message copied. Paste it into a LinkedIn message."); window.open("https://www.linkedin.com/messaging/", "_blank", "noopener"); }}>LinkedIn</button>
        <button type="button" onClick={copy}>Copy</button>
      </div>
      {msg && <p role="status"><b>{msg}</b></p>}
    </div>
  );
}
