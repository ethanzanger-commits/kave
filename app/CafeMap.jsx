"use client";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
export default function CafeMap({ center, pins, onPick }) {
  const el = useRef(null);
  useEffect(() => {
    let map, dead = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (dead || !el.current) return;
      map = L.map(el.current).setView([center.lat, center.lon], 15);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap contributors" }).addTo(map);
      pins.forEach((p) => L.circleMarker([p.lat, p.lon], { radius: 10, color: "#2a1b3d", weight: 2, fillColor: "#ff6b8a", fillOpacity: 1 })
        .addTo(map).bindTooltip(p.name).on("click", () => onPick && onPick(p.name)));
    })();
    return () => { dead = true; if (map) map.remove(); };
  }, []);
  return <div ref={el} style={{ height: 260, borderRadius: 18, border: "1.5px solid #f0e1d3", margin: ".6rem 0" }} role="application" aria-label="Map of nearby cafés. Tap a pin to choose it." />;
}
