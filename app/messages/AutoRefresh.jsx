"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
// Pulls in new messages every 15 seconds while the page is open and visible.
export default function AutoRefresh() {
  const router = useRouter();
  useEffect(() => { const t = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, 15000); return () => clearInterval(t); }, [router]);
  return null;
}
