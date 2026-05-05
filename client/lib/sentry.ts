import * as Sentry from "@sentry/react-native";

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

let initialized = false;

export function initClientSentry(): void {
  if (initialized || !dsn) return;
  Sentry.init({
    dsn,
    sendDefaultPii: false,
    enableAutoSessionTracking: true,
    tracesSampleRate: __DEV__ ? 0 : 0.1,
    environment: __DEV__ ? "development" : "production",
    beforeSend(event) {
      if (event.request) delete event.request.cookies;
      if (event.user) {
        delete event.user.email;
        delete event.user.username;
        delete event.user.ip_address;
      }
      return event;
    },
  });
  initialized = true;
}

export function captureClientException(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (!initialized) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}

export function captureClientMessage(
  message: string,
  level: "info" | "warning" | "error" = "info",
): void {
  if (!initialized) return;
  Sentry.captureMessage(message, level);
}

export function setSentryUser(userId: string | null): void {
  if (!initialized) return;
  Sentry.setUser(userId ? { id: userId } : null);
}

export const sentryEnabled = (): boolean => initialized;
