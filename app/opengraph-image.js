import { ImageResponse } from "next/og";
export const alt = "Kave: meet someone worth knowing, over coffee";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  const dot = <span style={{ color: "#ff6b8a" }}>.</span>;
  return new ImageResponse((
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "#fff7f0", color: "#2a1b3d", position: "relative" }}>
      <div style={{ position: "absolute", right: -120, bottom: -170, width: 520, height: 520, borderRadius: 260, background: "#ffd0da", display: "flex" }} />
      <div style={{ display: "flex", fontSize: 54, fontWeight: 800 }}>kave{dot}</div>
      <div style={{ display: "flex", fontSize: 88, fontWeight: 800, lineHeight: 1.05, marginTop: 30 }}>Meet someone worth</div>
      <div style={{ display: "flex", fontSize: 88, fontWeight: 800, lineHeight: 1.05 }}>knowing, over coffee{dot}</div>
      <div style={{ display: "flex", fontSize: 38, marginTop: 40, color: "#6d5f7d" }}>Professionals across Israel</div>
    </div>), size);
}
