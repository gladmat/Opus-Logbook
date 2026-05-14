import { useEffect, useRef } from "react";
import * as Linking from "expo-linking";
import { useAuth } from "@/contexts/AuthContext";
import { seedAuditCases } from "@/lib/devSeed";

// Dev-only deep-link helpers for automated audit runs.
//
// `opus://debug/login` (optionally `?email=…&password=…`) calls AuthContext
// `login()` directly, skipping EmailSignupScreen. iOS's "Use Strong Password?"
// sheet intercepts the password TextInput during automated sign-in runs — only
// the first keystroke reaches React state, so every scripted login returns 401.
//
// `opus://debug/seed` populates on-device storage with a varied set of cases
// (+ one treatment episode) so the data-dependent surfaces (CaseDetail,
// EpisodeList/Detail, NeedsAttentionList, populated Dashboard/Statistics) can
// be visually audited without hand-driving the case form six times.
//
// Real users keep the normal flow untouched. Tree-shaken from production: the
// sole call site guards on `__DEV__` and the effect bails on `!__DEV__` as a
// second line of defence.
//
// Trigger from the host:  xcrun simctl openurl booted "opus://debug/login"
//                         xcrun simctl openurl booted "opus://debug/seed"
const DEFAULT_EMAIL = "m.gladysz@outlook.com";
const DEFAULT_PASSWORD = "testtest";

export function DevDeepLinkHandler() {
  const { login, isAuthenticated } = useAuth();
  const authRef = useRef({ login, isAuthenticated });
  authRef.current = { login, isAuthenticated };
  const handlingRef = useRef(false);

  useEffect(() => {
    if (!__DEV__) return;

    async function handleUrl(url: string | null) {
      if (!url) return;

      if (url.includes("debug/login")) {
        if (authRef.current.isAuthenticated || handlingRef.current) return;
        handlingRef.current = true;
        try {
          const { queryParams } = Linking.parse(url);
          const email =
            typeof queryParams?.email === "string"
              ? queryParams.email
              : DEFAULT_EMAIL;
          const password =
            typeof queryParams?.password === "string"
              ? queryParams.password
              : DEFAULT_PASSWORD;
          await authRef.current.login(email, password);
          console.log(`[DevDeepLink] signed in as ${email}`);
        } catch (error) {
          console.warn("[DevDeepLink] login failed:", error);
        } finally {
          handlingRef.current = false;
        }
        return;
      }

      if (url.includes("debug/seed")) {
        if (handlingRef.current) return;
        handlingRef.current = true;
        try {
          const result = await seedAuditCases();
          console.log(
            `[DevDeepLink] seeded ${result.cases} cases + ${result.episodes} episode(s)`,
          );
        } catch (error) {
          console.warn("[DevDeepLink] seed failed:", error);
        } finally {
          handlingRef.current = false;
        }
      }
    }

    void Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener("url", (event) => {
      void handleUrl(event.url);
    });
    return () => subscription.remove();
  }, []);

  return null;
}
