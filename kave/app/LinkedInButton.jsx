"use client";
import { trackEvent } from "./actions";
// Opens LinkedIn's post box with the text filled in where the device allows it, and always copies the text so it can be pasted.
export default function LinkedInButton({ text, className, children = "Share on LinkedIn" }) {
  const go = () => {
    trackEvent("linkedin_shared");
    try { navigator.clipboard?.writeText(text); } catch {}
    window.open("https://www.linkedin.com/feed/?shareActive=true&text=" + encodeURIComponent(text), "_blank", "noopener");
  };
  return <button type="button" className={className} onClick={go}>{children}</button>;
}
