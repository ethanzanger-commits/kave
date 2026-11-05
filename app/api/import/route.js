import JSZip from "jszip";
import Papa from "papaparse";
import { auth } from "@/auth";
import { parseCv } from "@/lib/cv";
export const runtime = "nodejs";
async function aiParse(text) {
  const k = process.env.ANTHROPIC_API_KEY; if (!k) return null;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": k, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: "claude-haiku-5-5", max_tokens: 2000, messages: [{ role: "user", content: 'Reply with JSON only. Keys: headline, industry, company, skills (strings), experience [{title,company,start,end}], education [{school,degree,start,end}]. end is "" if current. CV:\n' + text.slice(0, 15000) }] }) });
    return JSON.parse((await r.json()).content[0].text.replace(/```json|```/g, ""));
  } catch { return null; }
}
const cv = async (t) => (await aiParse(t)) || parseCv(t);
async function rows(zip, name) {
  const f = zip.file(new RegExp(`(^|/)${name}\\.csv$`, "i"))[0];
  return f ? Papa.parse(await f.async("string"), { header: true, skipEmptyLines: true }).data : [];
}
async function fromLinkedInZip(buf) {
  const zip = await JSZip.loadAsync(buf);
  const [pos, edu, sk, pr] = await Promise.all(["Positions", "Education", "Skills", "Profile"].map((n) => rows(zip, n)));
  const experience = pos.map((r) => ({ company: r["Company Name"], title: r["Title"], start: r["Started On"], end: r["Finished On"] }));
  const current = experience.find((e) => !e.end) || experience[0];
  return { headline: pr[0]?.["Headline"] || "", industry: pr[0]?.["Industry"] || "", company: current?.company || "",
    experience, skills: sk.map((r) => r["Name"]).filter(Boolean),
    education: edu.map((r) => ({ school: r["School Name"], degree: r["Degree Name"], start: r["Start Date"], end: r["End Date"] })) };
}
// Parses in memory and returns JSON. Nothing is stored until the user reviews and saves.
export async function POST(req) {
  if (!(await auth())) return Response.json({ error: "Sign in first" }, { status: 401 });
  const file = (await req.formData()).get("file");
  if (!file || file.size > 25e6) return Response.json({ error: "Bad file" }, { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop().toLowerCase();
  try {
    if (ext === "zip") return Response.json(await fromLinkedInZip(buf));
    if (ext === "pdf") {
      const pdf = (await import("pdf-parse/lib/pdf-parse.js")).default;
      return Response.json(await cv((await pdf(buf)).text));
    }
    if (ext === "docx") {
      const mammoth = (await import("mammoth")).default;
      return Response.json(await cv((await mammoth.extractRawText({ buffer: buf })).value));
    }
  } catch { return Response.json({ error: "Unreadable file" }, { status: 400 }); }
  return Response.json({ error: "Use a ZIP, PDF or DOCX" }, { status: 400 });
}
