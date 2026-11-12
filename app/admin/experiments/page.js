import { requireAdmin } from "@/lib/admin";
import { client } from "@/db";
import AdminNav from "../AdminNav";
import { experimentStats } from "@/lib/growth";
import { createExperiment, updateExperiment } from "../actions";
export default async function Experiments() {
  await requireAdmin();
  let list = [], err = "";
  try {
    list = await client`select id, name, hypothesis, channel, to_char("startsOn", 'YYYY-MM-DD') as starts, to_char("endsOn", 'YYYY-MM-DD') as ends, "startsOn", "endsOn", metric, result, learnings, status from experiment order by at desc`;
    for (const e of list) e.stats = e.channel ? await experimentStats(client, e.channel, e.starts, e.ends) : null;
  } catch { err = "Run migrations/kave8-growth.sql in Neon first, then reload."; }
  return (
    <main>
      <AdminNav />
      <h1>Growth tests</h1>
      <p className="lead">Write down what you tried, why, and what happened. If you give a channel name (the part after /go/), the sign-ups it brought during the test are counted for you.</p>
      {err && <p className="why">{err}</p>}
      <form action={createExperiment} className="card">
        <h2>New test</h2>
        <label>What are you trying?<input name="name" required maxLength={120} placeholder="LinkedIn post with founding 50 offer" /></label>
        <label>What do you expect to happen, and why?<textarea name="hypothesis" rows={2} maxLength={400} /></label>
        <label>Channel (optional, e.g. linkedin)<input name="channel" maxLength={30} /></label>
        <label>Starts<input name="startsOn" type="date" /></label>
        <label>Ends<input name="endsOn" type="date" /></label>
        <label>How will you judge it?<input name="metric" maxLength={120} placeholder="Completed profiles from this channel" /></label>
        <p></p><button className="primary">Save test</button>
      </form>
      {list.map((e) => (
        <form key={e.id} action={updateExperiment} className="card">
          <input type="hidden" name="id" value={e.id} />
          <h2>{e.name}</h2>
          <p><small>{e.status}{e.starts ? `, ${e.starts}` : ""}{e.ends ? ` to ${e.ends}` : ""}{e.channel ? `, channel: ${e.channel}` : ""}</small></p>
          {e.hypothesis && <p>{e.hypothesis}</p>}
          {e.metric && <p><small>Judged by: {e.metric}</small></p>}
          {e.stats && <p className="why">From the database: {e.stats.registered} signed up, {e.stats.completed} completed a profile, {e.stats.activated} activated.</p>}
          <label>Status<select name="status" defaultValue={e.status}><option>planned</option><option>running</option><option>done</option></select></label>
          <label>Result<textarea name="result" rows={2} defaultValue={e.result || ""} /></label>
          <label>What we learned<textarea name="learnings" rows={2} defaultValue={e.learnings || ""} /></label>
          <p></p><button>Update</button>
        </form>))}
    </main>
  );
}
