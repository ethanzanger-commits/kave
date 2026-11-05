"use client";
import { useState } from "react";
import { saveProfile } from "./actions";
export default function ProfileForm({ initial }) {
  const [d, setD] = useState({ headline: "", company: "", industry: "", neighborhood: "", linkedinUrl: "", skills: [], experience: [], education: [], ...initial });
  const [msg, setMsg] = useState("");
  const set = (k) => (e) => setD({ ...d, [k]: e.target.value });
  const drop = (k, i) => setD({ ...d, [k]: d[k].filter((_, n) => n !== i) });
  async function onFile(e) {
    const f = e.target.files[0]; if (!f) return;
    const fd = new FormData(); fd.append("file", f);
    const r = await fetch("/api/import", { method: "POST", body: fd });
    if (!r.ok) return setMsg("Couldn't read that file. Use the LinkedIn data ZIP, or a PDF or Word CV.");
    const j = await r.json();
    setD({ ...d, headline: j.headline || d.headline, industry: j.industry || d.industry, company: j.company || d.company,
      skills: j.skills.length ? j.skills : d.skills, experience: j.experience.length ? j.experience : d.experience,
      education: j.education.length ? j.education : d.education });
    setMsg("Imported. CV imports are best-effort, so check the fields, remove anything you don't want, then save.");
  }
  async function save(e) { e.preventDefault(); await saveProfile(d); setMsg("Saved."); }
  const L = (label, k, ph) => <label>{label}<input value={d[k] || ""} onChange={set(k)} placeholder={ph} /></label>;
  return (
    <form onSubmit={save}>
      <label>Import your LinkedIn data ZIP or your CV (PDF or Word, optional)
        <input type="file" accept=".zip,.pdf,.docx" onChange={onFile} /></label>
      {msg && <p role="status">{msg}</p>}
      {L("Neighborhood", "neighborhood", "e.g. Emek Refaim, Jerusalem")}
      {L("Headline", "headline", "What you do")}
      {L("Company", "company")}
      {L("Industry", "industry")}
      {L("LinkedIn URL (optional)", "linkedinUrl", "https://www.linkedin.com/in/you")}
      <label>Skills<input value={d.skills.join(", ")} onChange={(e) => setD({ ...d, skills: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} /></label>
      {d.experience.length > 0 && <fieldset><legend>Experience</legend>
        {d.experience.map((x, i) => <p key={i}>{x.title} at {x.company} <button type="button" onClick={() => drop("experience", i)}>Remove</button></p>)}</fieldset>}
      {d.education.length > 0 && <fieldset><legend>Education</legend>
        {d.education.map((x, i) => <p key={i}>{x.degree} {x.school} <button type="button" onClick={() => drop("education", i)}>Remove</button></p>)}</fieldset>}
      <button className="primary">Save profile</button>
    </form>
  );
}
