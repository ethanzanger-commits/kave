import { client } from "@/db";
// Where to send someone after email sign-in when they didn't come from a specific page:
// finished members go to Discover, everyone else to the profile form. Any failure falls back to the profile form.
export async function landing(email) {
  try { const r = await client`select 1 from complete_member c join "user" u on u.id = c.id where u.email = ${email} limit 1`; return r.length ? "/discover" : "/profile"; } catch { return "/profile"; }
}
