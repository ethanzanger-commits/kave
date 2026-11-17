"use client";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
export default function GlobalError({ error }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return (
    <html lang="en"><body style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <h1>Something went wrong</h1>
      <p>We've been told and will fix it. Please reload the page.</p>
    </body></html>
  );
}
