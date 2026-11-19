import { auth } from "@/auth";
import { pendingActions } from "@/lib/coffee";
import { fmt } from "@/lib/fmt";
import { short } from "@/lib/leaders";
// "Needs your action" strip: shown on Discover (home) and My coffees. Renders nothing when there is nothing to do.
export default async function PendingActions() {
  const s = await auth(); if (!s?.user?.id) return null;
  const p = await pendingActions(s.user.id); if (!p.count) return null;
  return (
    <section className="card todo-strip" aria-label="Needs your action">
      <h2>Needs your action ({p.count})</h2>
      <ul>
        {p.req.map((x) => <li key={"r" + x.id}><a href="/matches#requests"><b>{short(x.name, x.email)}</b> asked for a coffee. Accept or decline</a></li>)}
        {p.prop.map((x) => <li key={"p" + x.id}><a href={`/coffee/${x.id}`}><b>{short(x.name, x.email)}</b> suggested {fmt(x.w)}. Confirm or suggest another time</a></li>)}
        {p.conf.map((x) => <li key={"c" + x.id}><a href={`/coffee/${x.id}`}>Did your coffee with <b>{short(x.name, x.email)}</b> happen? Confirm</a></li>)}
      </ul>
    </section>
  );
}
