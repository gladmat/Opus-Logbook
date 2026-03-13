import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AppState, StyleSheet, View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
  Theme,
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
import { ingestPendingLockedCameraCaptures } from "@/lib/sharedCaptureIngress";

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
    <NavigationContainer theme={navigationTheme} linking={linking}>
      {children}
    </NavigationContainer>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);

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
      } catch (error) {
        console.warn("[App] Inbox initialization failed:", error);
      }

      setReady(true);
    }
    prepare();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void ingestPendingLockedCameraCaptures().catch(console.warn);
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
});
