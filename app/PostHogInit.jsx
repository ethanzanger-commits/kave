"use client";
import { useEffect } from "react";
import posthog from "posthog-js";
// Product analytics and session replay (PostHog free plan). Off unless NEXT_PUBLIC_POSTHOG_KEY is set.
export default function PostHogInit() {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || posthog.__loaded) return;
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      person_profiles: "identified_only",
      capture_pageview: "history_change",
      respect_dnt: true,
      session_recording: { maskAllInputs: true, maskTextSelector: "[data-private], .ph-mask" },
    });
    // Private conversations are never recorded.
    if (/^\/(coffee|messages|admin)/.test(location.pathname)) posthog.set_config({ disable_session_recording: true });
  }, []);
  return null;
}
