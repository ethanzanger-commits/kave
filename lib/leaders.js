// Monthly leaderboards (Israel time). Winners get flair and search priority for the following month.
export const monthKey = (d = new Date()) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" }).slice(0, 7);
export const prevMonthKey = (d = new Date()) => { const [y, m] = monthKey(d).split("-").map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`; };
export const FLAIR = { invites: { img: "/badges/flair-connector.svg", label: "Top Connector" }, coffees: { img: "/badges/flair-coffee.svg", label: "Coffee Champion" } };
export const isNewProfile = (p) => Boolean(p?.completedAt) && Date.now() - new Date(p.completedAt).getTime() < 7 * 864e5;
export const short = (n, email) => {
  let s = String(n || "").trim();
  if (!s && email) { const t = String(email).split("@")[0].split(/[._\-+]/).filter((x) => /^[a-zA-Z]{2,}$/.test(x)); if (t.length >= 2) s = t[0] + " " + t[t.length - 1]; }
  if (!s) return "Member";
  const [f, ...r] = s.split(/\s+/), cap = (w) => w[0].toUpperCase() + w.slice(1);
  return r.length ? `${cap(f)} ${r[r.length - 1][0].toUpperCase()}.` : cap(f);
};
export async function board(q, cat, month) {
  if (cat === "invites") return q`select x.id, u.name, u.email, x.c from (select p."invitedBy" as id, count(*)::int as c from profile p join profile i on i."userId" = p."invitedBy" and i."ageOk" where p."ageOk" and p."invitedBy" not like 'demo-%' and p."userId" not like 'demo-%' and to_char((p."completedAt" at time zone 'UTC') at time zone 'Asia/Jerusalem', 'YYYY-MM') = ${month} group by p."invitedBy") x join "user" u on u.id = x.id order by x.c desc, x.id limit 5`;
  return q`select x.id, u.name, u.email, x.c from (select id, count(*)::int as c from (select a as id from match where met and a not like 'demo-%' and b not like 'demo-%' and left("whenText", 7) = ${month} union all select b as id from match where met and a not like 'demo-%' and b not like 'demo-%' and left("whenText", 7) = ${month}) y where id not like 'demo-%' group by id) x join "user" u on u.id = x.id order by x.c desc, x.id limit 5`;
}
export async function finalizeMonth(q, month) {
  const [{ c }] = await q`select count(*)::int as c from monthly_winner where month = ${month}`;
  if (c >= 2) return;
  for (const cat of ["invites", "coffees"]) {
    const [top] = await board(q, cat, month);
    if (top && top.c > 0) await q`insert into monthly_winner (month, category, "userId", count) values (${month}, ${cat}, ${top.id}, ${top.c}) on conflict (month, category) do nothing`;
  }
}
export async function winnerMap(q, now = new Date()) {
  try {
    const m = prevMonthKey(now); await finalizeMonth(q, m);
    const out = {}; (await q`select "userId", category from monthly_winner where month = ${m}`).forEach((r) => (out[r.userId] ||= []).push(r.category));
    return out;
  } catch { return {}; }
}
