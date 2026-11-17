import Papa from "papaparse";
import { liKey } from "@/lib/linkedin";
const norm = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\d ]/gu, "").replace(/\s+/g, " ").trim();
// LinkedIn's Connections.csv starts with a few lines of notes before the real header row.
export function parseConnections(text) {
  const lines = String(text || "").replace(/^\uFEFF/, "").split(/\r?\n/);
  const i = lines.findIndex((l) => /^"?First Name"?\s*,/i.test(l));
  return i < 0 ? [] : Papa.parse(lines.slice(i).join("\n"), { header: true, skipEmptyLines: true }).data;
}
// Finds members among someone's connections. Strong signals only: the LinkedIn profile URL, the email, or full name plus company.
export function matchContacts(conns, members) {
  const byUrl = new Map(), byEmail = new Map(), byName = new Map();
  for (const m of members) {
    const k = liKey(m.linkedinUrl); if (k) byUrl.set(k, m);
    if (m.email) byEmail.set(m.email.toLowerCase(), m);
    const n = norm(m.name); if (n.includes(" ")) byName.set(n, [...(byName.get(n) || []), m]);
  }
  const found = new Map();
  for (const c of conns) {
    const url = byUrl.get(liKey(c["URL"])), em = c["Email Address"] && byEmail.get(String(c["Email Address"]).toLowerCase());
    let hit = url ? [url, "LinkedIn profile"] : em ? [em, "email"] : null;
    if (!hit) {
      const co = norm(c["Company"]);
      const cand = (byName.get(norm(`${c["First Name"] || ""} ${c["Last Name"] || ""}`)) || []).find((m) => co && norm(m.company) && (norm(m.company).includes(co) || co.includes(norm(m.company))));
      if (cand) hit = [cand, "name and company"];
    }
    if (hit && !found.has(hit[0].id)) found.set(hit[0].id, { ...hit[0], how: hit[1] });
  }
  return [...found.values()];
}
