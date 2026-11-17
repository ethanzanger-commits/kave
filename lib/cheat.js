import { why, starters } from "@/lib/match";
import { fmt } from "@/lib/fmt";
const first = (n) => (n || "your match").split(" ")[0];
export function cheatEmail(me, o, oName, m, base) {
  const maps = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent((m.place || "") + " " + (me.neighborhood || ""));
  return [`Coffee with ${oName}: ${fmt(m.when)} at ${m.place}`, "", `Who: ${[o.headline, o.company].filter(Boolean).join(" at ")}`, o.about && `About: ${o.about}`,
    o.lookingFor && `Looking for: ${o.lookingFor}`, o.canHelp && `Can help with: ${o.canHelp}`, `Why you two? ${why(me, o)}`, "", "Topics:",
    ...starters(me, o).map((q) => "- " + q), "", `Map: ${maps}`, `Full cheat sheet: ${base}/coffee/${m.id}`, "", "Arrive 5 minutes early, put your phone away, and leave with one next step."].filter((x) => x !== undefined && x !== false && x !== null).join("\n");
}
