import { auth } from "@/auth";
import { matchCity } from "@/lib/cities";
export async function GET(req) {
  if (!(await auth())) return Response.json({}, { status: 401 });
  const u = new URL(req.url), lat = Number(u.searchParams.get("lat")), lon = Number(u.searchParams.get("lon"));
  if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return Response.json({}, { status: 400 });
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat.toFixed(2)}&lon=${lon.toFixed(2)}&format=json&zoom=10&accept-language=en`, { headers: { "User-Agent": "kave-app (beta)" } });
    const a = (await r.json()).address || {};
    const place = matchCity([a.city, a.town, a.village, a.municipality, a.county, a.state_district].filter(Boolean).join(" "));
    return Response.json({ place });
  } catch { return Response.json({}); }
}
