// Run from the kave folder: node kave-update.mjs
import fs from "fs"; import path from "path";
const rd = (p) => fs.readFileSync(p, "utf8");
const wr = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); };
const sub = (p, a, b) => { const s = rd(p); if (s.includes(b)) return; if (!s.includes(a)) return console.log("SKIPPED (edit by hand):", p); wr(p, s.replace(a, b)); };

// 1. Email sign-in through your Gmail (Resend no longer needed)
sub("auth.js", 'import Resend from "next-auth/providers/resend";', 'import Nodemailer from "next-auth/providers/nodemailer";');
sub("auth.js", "Resend({ from: process.env.EMAIL_FROM })", 'Nodemailer({ server: { host: "smtp.gmail.com", port: 465, secure: true, auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD } }, from: process.env.EMAIL_FROM || process.env.GMAIL_USER })');
sub("app/page.js", 'signIn("resend"', 'signIn("nodemailer"');
wr("lib/mail.js", `import nodemailer from "nodemailer";
export async function sendMail(to, subject, text) {
  const { GMAIL_USER: user, GMAIL_APP_PASSWORD: pass } = process.env; if (!user || !pass || !to) return;
  try { await nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user, pass } }).sendMail({ from: process.env.EMAIL_FROM || user, to, subject, text }); } catch {}
}
`);
const pj = JSON.parse(rd("package.json")); pj.dependencies.nodemailer = "^6.9.16"; wr("package.json", JSON.stringify(pj, null, 1));
fs.appendFileSync(".env.example", "# Gmail sending (Google Account > Security > 2-Step Verification > App passwords)\nGMAIL_USER=\nGMAIL_APP_PASSWORD=\n");

// 2. "Use my location": only the area name is saved, never coordinates
wr("app/api/geo/route.js", `import { auth } from "@/auth";
export async function GET(req) {
  if (!(await auth())) return Response.json({}, { status: 401 });
  const u = new URL(req.url), lat = Number(u.searchParams.get("lat")), lon = Number(u.searchParams.get("lon"));
  if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return Response.json({}, { status: 400 });
  try {
    const r = await fetch(\`https://nominatim.openstreetmap.org/reverse?lat=\${lat.toFixed(3)}&lon=\${lon.toFixed(3)}&format=json&zoom=14&accept-language=en\`, { headers: { "User-Agent": "kave-app (beta)" } });
    const a = (await r.json()).address || {};
    const place = [a.neighbourhood || a.suburb || a.quarter || a.city_district, a.city || a.town || a.village].filter(Boolean).join(", ");
    return Response.json({ place });
  } catch { return Response.json({}); }
}
`);
sub("app/ProfileForm.jsx", "  const L = (label, k, ph) =>", `  function locate() {
    if (!navigator.geolocation) return setMsg("Location isn't available in this browser.");
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const j = await (await fetch(\`/api/geo?lat=\${pos.coords.latitude}&lon=\${pos.coords.longitude}\`)).json();
      if (j.place) { setD((x) => ({ ...x, neighborhood: j.place })); setMsg("Area set to " + j.place + ". Only the area name is saved, never your coordinates."); }
      else setMsg("Couldn't find your area. Type it in.");
    }, () => setMsg("Location blocked. Type your neighborhood instead."), { timeout: 10000 });
  }
  const L = (label, k, ph) =>`);
sub("app/ProfileForm.jsx", '{L("Neighborhood", "neighborhood", "e.g. Emek Refaim, Jerusalem")}', '{L("Neighborhood", "neighborhood", "e.g. Emek Refaim, Jerusalem")}\n      <button type="button" onClick={locate}>Use my location</button>');
console.log("Done. Now run: npm install");
