import * as Sentry from "@sentry/nextjs";
// Error monitoring (Sentry free plan). Off unless NEXT_PUBLIC_SENTRY_DSN is set. No performance tracing or replay, to stay inside the free quota.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
  sendDefaultPii: false,
  ignoreErrors: ["NEXT_REDIRECT", "NEXT_NOT_FOUND", "ResizeObserver loop"],
});
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
