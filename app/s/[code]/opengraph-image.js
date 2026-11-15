import { ImageResponse } from "next/og";
import { who } from "@/lib/who";
export const alt = "Let's grab coffee on kave";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default async function Image({ params }) {
  const r = await who((await params).code);
  const sub = r ? `${r.first}${r.headline ? " · " + r.headline : ""}` : "Meet someone worth knowing";
  const dot = <span style={{ color: "#ff6b8a" }}>.</span>;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "#fff7f0", color: "#2a1b3d", position: "relative" }}>
        <div style={{ position: "absolute", right: -120, bottom: -170, width: 520, height: 520, borderRadius: 260, background: "#ffd0da", display: "flex" }} />
        <div style={{ position: "absolute", right: 90, top: 70, display: "flex" }}>
          <svg width="220" height="220" viewBox="0 0 24 24" fill="none" stroke="#2a1b3d" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9z" /><path d="M16 11h2a2 2 0 0 1 0 4h-2" /><path d="M8 3v2M12 3v2" />
          </svg>
        </div>
        <div style={{ display: "flex", fontSize: 44, fontWeight: 800 }}>kave{dot}</div>
        <div style={{ display: "flex", fontSize: 100, fontWeight: 800, lineHeight: 1.05, marginTop: 30 }}>Let's grab coffee</div>
        <div style={{ display: "flex", fontSize: 100, fontWeight: 800, lineHeight: 1.05 }}>on kave{dot}</div>
        <div style={{ display: "flex", fontSize: 38, marginTop: 40, color: "#6d5f7d" }}>{sub}</div>
        {r?.founding && <div style={{ display: "flex", marginTop: 30, background: "#2a1b3d", color: "#ffe3a3", borderRadius: 999, padding: "14px 30px", fontSize: 32, fontWeight: 800, alignSelf: "flex-start" }}>{`KAVE FOUNDING 50 · #${r.founding}`}</div>}
        <div style={{ display: "flex", marginTop: 30, background: "#ffe3a3", borderRadius: 999, padding: "14px 30px", fontSize: 32, alignSelf: "flex-start" }}>Private beta · across Israel</div>
      </div>
    ),
    size,
  );
}
