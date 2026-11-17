"use client";
import { useState } from "react";
import { savePush } from "./actions";
const b64 = (s) => { const p = "=".repeat((4 - (s.length % 4)) % 4), r = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from([...r].map((c) => c.charCodeAt(0))); };
export default function PushButton({ vapid }) {
  const [msg, setMsg] = useState("");
  async function turnOn() {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return setMsg("This browser can't show notifications. On iPhone, add Kave to your Home Screen first, then open it from there.");
      const reg = await navigator.serviceWorker.register("/sw.js");
      if ((await Notification.requestPermission()) !== "granted") return setMsg("Notifications are blocked. Allow them in your browser settings to turn them on.");
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(vapid) });
      await savePush(JSON.parse(JSON.stringify(sub)));
      setMsg("Notifications are on for this device.");
    } catch { setMsg("Couldn't turn on notifications. Try again in a moment."); }
  }
  return (
    <div className="card"><h2>Get a ping on your phone</h2>
      <p>We'll notify you when someone asks for a coffee, you match, or someone writes to you. On iPhone, add Kave to your Home Screen first (Share, then Add to Home Screen).</p>
      <button onClick={turnOn}>Turn on notifications</button>{msg && <p role="status"><b>{msg}</b></p>}</div>
  );
}
