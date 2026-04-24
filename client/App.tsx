import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AppState, StyleSheet, View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { OpusMark } from "@/components/brand";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
  Theme,
  createNavigationContainerRef,
  getStateFromPath as defaultGetStateFromPath,
  type LinkingOptions,
} from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  KeyboardProvider,
  KeyboardController,
} from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLockProvider } from "@/contexts/AppLockContext";
import { MediaCallbackProvider } from "@/contexts/MediaCallbackContext";
import { ThemeProvider, useTheme } from "@/hooks/useTheme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import {
  ingestPendingLockedCameraCaptures,
  sweepOrphanedLockedCameraFiles,
} from "@/lib/sharedCaptureIngress";

// ── Push notification foreground handler ─────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const navigationRef = createNavigationContainerRef<RootStackParamList>();

function handleNotificationNavigation(data: Record<string, unknown>) {
  const type = data.type as string | undefined;
  const sharedCaseId = data.sharedCaseId as string | undefined;

  if (!sharedCaseId || !navigationRef.isReady()) return;

  switch (type) {
    case "case_shared":
    case "shared_case_update":
      navigationRef.navigate("SharedCaseDetail", { sharedCaseId });
      break;
    case "verification":
      navigationRef.navigate("SharedInbox");
      break;
    case "assessments_revealed":
      navigationRef.navigate("AssessmentReveal", { sharedCaseId });
      break;
    case "assessment_pending":
      navigationRef.navigate("SharedCaseDetail", { sharedCaseId });
      break;
    default:
      break;
  }
}

// Keep native splash visible while we load assets
SplashScreen.preventAutoHideAsync();

function StatusBarThemed() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? "light" : "dark"} />;
}

function ThemedNavigationContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme, isDark } = useTheme();

  const navigationTheme: Theme = useMemo(
    () => ({
      ...(isDark ? DarkTheme : DefaultTheme),
      colors: {
        ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
        primary: theme.link,
        background: theme.backgroundRoot,
        card: theme.backgroundDefault,
        text: theme.text,
        border: theme.border,
        notification: theme.link,
      },
    }),
    [isDark, theme],
  );

  const linking = useMemo<LinkingOptions<RootStackParamList>>(
    () => ({
      prefixes: ["opus://"],
      config: {
        screens: {
          Inbox: "inbox",
          OpusCamera: "camera",
        },
      },
      getStateFromPath(path, options) {
        const state = defaultGetStateFromPath(path, options);
        const cameraRoute = state?.routes.find(
          (route) => route.name === "OpusCamera",
        );
        const cameraParams = cameraRoute?.params as
          | {
              mode?: unknown;
              targetMode?: unknown;
              quickSnap?: unknown;
            }
          | undefined;

        if (
          cameraParams &&
          (cameraParams.mode === "case" || cameraParams.mode === "inbox")
        ) {
          cameraParams.targetMode = cameraParams.mode;
          delete cameraParams.mode;
        }

        if (
          cameraParams &&
          cameraParams.targetMode === "inbox" &&
          cameraParams.quickSnap == null
        ) {
          cameraParams.quickSnap = true;
        }

        return state;
      },
    }),
    [],
  );

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navigationTheme}
      linking={linking}
    >
      {children}
    </NavigationContainer>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  // When iOS swipes the app up in the App Switcher (or backgrounds it via
  // Command+H / Home gesture), the OS takes a snapshot of the last-rendered
  // view and caches it to `~/Library/Caches/Snapshots/<bundle>/`. If the
  // last-rendered view contained a decrypted patient photo or case detail,
  // that plaintext snapshot persists on disk until the device is rebooted
  // and is readable by forensic tools. We block this by swapping the root
  // view to a branded opaque placeholder whenever the app becomes inactive.
  const [isAppObscured, setIsAppObscured] = useState(false);

  useEffect(() => {
    async function prepare() {
      KeyboardController.preload();
      // Preload onboarding feature images when they exist
      // await Asset.loadAsync([...]);

      try {
        const inboxStorage = await import("@/lib/inboxStorage");
        await inboxStorage.initializeInboxStorage();
        void inboxStorage.cleanupOrphanedInboxItems().catch(console.warn);
        void ingestPendingLockedCameraCaptures().catch(console.warn);
        // Also sweep any extension-produced JPEGs older than 7 days so the
        // plaintext shared-container window stays bounded even if a user
        // captures via the locked camera but never opens the app.
        void sweepOrphanedLockedCameraFiles().catch(console.warn);
      } catch (error) {
        console.warn("[App] Inbox initialization failed:", error);
      }

      setReady(true);
    }
    prepare();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      // Draw the privacy overlay BEFORE the OS takes its App-Switcher
      // snapshot. `inactive` fires as soon as the user starts the swipe
      // gesture, which is early enough that the snapshot captures the
      // overlay rather than the last rendered screen.
      setIsAppObscured(nextState !== "active");

      if (nextState === "active") {
        void ingestPendingLockedCameraCaptures().catch(console.warn);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Push notification response listener (handles notification taps)
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as
          | Record<string, unknown>
          | undefined;
        if (data) {
          handleNotificationNavigation(data);
        }
      },
    );

    // Cold start: check if app was opened from a notification
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        const data = response.notification.request.content.data as
          | Record<string, unknown>
          | undefined;
        if (data) {
          // Delay to allow navigation to be ready
          setTimeout(() => handleNotificationNavigation(data), 500);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (ready) await SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <AppLockProvider>
            <MediaCallbackProvider>
              <SafeAreaProvider>
                <GestureHandlerRootView style={styles.root}>
                  <KeyboardProvider>
                    <View style={styles.root} onLayout={onLayoutRootView}>
                      <ThemedNavigationContainer>
                        <RootStackNavigator />
                      </ThemedNavigationContainer>
                      <StatusBarThemed />
                      {isAppObscured ? (
                        <View
                          pointerEvents="none"
                          accessible={false}
                          style={styles.privacyOverlay}
                        >
                          <OpusMark size={64} color="#E5A00D" />
                        </View>
                      ) : null}
                    </View>
                  </KeyboardProvider>
                </GestureHandlerRootView>
              </SafeAreaProvider>
            </MediaCallbackProvider>
          </AppLockProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  privacyOverlay: {
    // Absolute-fill so it covers whatever the navigator last rendered,
    // including any decrypted patient photo. Backgrounded with the app's
    // charcoal root colour so it looks intentional in the App Switcher.
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#0C0F14",
    alignItems: "center",
    justifyContent: "center",
  },
});
