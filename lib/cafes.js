const UA = { "User-Agent": "kave-app (beta)" };
// Free OpenStreetMap data (no API key): geocode the neighborhood, then list nearby cafés.
export async function cafes(place) {
  if (!place) return [];
  try {
    const g = await (await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=1`, { headers: UA, next: { revalidate: 604800 } })).json();
    if (!g[0]) return [];
    const q = `[out:json][timeout:10];node(around:1200,${g[0].lat},${g[0].lon})[amenity=cafe][name];out 10;`;
    const o = await (await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "Content-Type": "application/x-www-form-urlencoded", ...UA } })).json();
    return [...new Set(o.elements.map((e) => e.tags.name))].slice(0, 6);
  } catch { return []; }
}
