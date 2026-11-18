import Sentry from "@sentry/nextjs";
const { withSentryConfig } = Sentry;
// Basic hardening headers. No CSP on purpose: PostHog, Turnstile, Sentry and map tiles would need careful allow-listing and could break silently.
const security = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=()" },
];
const config = { serverExternalPackages: ["pdf-parse", "mammoth", "web-push"], async headers() { return [{ source: "/:path*", headers: security }]; } };
// Source-map upload only happens if SENTRY_AUTH_TOKEN is set; otherwise the build just skips it.
export default withSentryConfig(config, { silent: true, telemetry: false, webpack: { treeshake: { removeDebugLogging: true } } });
