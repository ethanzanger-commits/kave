import Sentry from "@sentry/nextjs";
const { withSentryConfig } = Sentry;
const config = {
  serverExternalPackages: ["pdf-parse", "mammoth", "web-push"],
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      { source: "/ingest/static/:path*", destination: "https://us-assets.i.posthog.com/static/:path*" },
      { source: "/ingest/:path*", destination: "https://us.i.posthog.com/:path*" },
    ];
  },
};
// Source-map upload only happens if SENTRY_AUTH_TOKEN is set; otherwise the build just skips it.
export default withSentryConfig(config, { silent: true, telemetry: false, webpack: { treeshake: { removeDebugLogging: true } } });