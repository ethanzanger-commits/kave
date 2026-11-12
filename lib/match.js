import { cityOf } from "@/lib/place";
const low = (x) => String(x).toLowerCase();
const words = (t) => new Set(low(t || "").match(/[a-z]{4,}/g) || []);
export const shared = (a, b) => (b.skills || []).filter((x) => (a.skills || []).map(low).includes(low(x)));
export const helps = (a, b) => { const w = words(a.lookingFor); return [...words(b.canHelp)].filter((x) => w.has(x)); };
export const score = (a, b) => (cityOf(a) && cityOf(a) === cityOf(b) ? 2 : 0) + (a.neighborhood && a.neighborhood === b.neighborhood ? 3 : 0) + shared(a, b).length * 2 + (a.industry && a.industry === b.industry ? 2 : 0) + helps(a, b).length * 3 + helps(b, a).length * 2;
// Learns from "did it happen?" answers: lean toward the kinds of people past coffees worked with.
export const learn = (c, hist) => hist.reduce((t, h) => t + (h.met ? 1 : -1) * (shared(c, h.p).length + (c.industry && c.industry === h.p.industry ? 1 : 0)), 0);
export function why(a, b) {
  const w = [], s = shared(a, b), h = helps(a, b);
  if (h.length) w.push(`they can help with ${h[0]}`);
  if (s.length) w.push(`you both know ${s.slice(0, 2).join(" and ")}`);
  if (a.industry && a.industry === b.industry) w.push(`you're both in ${b.industry}`);
  if (a.neighborhood && a.neighborhood === b.neighborhood) w.push(`you're both around ${b.neighborhood}`);
  return w.length ? w.join(", ") + "." : "Different corners of the scene, which is the point.";
}
export const starters = (a, b) => {
  const s = shared(a, b)[0], w = [];
  if (s) w.push(`You both know ${s}: what's the most surprising thing you've learned about it?`);
  if (b.industry) w.push(`What's changing fastest in ${b.industry} right now?`);
  w.push("What's the best thing you've launched, built or fixed lately?", "What would you work on if time and money weren't a problem?",
    `Where's the best coffee in ${b.neighborhood || "town"}, and what do you order?`, "What's one thing you wish you'd known earlier in your career?");
  return w.slice(0, 5);
};
