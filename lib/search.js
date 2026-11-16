import { expand } from "@/lib/match";
const low = (x) => String(x || "").toLowerCase();
// One lowercase string per member that the search looks through.
export const haystack = (r) => low([r.u.name, r.p.headline, r.p.company, r.p.industry, r.p.city, r.p.neighborhood, (r.p.skills || []).join(" "), r.p.canHelp, r.p.lookingFor, r.p.about].join(" "));
// Every word must match, and a word also matches its synonyms ("bd" finds "business development").
export const matchesQuery = (h, q) => low(q).split(/[\s,]+/).filter(Boolean).every((t) => expand(t).some((x) => h.includes(x)));
