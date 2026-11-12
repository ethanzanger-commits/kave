export const AVAIL = [["wk-morning", "Weekday mornings"], ["wk-afternoon", "Weekday afternoons"], ["wk-evening", "Weekday evenings"], ["fri-morning", "Friday mornings"], ["flexible", "Flexible"]];
export const AV_KEYS = AVAIL.map((x) => x[0]);
const label = Object.fromEntries(AVAIL);
export function overlap(a, b) {
  const x = a.availability || [], y = b.availability || [];
  if (!x.length || !y.length) return [];
  const keys = x.includes("flexible") ? y : y.includes("flexible") ? x : x.filter((k) => y.includes(k));
  return keys.filter((k) => k !== "flexible").map((k) => label[k].toLowerCase());
}
