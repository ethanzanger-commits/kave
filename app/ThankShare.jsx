"use client";
import { useEffect, useState } from "react";
import LinkedInButton from "./LinkedInButton";
export default function ThankShare({ first, city, code }) {
  const [mention, setMention] = useState(false), [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(location.origin), []);
  const text = `${mention ? `Just had a great coffee with ${first}${city ? " in " + city : ""}, someone I met through Kave.` : "Just had a great coffee with someone I met through Kave."}\n\nIt's easy to stay inside the same circle. Kave matches professionals across Israel for in-person coffee, and it's been worth it.\n\nIf you'd like to meet someone new: ${origin}/s/${code}?src=thanks-linkedin`;
  return (
    <div className="why">
      <b>Say thanks on LinkedIn</b>
      <label className="check"><input type="checkbox" checked={mention} onChange={(e) => setMention(e.target.checked)} />Mention {first} by name{mention ? " (tag them after you post)" : ""}</label>
      <LinkedInButton text={text}>Post a thank-you</LinkedInButton>
    </div>
  );
}
