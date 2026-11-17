import Sentry from "@sentry/nextjs";
const { withSentryConfig } = Sentry;
const config = { serverExternalPackages: ["pdf-parse", "mammoth", "web-push"] };
// Source-map upload only happens if SENTRY_AUTH_TOKEN is set; otherwise the build just skips it.
export default withSentryConfig(config, { silent: true, telemetry: false, webpack: { treeshake: { removeDebugLogging: true } } });
