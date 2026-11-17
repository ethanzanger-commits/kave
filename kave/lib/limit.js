import { client } from "@/db";
// Allows at most `max` hits per `seconds` for a key. Returns false when over the limit. If the table is missing, it lets everything through.
export async function hit(key, max, seconds) {
  try {
    const [r] = await client`select count(*)::int as c from rate_hit where key = ${key} and "at" > now() - make_interval(secs => ${seconds})`;
    if (r.c >= max) return false;
    await client`insert into rate_hit (key) values (${key})`;
    if (Math.random() < 0.02) await client`delete from rate_hit where "at" < now() - interval '2 days'`;
    return true;
  } catch { return true; }
}
