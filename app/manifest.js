export default function manifest() {
  return { name: "Kave", short_name: "Kave", description: "Meet people in your field, over coffee.", start_url: "/discover", display: "standalone", background_color: "#f5f0e4", theme_color: "#101b33",
    icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "/icon-512.png", sizes: "512x512", type: "image/png" }] };
}
