import { auth } from "@/auth";
import { client } from "@/db";
export const runtime = "nodejs";
// Serves one member's photo as a real image so list pages stay small and the browser can cache it.
export async function GET(req, { params }) {
  const s = await auth(); if (!s?.user?.id) return new Response("Sign in", { status: 401 });
  const { id } = await params;
  const [r] = await client`select image from "user" where id = ${id}`;
  if (!r?.image) return new Response("", { status: 404 });
  if (/^https:\/\//i.test(r.image)) return new Response(null, { status: 302, headers: { Location: r.image, "Cache-Control": "private, max-age=3600" } });
  const m = r.image.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return new Response("", { status: 404 });
  return new Response(Buffer.from(m[2], "base64"), { headers: { "Content-Type": m[1], "Cache-Control": "private, max-age=604800, immutable" } });
}
