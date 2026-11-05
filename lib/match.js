const low = (x) => String(x).toLowerCase();
export const shared = (a, b) => (b.skills || []).filter((x) => (a.skills || []).map(low).includes(low(x)));
export const score = (a, b) => (a.neighborhood && a.neighborhood === b.neighborhood ? 3 : 0) + shared(a, b).length * 2 + (a.industry && a.industry === b.industry ? 2 : 0);
export function why(a, b) {
  const w = [], s = shared(a, b);
  if (s.length) w.push(`you both know ${s.slice(0, 2).join(" and ")}`);
  if (a.industry && a.industry === b.industry) w.push(`you're both in ${b.industry}`);
  if (a.neighborhood && a.neighborhood === b.neighborhood) w.push(`you're both around ${b.neighborhood}`);
  return w.length ? w.join(", ") + "." : "Different corners of the scene, which is the point.";
}
export const starters = (a, b) => ["What are you working on right now?",
  shared(a, b)[0] ? `How did you get into ${shared(a, b)[0]}?` : "What's the best thing you've launched lately?",
  `Where's the best coffee in ${b.neighborhood || "town"}?`];
