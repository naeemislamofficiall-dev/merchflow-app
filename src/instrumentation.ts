import type { Instrumentation } from "next";

// Server-e kono unhandled error hole ekta structured JSON line log kore (Vercel/host-er log-e khuje paben).
// Query string, header, body kothao log hoy na, tai token/password leak hoy na.
// Sentry chaile ei function-er bhitore Sentry.captureRequestError(err, request, context) call add korun.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const e = err instanceof Error ? err : new Error(String(err));
  const digest = (err as { digest?: string }).digest;
  console.error(
    JSON.stringify({
      level: "error",
      ts: new Date().toISOString(),
      message: e.message.slice(0, 500),
      digest,
      method: request.method,
      path: request.path.split("?")[0],
      routePath: context.routePath,
      routeType: context.routeType,
      renderSource: context.renderSource,
      stack: e.stack?.split("\n").slice(0, 6),
    }),
  );
};
