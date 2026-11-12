"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveProfile, savePhoto } from "./actions";
import { AVAIL } from "@/lib/avail";
import { CITIES } from "@/lib/cities";
const draft = (d) => [d.headline && `${d.headline}${d.company ? " at " + d.company : ""}.`, d.skills.length > 0 && `Into ${d.skills.slice(0, 3).join(", ")}.`,
  `Always up for a good coffee${d.city ? " in " + d.city : ""} and a better conversation.`].filter(Boolean).join(" ");
export default function ProfileForm({ initial, image }) {
  const [photo, setPhoto] = useState(image || "");
  const router = useRouter();
  const [d, setD] = useState({ about: "", lookingFor: "", canHelp: "", workingOn: "", weekly: true, city: "", headline: "", company: "", industry: "", neighborhood: "", linkedinUrl: "", ageOk: false, ...initial,
    skills: initial.skills || [], availability: initial.availability || [], experience: initial.experience || [], education: initial.education || [] });
  const [msg, setMsg] = useState("");
  const set = (k) => (e) => setD({ ...d, [k]: e.target.value });
  const drop = (k, i) => setD({ ...d, [k]: d[k].filter((_, n) => n !== i) });
  async function onFile(e) {
    const f = e.target.files[0]; if (!f) return;
    setMsg("Reading your CV…");
    const fd = new FormData(); fd.append("file", f);
    const r = await fetch("/api/import", { method: "POST", body: fd });
    if (!r.ok) return setMsg("Couldn't read that file. Use a PDF, Word CV or the LinkedIn data ZIP.");
    const j = await r.json();
    setD({ ...d, name: /\S+\s+\S+/.test(d.name || "") ? d.name : (j.name || d.name || ""), about: j.about || d.about, headline: j.headline || d.headline, industry: j.industry || d.industry, company: j.company || d.company,
      skills: j.skills?.length ? j.skills : d.skills, experience: j.experience?.length ? j.experience : d.experience, education: j.education?.length ? j.education : d.education });
    setMsg("Done! We filled in your skills, jobs and a bio. Tweak anything, then save.");
  }
  async function onPhoto(e) {
    const f = e.target.files[0]; if (!f) return;
    const img = new Image(); img.src = URL.createObjectURL(f); await img.decode();
    const c = document.createElement("canvas"); c.width = c.height = 192; const m = Math.min(img.width, img.height);
    c.getContext("2d").drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, 192, 192);
    try { const url = c.toDataURL("image/jpeg", 0.8); await savePhoto(url); setPhoto(url); setMsg("Photo saved."); } catch { setMsg("Couldn't save that photo."); }
  }
  function locate() {
    if (!navigator.geolocation) return setMsg("Location isn't available in this browser.");
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const j = await (await fetch(`/api/geo?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`)).json();
      if (j.place) { setD((x) => ({ ...x, city: j.place })); setMsg("City set to " + j.place + ". Only your city is saved, never your location."); }
      else setMsg("Couldn't match your city. Pick it from the list.");
    }, () => setMsg("Location blocked. Pick your city from the list."), { timeout: 10000 });
  }
  async function save(e) { e.preventDefault(); setMsg("Saving…"); try { const r = await saveProfile(d); if (r?.first) router.push("/welcome"); else setMsg("Saved ✓ Your profile is up to date."); } catch { setMsg("Couldn't save. Check the fields above and try again."); } }
  const need = [!/\S+\s+\S+/.test(d.name || "") && "first and last name", !photo && "profile photo", !d.city && "city", !d.headline?.trim() && "headline", !d.about?.trim() && "about me", d.skills.length === 0 && "at least one skill", !d.ageOk && "18+ confirmation"].filter(Boolean);
  const L = (label, k, ph) => <label>{label}<input value={d[k] || ""} onChange={set(k)} placeholder={ph} /></label>;
  return (
    <form onSubmit={save}>
      {L("Your name (first and last)", "name", "e.g. Dana Cohen")}
      <label className="drop">Drop your CV and we'll do the rest<br /><small>PDF, Word, or your LinkedIn data ZIP</small>
        <input type="file" accept=".zip,.pdf,.docx" onChange={onFile} /></label>
            <label>Profile photo (required){photo && <img src={photo} alt="Your photo" width="72" height="72" style={{ display: "block", margin: ".4rem 0" }} />}<input type="file" accept="image/*" onChange={onPhoto} /></label>
      <label>City<select value={d.city || ""} onChange={set("city")}><option value="">Choose your city</option>{CITIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
      <button type="button" onClick={locate}>Use my location</button>
      {L("Headline", "headline", "What you do, in a line")}
      <label>About me<textarea maxLength={600} value={d.about || ""} onChange={set("about")} placeholder="A few friendly, professional lines about you" /></label>
      <button type="button" onClick={() => setD({ ...d, about: draft(d) })}>Suggest a bio</button>
      <label>What I'm working on<textarea rows={2} maxLength={200} value={d.workingOn || ""} onChange={set("workingOn")} placeholder="A project, a launch, a problem you're chewing on" /></label>
      <label>What I can help with<textarea rows={2} maxLength={160} value={d.canHelp || ""} onChange={set("canHelp")} placeholder="Ad budgets, partnership deals, hiring in Tel Aviv" /></label>
      <label>What I'd like to learn<textarea rows={2} maxLength={160} value={d.lookingFor || ""} onChange={set("lookingFor")} placeholder="How others run growth, intros to fintech marketers" /></label>
      {L("Company", "company")}
      {L("Industry", "industry")}
      <label>Skills</label>
      <p>{d.skills.map((s, i) => <span className="chip" key={s + i}>{s} <button type="button" aria-label={"Remove " + s} onClick={() => drop("skills", i)}>×</button></span>)}</p>
      <input placeholder="Add a skill, press Enter" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const v = e.target.value.trim(); if (v && !d.skills.includes(v)) setD({ ...d, skills: [...d.skills, v] }); e.target.value = ""; } }} />
      {L("LinkedIn URL (optional)", "linkedinUrl", "https://www.linkedin.com/in/you")}
      {d.experience.length > 0 && <fieldset><legend>Experience</legend>
        {d.experience.map((x, i) => <p key={i}>{x.title} at {x.company} <button type="button" onClick={() => drop("experience", i)}>Remove</button></p>)}</fieldset>}
      {d.education.length > 0 && <fieldset><legend>Education</legend>
        {d.education.map((x, i) => <p key={i}>{x.degree} {x.school} <button type="button" onClick={() => drop("education", i)}>Remove</button></p>)}</fieldset>}
      <fieldset><legend>When can you grab coffee?</legend>{AVAIL.map(([k, l]) => <label key={k} style={{ margin: ".3rem 0" }}><input type="checkbox" checked={d.availability.includes(k)} onChange={(e) => setD({ ...d, availability: e.target.checked ? [...d.availability, k] : d.availability.filter((x) => x !== k) })} style={{ display: "inline", width: "auto", marginRight: ".5rem" }} />{l}</label>)}</fieldset>
      <label><input type="checkbox" checked={!!d.showOnHome} onChange={(e) => setD({ ...d, showOnHome: e.target.checked })} style={{ display: "inline", width: "auto", marginRight: ".5rem" }} />Show my photo, first name and headline on the Kave homepage (optional)</label>
      <label><input type="checkbox" checked={d.weekly !== false} onChange={(e) => setD({ ...d, weekly: e.target.checked })} style={{ display: "inline", width: "auto", marginRight: ".5rem" }} />Email me a weekly coffee pick</label>
      <label><input type="checkbox" checked={!!d.ageOk} onChange={(e) => setD({ ...d, ageOk: e.target.checked })} style={{ display: "inline", width: "auto", marginRight: ".5rem" }} />I'm 18 or older and agree to the <a href="/terms">Terms</a></label>
      <div className="sticky">
        {msg && <p role="status" style={{ margin: "0 0 .5rem" }}><b>{msg}</b></p>}
        {need.length > 0 && <p className="why" style={{ margin: "0 0 .5rem" }}>Still needed: {need.join(", ")}</p>}
        <button className="primary" disabled={need.length > 0}>Save profile</button>
      </div>
    </form>
  );
}
