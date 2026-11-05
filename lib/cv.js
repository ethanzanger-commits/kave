const M = "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\b\\.?";
const D = `(?:${M}\\s+)?(?:19|20)\\d{2}`;
const RANGE = new RegExp(`(${D})\\s*(?:-|–|—|to)\\s*(present|current|now|${D})`, "i");
const HEAD = /^(summary|profile|about|experience|work experience|professional experience|employment|employment history|education|skills|core skills|technical skills|languages|certifications|projects)\s*:?$/i;
// Best-effort text parsing. The review screen is where the user fixes mistakes.
export function parseCv(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const sec = { top: [] }; let cur = "top";
  for (const l of lines) {
    if (HEAD.test(l)) { cur = l.toLowerCase().replace(/:$/, ""); sec[cur] ??= []; } else sec[cur].push(l);
  }
  const pick = (...k) => k.flatMap((x) => sec[x] || []);
  const headline = sec.top.slice(1, 6).find((l) => l.length > 5 && l.length < 100 && !/@|https?:|linkedin|\d{5,}/i.test(l)) || "";
  const ex = pick("experience", "work experience", "professional experience", "employment", "employment history");
  const experience = [];
  ex.forEach((l, i) => {
    const m = l.match(RANGE); if (!m) return;
    let head = l.replace(m[0], "").replace(/^[|,–—\s-]+|[()|,–—\s-]+$/g, "");
    if (!head) head = ex[i - 1] || "";
    const [title, company] = head.split(/\s+(?:at|@)\s+|\s+[|–—-]\s+|,\s+/);
    experience.push({ title: title || "", company: company || "", start: m[1], end: /present|current|now/i.test(m[2]) ? "" : m[2] });
  });
  const skills = [...new Set(pick("skills", "core skills", "technical skills").join("\n").split(/[,•|·;\n]/)
    .map((s) => s.replace(/^[-–*]\s*/, "").trim()).filter((s) => s.length > 1 && s.length < 40))].slice(0, 40);
  const education = pick("education").filter((l) => /universit|college|school|institut|academy|b\.?sc|m\.?sc|\bmba\b|bachelor|master/i.test(l))
    .slice(0, 6).map((l) => ({ school: l.replace(RANGE, "").trim(), degree: "", start: "", end: "" }));
  return { headline, industry: "", company: (experience.find((e) => !e.end) || experience[0])?.company || "",
    experience: experience.slice(0, 30), skills, education };
}
