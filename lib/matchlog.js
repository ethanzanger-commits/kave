import { client } from "@/db";
// Server-side coffee history. Never throws, skips demo users.
// Duplicate guard: same user + match + event within 30s is ignored (refresh/double-click); optional `key` is once-ever.
export async function logCoffee(userId, matchId, name, meta = {}, key = null) {
  try {
    if (!userId || !matchId || String(userId).startsWith("demo-")) return;
    await client`insert into event ("userId", name, "matchId", meta, key)
      select ${String(userId)}::text, ${name}::text, ${matchId}::text, ${JSON.stringify(meta)}::jsonb, ${key}::text
      where not exists (select 1 from event where "userId" = ${String(userId)}::text and "matchId" = ${matchId}::text and name = ${name}::text and at > now() - interval '30 seconds')
      on conflict do nothing`;
  } catch {}
}
