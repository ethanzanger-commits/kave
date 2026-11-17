import JSZip from "jszip";
import { auth } from "@/auth";
import { client } from "@/db";
import { parseConnections, matchContacts } from "@/lib/contacts";
export const runtime = "nodejs";
// Reads the file in memory, returns only members, and stores nothing about the person's contacts.
export async function POST(req) {
  const s = await auth(); if (!s?.user?.id) return Response.json({ error: "Sign in first" }, { status: 401 });
  const me = s.user.id, file = (await req.formData()).get("file");
  if (!file || file.size > 25e6) return Response.json({ error: "Bad file" }, { status: 400 });
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    let text;
    if (/\.zip$/i.test(file.name)) { const zip = await JSZip.loadAsync(buf); const f = zip.file(/(^|\/)Connections\.csv$/i)[0]; if (!f) return Response.json({ error: "No Connections.csv in that ZIP" }, { status: 400 }); text = await f.async("string"); }
    else text = buf.toString("utf8");
    const conns = parseConnections(text);
    if (!conns.length) return Response.json({ error: "That doesn't look like a LinkedIn Connections file" }, { status: 400 });
    const members = await client`select u.id, u.name, u.email, p."linkedinUrl", p.company, p.headline, p.city from profile p join "user" u on u.id = p."userId"
      where p."userId" in (select id from complete_member) and u.id <> ${me} and not exists (select 1 from block b where (b."fromId" = ${me} and b."toId" = u.id) or (b."fromId" = u.id and b."toId" = ${me}))`;
    const found = matchContacts(conns, members).map(({ id, name, headline, company, city, how }) => ({ id, name, headline, company, city, how }));
    return Response.json({ total: conns.length, found });
  } catch { return Response.json({ error: "Couldn't read that file" }, { status: 400 }); }
}
