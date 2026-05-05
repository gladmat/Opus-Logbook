import { PostHog } from "posthog-react-native";

// Init is gated on EXPO_PUBLIC_POSTHOG_KEY. When unset, every helper
// below is a no-op so the app runs identically without an account.
const apiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

let client: PostHog | null = null;

export async function initAnalytics(): Promise<void> {
  if (client || !apiKey) return;
  client = new PostHog(apiKey, {
    host,
    // Don't send IP addresses (clinical app — minimize PII even on
    // analytics events).
    disableGeoip: true,
    // Surface session_replay only behind explicit opt-in. Default off.
    enableSessionReplay: false,
    // Wait until the app foregrounds to flush — saves battery on cold
    // starts.
    flushInterval: 30_000,
    flushAt: 20,
  });
}

// Domain events. Names use snake_case for stability across PostHog's
// SQL queryability. Properties stay under 1KB total per event — never
// pass a full case payload here.
export type AnalyticsEvent =
  | "app_opened"
  | "case_save_started"
  | "case_saved"
  | "case_save_failed"
  | "case_form_section_opened"
  | "diagnosis_picked"
  | "case_shared"
  | "share_invitation_sent"
  | "media_captured"
  | "guided_capture_started"
  | "guided_capture_completed";

export function track(
  event: AnalyticsEvent,
  properties?: Record<string, string | number | boolean>,
): void {
  if (!client) return;
  client.capture(event, properties);
}

export function identifyAnalyticsUser(userId: string | null): void {
  if (!client) return;
  if (userId) {
    // We deliberately do NOT pass email, name, or DOB — only the
    // server-side userId. Profile attributes are joined in PostHog
    // from the server-side identify call (which the server doesn't
    // do today). Until then, distinct_id alone is enough for funnel
    // and retention queries.
    client.identify(userId);
  } else {
    client.reset();
  }
}

export const analyticsEnabled = (): boolean => Boolean(client);
