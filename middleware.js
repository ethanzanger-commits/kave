import { NextResponse } from "next/server";
// First-touch channel: remember ?src= (or utm_source) for 30 days.
export function middleware(req) {
  const res = NextResponse.next();
  const v = (req.nextUrl.searchParams.get("src") || req.nextUrl.searchParams.get("utm_source") || "").toLowerCase().replace(/[^a-z0-9_.-]/g, "").slice(0, 40);
  if (v && !req.cookies.get("src")) res.cookies.set("src", v, { maxAge: 60 * 60 * 24 * 30, httpOnly: true, sameSite: "lax", path: "/" });
  return res;
}
export const config = { matcher: ["/((?!_next|api|.*\\..*).*)"] };
