// IMPORTANT: this module must be imported FIRST in server/index.ts so that
// `Sentry.init` runs before Node's `http` module is loaded by anything else.
// Without that ordering, the v10 httpIntegration cannot wrap incoming
// requests for tracing.
import * as Sentry from "@sentry/node";
import { env } from "./env";

if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    sendDefaultPii: false,
    tracesSampleRate: env.NODE_ENV === "production" ? 0.1 : 0,
    integrations: [Sentry.httpIntegration(), Sentry.expressIntegration()],
    beforeSend(event) {
      if (event.request) {
        delete event.request.cookies;
        delete event.request.data;
      }
      if (event.user) {
        delete event.user.email;
        delete event.user.username;
        delete event.user.ip_address;
      }
      return event;
    },
  });
}

export function captureServerException(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (!env.SENTRY_DSN) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}

export const sentryEnabled = (): boolean => Boolean(env.SENTRY_DSN);

export { Sentry };
