import { client } from "@/db";
export async function GET(req) {
  const id = new URL(req.url).searchParams.get("id") || "";
  if (/^[0-9a-f-]{36}$/.test(id)) { try { await client`update reminder set "clickedAt" = now() where id = ${id} and "clickedAt" is null`; } catch {} }
  return Response.redirect(new URL("/profile", req.url), 302);
}
