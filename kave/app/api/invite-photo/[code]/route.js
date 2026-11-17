import { client } from "@/db";
export const runtime = "nodejs";
// The inviter's photo for their public invitation page. Looked up by invite code, so photos can't be listed by id.
export async function GET(req, { params }) {
  const { code } = await params;
  if (!/^[a-z0-9]{4,12}$/.test(code || "")) return new Response("", { status: 404 });
  const [r] = await client`select u.image from profile p join "user" u on u.id = p."userId" where p."refCode" = ${code} and p."ageOk"`;
  if (!r?.image) return new Response("", { status: 404 });
  if (/^https:\/\//i.test(r.image)) return new Response(null, { status: 302, headers: { Location: r.image, "Cache-Control": "public, max-age=3600" } });
  const m = r.image.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return new Response("", { status: 404 });
  return new Response(Buffer.from(m[2], "base64"), { headers: { "Content-Type": m[1], "Cache-Control": "public, max-age=3600" } });
}
