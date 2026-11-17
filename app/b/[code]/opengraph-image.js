import { ImageResponse } from "next/og";
import { badgeFor } from "@/lib/badge";
export const alt = "A Kave member badge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default async function Image({ params }) {
  const b = (await badgeFor((await params).code)) || { first: "Kave", label: "Kave Member", sub: "Meeting new people over coffee" };
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "#081230", color: "#fbf7ec" }}>
        <div style={{ display: "flex", fontSize: 48, fontWeight: 800 }}>kave<span style={{ color: "#f25c00" }}>.</span></div>
        <div style={{ display: "flex", fontSize: 36, marginTop: 60, color: "#ffb07a" }}>{b.first}</div>
        <div style={{ display: "flex", fontSize: 92, fontWeight: 800, lineHeight: 1.05, marginTop: 10 }}>{b.label}</div>
        <div style={{ display: "flex", fontSize: 40, marginTop: 30, color: "#cfd6e6" }}>{b.sub}</div>
        <div style={{ display: "flex", marginTop: 50, background: "#f25c00", color: "#081230", borderRadius: 999, padding: "14px 32px", fontSize: 32, fontWeight: 800, alignSelf: "flex-start" }}>Coffee matching for Israeli tech</div>
      </div>
    ),
    size,
  );
}
