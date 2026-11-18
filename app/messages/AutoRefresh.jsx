"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
// Pulls in new messages every 15 seconds while the page is open and visible.
export default function AutoRefresh() {
  const router = useRouter();
  useEffect(() => { const t = setInterval(() => { const a = document.activeElement; if (document.visibilityState === "visible" && !(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) router.refresh(); }, 20000); return () => clearInterval(t); }, [router]);
  return null;
}
