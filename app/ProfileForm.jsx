"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveProfile, savePhoto } from "./actions";
import { AVAIL } from "@/lib/avail";
import { CITIES } from "@/lib/cities";
const DRAFT = "kave-profile-draft";
const SUGGEST = ["Partnerships", "Go-to-market", "Growth", "Paid media", "Product marketing", "Content", "Brand", "Sales", "Business development", "Product", "Engineering", "Design", "Data", "Fundraising"];
const nameOk = (n) => /\S+\s+\S+/.test(n || "");
const bio = (d) => [d.headline && `${d.headline}${d.company ? " at " + d.company : ""}.`, d.skills.length > 0 && `Into ${d.skills.slice(0, 3).join(", ")}.`,
  `Always up for a good coffee${d.city ? " in " + d.city : ""} and a better conversation.`].filter(Boolean).join(" ");
const addSkills = (text, cur) => [...cur, ...text.split(",").map((x) => x.trim()).filter((x) => x && !cur.some((c) => c.toLowerCase() === x.toLowerCase()))].slice(0, 50);
function check(d, photo) {
  const e = {};
  if (!photo) e.photo = "Add a photo so people know who they're meeting.";
  if (!nameOk(d.name)) e.name = "Add your first and last name.";
  if (!d.city) e.city = "Choose your city.";
  if (!d.headline?.trim()) e.headline = "Add a one-line headline.";
  if (!d.skills.length) e.skills = "Pick or add at least one skill.";
  if (!d.about?.trim()) e.about = "Write a line or two about you.";
  if (!d.ageOk) e.ageOk = "Please confirm you're 18 or older.";
  return e;
}
const LABELS = { photo: "photo", name: "full name", city: "city", headline: "headline", skills: "a skill", about: "about me", ageOk: "18+ box" };
export default function ProfileForm({ initial, image }) {
  const router = useRouter();
  const existing = !!initial.ageOk;
  const [photo, setPhoto] = useState(image || "");
  const [d, setD] = useState(() => ({ about: "", lookingFor: "", canHelp: "", workingOn: "", weekly: true, city: "", headline: "", company: "", industry: "", neighborhood: "", linkedinUrl: "", ageOk: false, ...initial,
    skills: initial.skills || [], availability: initial.availability || [], experience: initial.experience || [], education: initial.education || [] }));
  const [errs, setErrs] = useState({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [skill, setSkill] = useState("");
  const [aboutEdited, setAboutEdited] = useState(!!initial.about);
  // Draft lives on this device so a refresh or a CV import is never lost before the first save.
  useEffect(() => {
    if (existing) return;
    try { const s = JSON.parse(localStorage.getItem(DRAFT) || "null"); if (s) { setD((x) => ({ ...x, ...Object.fromEntries(Object.entries(s).filter(([k, v]) => k !== "ageOk" && v && !(Array.isArray(v) && !v.length))) })); if (s.about) setAboutEdited(true); } } catch {}
  }, [existing]);
  useEffect(() => { if (!existing) try { localStorage.setItem(DRAFT, JSON.stringify(d)); } catch {} }, [d, existing]);
  // Draft the bio for them so it is never a blocker. It stops updating the moment they type their own.
  useEffect(() => {
    if (existing || aboutEdited || !d.headline?.trim()) return;
    setD((x) => ({ ...x, about: bio(x) }));
  }, [d.headline, d.company, d.city, d.skills, aboutEdited, existing]);
  const now = check(d, photo);
  const left = Object.keys(now);
  const set = (k) => (e) => { setD((x) => ({ ...x, [k]: e.target.value })); setErrs((x) => ({ ...x, [k]: undefined })); };
  const drop = (k, i) => setD((x) => ({ ...x, [k]: x[k].filter((_, n) => n !== i) }));
  const toggleSkill = (s) => { setD((x) => ({ ...x, skills: x.skills.includes(s) ? x.skills.filter((y) => y !== s) : [...x.skills, s] })); setErrs((x) => ({ ...x, skills: undefined })); };
  const flush = () => { if (!skill.trim()) return d; const dd = { ...d, skills: addSkills(skill, d.skills) }; setD(dd); setSkill(""); setErrs((x) => ({ ...x, skills: undefined })); return dd; };
  const E = (k) => errs[k] && <p className="err" role="alert" id={"err-" + k}>{errs[k]}</p>;
  const L = (label, k, ph) => <label>{label}<input value={d[k] || ""} onChange={set(k)} placeholder={ph} aria-invalid={errs[k] ? "true" : undefined} /></label>;
  async function onFile(e) {
    const f = e.target.files[0]; if (!f) return;
    setBusy("cv"); setMsg("Reading your CV…");
    try {
      const fd = new FormData(); fd.append("file", f);
      const r = await fetch("/api/import", { method: "POST", body: fd });
      if (!r.ok) throw new Error();
      const j = await r.json();
      if (j.about) setAboutEdited(true);
      setD((x) => ({ ...x, name: nameOk(x.name) ? x.name : (j.name || x.name || ""), about: j.about || x.about, headline: j.headline || x.headline, industry: j.industry || x.industry, company: j.company || x.company,
        skills: j.skills?.length ? j.skills : x.skills, experience: j.experience?.length ? j.experience : x.experience, education: j.education?.length ? j.education : x.education }));
      setMsg("Done. We filled in what we could. Check the fields below and edit anything.");
    } catch { setMsg("Couldn't read that file. Use a PDF, a Word CV or the LinkedIn data ZIP, or fill it in by hand."); }
    setBusy(""); e.target.value = "";
  }
  async function onPhoto(e) {
    const f = e.target.files[0]; if (!f) return;
    setBusy("photo"); setMsg("Saving your photo…");
    try {
      const img = new Image(); img.src = URL.createObjectURL(f); await img.decode();
      const c = document.createElement("canvas"); c.width = c.height = 384; const m = Math.min(img.width, img.height);
      c.getContext("2d").drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, 384, 384);
      let q = 0.88, url; do { url = c.toDataURL("image/jpeg", q); q -= 0.08; } while (url.length > 78000 && q > 0.4);
      await savePhoto(url); setPhoto(url); setErrs((x) => ({ ...x, photo: undefined })); setMsg("");
    } catch { setMsg("Couldn't use that photo. Try a JPG or PNG, or take a new one."); }
    setBusy(""); e.target.value = "";
  }
  function locate() {
    if (!navigator.geolocation) return setMsg("Location isn't available here. Pick your city from the list.");
    setBusy("geo"); setMsg("Finding your city…");
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const j = await (await fetch(`/api/geo?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`)).json();
        if (j.place) { setD((x) => ({ ...x, city: j.place })); setErrs((x) => ({ ...x, city: undefined })); setMsg("City set to " + j.place + ". Only your city is saved, never your location."); }
        else setMsg("Couldn't match your city. Pick it from the list.");
      } catch { setMsg("Couldn't match your city. Pick it from the list."); }
      setBusy("");
    }, () => { setBusy(""); setMsg("Location blocked. Pick your city from the list."); }, { timeout: 10000 });
  }
  async function save(e) {
    e?.preventDefault(); if (busy === "save") return;
    const dd = flush(); const er = check(dd, photo); setErrs(er);
    const first = Object.keys(er)[0];
    if (first) {
      setMsg(`${Object.keys(er).length} thing${Object.keys(er).length > 1 ? "s" : ""} left. Marked below.`);
      setTimeout(() => document.querySelector(`#err-${first}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
      return;
    }
    setBusy("save"); setMsg("Saving…");
    try { const r = await saveProfile(dd); try { localStorage.removeItem(DRAFT); } catch {} if (r?.first) router.push("/welcome"); else setMsg("Saved."); }
    catch { setMsg("Couldn't save. Check your connection and tap again. Nothing you typed is lost."); }
    setBusy("");
  }
  const sb = busy === "save";
  return (
    <form onSubmit={save} noValidate>
      {!existing && <label className="drop">Skip the typing: upload your CV<br /><small>PDF, Word, or your LinkedIn data ZIP. Optional.</small><input type="file" accept=".zip,.pdf,.docx" onChange={onFile} disabled={busy === "cv"} /></label>}

      <section>
        <h2>You</h2>
        <div className="who" style={{ margin: ".6rem 0" }}>
          {photo ? <img src={photo} alt="Your photo" width="72" height="72" referrerPolicy="no-referrer" /> : <div className="avatar">{(d.name || "?")[0]}</div>}
          <label style={{ margin: 0, flex: 1 }}>{photo ? "Change photo" : "Add a photo"}<input type="file" accept="image/*" onChange={onPhoto} disabled={busy === "photo"} aria-invalid={errs.photo ? "true" : undefined} /></label>
        </div>{E("photo")}
        {L("Your name (first and last)", "name", "e.g. Dana Cohen")}{E("name")}
        <label>City<select value={d.city || ""} onChange={set("city")} aria-invalid={errs.city ? "true" : undefined}><option value="">Choose your city</option>{CITIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>{E("city")}
        <p><button type="button" onClick={locate} disabled={busy === "geo"} aria-busy={busy === "geo" ? "true" : undefined}>{busy === "geo" ? "Finding…" : "Use my location instead"}</button></p>
      </section>

      <section>
        <h2>What you do</h2>
        {L("Headline", "headline", "e.g. Partnerships lead at a fintech")}{E("headline")}
        <label>Skills</label>
        <p>{SUGGEST.map((s) => <button type="button" key={s} className={"chip" + (d.skills.includes(s) ? " on" : "")} aria-pressed={d.skills.includes(s)} onClick={() => toggleSkill(s)}>{s}</button>)}</p>
        <input value={skill} onChange={(e) => { setSkill(e.target.value); setErrs((x) => ({ ...x, skills: undefined })); }} placeholder="Something else? Type it and press Enter" aria-invalid={errs.skills ? "true" : undefined}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); flush(); } }} />{E("skills")}
        {d.skills.filter((s) => !SUGGEST.includes(s)).length > 0 && <p>{d.skills.filter((s) => !SUGGEST.includes(s)).map((s) => <span className="chip" key={s}>{s} <button type="button" aria-label={"Remove " + s} onClick={() => toggleSkill(s)}>×</button></span>)}</p>}
      </section>

      <section>
        <h2>About you</h2>
        <label>About me{!existing && !aboutEdited && d.about ? " (we drafted this, edit freely)" : ""}<textarea maxLength={600} value={d.about || ""} onChange={(e) => { setAboutEdited(true); set("about")(e); }} placeholder="A few friendly, professional lines about you" aria-invalid={errs.about ? "true" : undefined} /></label>{E("about")}
      </section>

      <details open={existing}>
        <summary>Optional extras: availability, LinkedIn, what you're working on</summary>
        <fieldset><legend>When can you grab coffee?</legend>{AVAIL.map(([k, l]) => <label key={k} className="check"><input type="checkbox" checked={d.availability.includes(k)} onChange={(e) => setD((x) => ({ ...x, availability: e.target.checked ? [...x.availability, k] : x.availability.filter((y) => y !== k) }))} />{l}</label>)}</fieldset>
        {L("LinkedIn URL (shown on your profile)", "linkedinUrl", "https://www.linkedin.com/in/you")}
        {L("Company", "company")}
        {L("Industry", "industry")}
        <label>What I'm working on<textarea rows={2} maxLength={200} value={d.workingOn || ""} onChange={set("workingOn")} placeholder="A project, a launch, a problem you're chewing on" /></label>
        <label>What I can help with<textarea rows={2} maxLength={160} value={d.canHelp || ""} onChange={set("canHelp")} placeholder="Ad budgets, partnership deals, hiring in Tel Aviv" /></label>
        <label>What I'd like to learn<textarea rows={2} maxLength={160} value={d.lookingFor || ""} onChange={set("lookingFor")} placeholder="How others run growth, intros to fintech marketers" /></label>
        {d.experience.length > 0 && <fieldset><legend>Experience from your CV</legend>{d.experience.map((x, i) => <p key={i}>{x.title} at {x.company} <button type="button" onClick={() => drop("experience", i)}>Remove</button></p>)}</fieldset>}
        {d.education.length > 0 && <fieldset><legend>Education from your CV</legend>{d.education.map((x, i) => <p key={i}>{x.degree} {x.school} <button type="button" onClick={() => drop("education", i)}>Remove</button></p>)}</fieldset>}
        <label className="check"><input type="checkbox" checked={d.weekly !== false} onChange={(e) => setD((x) => ({ ...x, weekly: e.target.checked }))} />Email me a weekly coffee pick</label>
        <label className="check"><input type="checkbox" checked={!!d.showOnHome} onChange={(e) => setD((x) => ({ ...x, showOnHome: e.target.checked }))} />Show my photo, first name and headline on the Kave homepage</label>
      </details>

      <label className="check"><input type="checkbox" checked={!!d.ageOk} onChange={(e) => { setD((x) => ({ ...x, ageOk: e.target.checked })); setErrs((x) => ({ ...x, ageOk: undefined })); }} aria-invalid={errs.ageOk ? "true" : undefined} />I'm 18 or older and agree to the <a href="/terms">Terms</a></label>{E("ageOk")}

      <div className="sticky">
        {msg && <p role="status" style={{ margin: "0 0 .5rem" }}><b>{msg}</b></p>}
        {!existing && !msg && left.length > 0 && <p style={{ margin: "0 0 .5rem" }}><small>Still needed: {left.map((k) => LABELS[k]).join(", ")}.</small></p>}
        <button type="submit" className="primary" disabled={sb} aria-busy={sb ? "true" : undefined}>{sb ? "Saving…" : existing ? "Save changes" : "Create my profile"}</button>
      </div>
    </form>
  );
}
