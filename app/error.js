"use client";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
export default function Error({ error, reset }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return (
    <main style={{ maxWidth: 520, margin: "0 auto", padding: "3rem 1.25rem" }}>
      <h1>That didn&rsquo;t work</h1>
      <p>Something went wrong on our side. Your information is safe. Please try again.</p>
      <p><button onClick={() => reset()}>Try again</button> &nbsp; <a href="/discover">Back to Discover</a></p>
    </main>
  );
}
