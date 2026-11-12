import { auth } from "@/auth";
import { client } from "@/db";
import { redirect } from "next/navigation";
import Nav from "../Nav";
import { board, monthKey, prevMonthKey, finalizeMonth, short, FLAIR } from "@/lib/leaders";
export const metadata = { title: "Leaderboards · Kave" };
const label = (m) => new Date(m + "-15").toLocaleDateString("en-GB", { month: "long", year: "numeric" });
export default async function Leaders() {
  const s = await auth(); if (!s?.user?.id) redirect("/");
  const m = monthKey(), pm = prevMonthKey(); let inv = [], cof = [], prev = [];
  try {
    await finalizeMonth(client, pm);
    [inv, cof, prev] = await Promise.all([board(client, "invites", m), board(client, "coffees", m), client`select w.category, w.count, u.name, u.email from monthly_winner w join "user" u on u.id = w."userId" where w.month = ${pm}`]);
  } catch {}
  const Board = ({ title, sub, rows, empty }) => (
    <div className="card"><h2>{title}</h2><p style={{ margin: 0 }}><small>{sub}</small></p>
      {rows.length === 0 ? <p>{empty}</p> : rows.map((r, i) => <p key={r.id} style={{ margin: ".5rem 0", display: "flex", gap: ".7rem", alignItems: "center" }}><span className="avatar" style={{ width: 34, height: 34, fontSize: "1rem" }}>{i + 1}</span><b style={{ flex: 1 }}>{short(r.name, r.email)}</b><span>{r.c}</span></p>)}</div>
  );
  return (
    <main>
      <Nav />
      <h1>Leaderboards</h1>
      <p className="lead">{label(m)}. Winners get special flair and priority in search all next month.</p>
      <Board title="Most converted invites" sub="Friends who joined through your link and finished their profile" rows={inv} empty="No one yet. Invite a friend who completes their profile to get on the board." />
      <Board title="Most coffee dates" sub="Coffees you confirmed as having happened" rows={cof} empty="No one yet. Book a coffee and mark it as done." />
      {prev.length > 0 && <div className="card"><h2>{label(pm)} winners</h2>{prev.map((w) => <p key={w.category} style={{ margin: ".4rem 0" }}><img className="badgeimg" src={FLAIR[w.category].img} alt="" width="28" height="28" /> <b>{short(w.name, w.email)}</b>, {FLAIR[w.category].label} ({w.count})</p>)}</div>}
    </main>
  );
}
