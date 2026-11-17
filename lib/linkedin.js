// Accepts "linkedin.com/in/x", "www.linkedin.com/in/x/?trk=...", "il.linkedin.com/in/x" and returns one clean https URL, or null.
export function cleanLinkedIn(v) {
  let t = String(v || "").trim(); if (!t) return null;
  if (!/^https?:\/\//i.test(t)) t = "https://" + t.replace(/^\/+/, "");
  try {
    const u = new URL(t);
    if (!/(^|\.)linkedin\.com$/i.test(u.hostname)) return null;
    const m = u.pathname.match(/^\/in\/([^/?#]+)/i); if (!m) return null;
    return "https://www.linkedin.com/in/" + m[1].slice(0, 100);
  } catch { return null; }
}
export const liKey = (v) => { const c = cleanLinkedIn(v); try { return c ? decodeURIComponent(c).toLowerCase() : ""; } catch { return c ? c.toLowerCase() : ""; } };
