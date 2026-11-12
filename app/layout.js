import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
export const metadata = { metadataBase: new URL(process.env.APP_URL || "https://kave-seven.vercel.app"), title: "Kave: meet someone worth knowing, over coffee", description: "Kave introduces professionals across Israel to people worth meeting, one coffee at a time.", openGraph: { title: "Kave: meet someone worth knowing, over coffee", description: "Professionals across Israel, one good coffee at a time.", type: "website" } };
export const viewport = { themeColor: "#fff7f0" };
export default function Layout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,600;9..144,700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}<Analytics /></body>
    </html>
  );
}
