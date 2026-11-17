import { cityOf } from "@/lib/place";
import { overlap } from "@/lib/avail";
const low = (x) => String(x).toLowerCase().trim();
// Skills that mean the same thing for matching purposes ("GTM" and "Go-to-market" are one skill).
const GROUPS = [["partnerships", "partnership", "business development", "bd", "alliances", "channel partnerships"], ["go-to-market", "gtm", "go to market", "growth", "growth marketing"],
  ["paid media", "performance marketing", "ppc", "paid social", "media buying", "paid"], ["product marketing", "pmm"], ["content", "content marketing", "copywriting"], ["brand", "branding"],
  ["sales", "sdr", "account executive"], ["data", "analytics", "bi"], ["fundraising", "investor relations"], ["engineering", "software", "development"], ["product", "product management", "pm"], ["design", "ux", "ui"]];
const CANON = new Map(GROUPS.flatMap((g) => g.map((x) => [x, g[0]])));
const canon = (x) => CANON.get(low(x)) || low(x);
export const expand = (t) => { const c = CANON.get(low(t)); return c ? GROUPS.find((g) => g[0] === c) : [low(t)]; };
const STOP = new Set("with that this have from your about their what when want more some into like help need looking people other would could should been being also just than them they will make know learn work working best good much many very over only really and the for are you our can any all how has but not get out who why new use per via its was too off one two".split(" "));
const stem = (w) => w.replace(/(ing|ers|er|ed|es|s)$/, "");
// stem -> original word, so reasons can show the real word.
const words = (t) => { const m = new Map(); for (const w of low(t || "").match(/[a-z]{3,}/g) || []) if (!STOP.has(w) && !m.has(stem(w))) m.set(stem(w), w); return m; };
const textOf = (p, ...ks) => ks.map((k) => (Array.isArray(p[k]) ? p[k].join(" ") : p[k] || "")).join(" ");
export const shared = (a, b) => { const mine = new Set((a.skills || []).map(canon)); return (b.skills || []).filter((x) => mine.has(canon(x))); };
// What b can offer toward what a is looking for: b's "can help with", skills and headline, matched by meaning not exact spelling.
export const helps = (a, b) => { const w = words(a.lookingFor), out = []; for (const [k, v] of words(textOf(b, "canHelp", "skills", "headline"))) if (w.has(k)) out.push(v); return out; };
// What b is working on that a's interests touch.
const topics = (a, b) => { const w = words(textOf(a, "lookingFor", "canHelp")), out = []; for (const [k, v] of words(b.workingOn)) if (w.has(k)) out.push(v); return out; };
export const score = (a, b) => {
  const hab = helps(a, b), hba = helps(b, a), av = overlap(a, b), noOverlap = (a.availability || []).length && (b.availability || []).length && !av.length;
  return (cityOf(a) && cityOf(a) === cityOf(b) ? 2 : 0) + (a.neighborhood && a.neighborhood === b.neighborhood ? 3 : 0)
    + Math.min(4, shared(a, b).length) * 2 + (a.industry && low(a.industry) === low(b.industry || "") ? 2 : 0)
    + Math.min(3, hab.length) * 3 + Math.min(3, hba.length) * 2 + (hab.length && hba.length ? 3 : 0)
    + Math.min(2, topics(a, b).length) * 2 + (av.length ? 2 : 0) - (noOverlap ? 2 : 0);
};
export const learn = (c, hist) => hist.reduce((t, h) => t + (h.met ? 1 : -1) * (shared(c, h.p).length + (c.industry && c.industry === h.p.industry ? 1 : 0)), 0);
export function why(a, b) {
  const w = [], s = shared(a, b), h = helps(a, b), r = helps(b, a), t = topics(a, b), av = overlap(a, b);
  if (h.length && r.length) w.push(`you can help each other, starting with ${h[0]}`);
  else if (h.length) w.push(`they can help with ${h[0]}`);
  else if (r.length) w.push(`you can help them with ${r[0]}`);
  if (t.length) w.push(`they're working on ${t[0]}`);
  if (s.length) w.push(`you both know ${s.slice(0, 2).join(" and ")}`);
  if (a.industry && low(a.industry) === low(b.industry || "")) w.push(`you're both in ${b.industry}`);
  if (a.neighborhood && a.neighborhood === b.neighborhood) w.push(`you're both around ${b.neighborhood}`);
  if (av.length) w.push(`you're both free ${av[0]}`);
  return w.length ? w.slice(0, 3).join(", ") + "." : "Different corners of the scene, which is the point.";
}
export const starters = (a, b) => {
  const s = shared(a, b)[0], w = [];
  if (s) w.push(`You both know ${s}: what's the most surprising thing you've learned about it?`);
  if (b.industry) w.push(`What's changing fastest in ${b.industry} right now?`);
  w.push("What's the best thing you've launched, built or fixed lately?", "What would you work on if time and money weren't a problem?",
    `Where's the best coffee in ${b.neighborhood || "town"}, and what do you order?`, "What's one thing you wish you'd known earlier in your career?");
  return w.slice(0, 5);
};
