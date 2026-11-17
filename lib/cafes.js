const UA = { "User-Agent": "kave-app (beta)" };
// Free OpenStreetMap data (no API key): geocode the neighborhood, then list nearby cafés with coordinates.
export async function cafePins(place) {
  const none = { center: null, pins: [] };
  if (!place) return none;
  try {
    const g = await (await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=1`, { headers: UA, next: { revalidate: 604800 } })).json();
    if (!g[0]) return none;
    const q = `[out:json][timeout:10];node(around:2500,${g[0].lat},${g[0].lon})[amenity=cafe][name];out 20;`;
    const o = await (await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "Content-Type": "application/x-www-form-urlencoded", ...UA } })).json();
    const seen = new Set(), pins = [];
    for (const e of o.elements) if (!seen.has(e.tags.name) && pins.length < 12) { seen.add(e.tags.name); pins.push({ name: e.tags.name, lat: e.lat, lon: e.lon }); }
    return { center: { lat: Number(g[0].lat), lon: Number(g[0].lon) }, pins };
  } catch { return none; }
}
export const cafes = async (place) => (await cafePins(place)).pins.map((x) => x.name).slice(0, 6);
