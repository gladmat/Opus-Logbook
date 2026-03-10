import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
  Theme,
} from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  KeyboardProvider,
  KeyboardController,
} from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLockProvider } from "@/contexts/AppLockContext";
import { MediaCallbackProvider } from "@/contexts/MediaCallbackContext";
import { ThemeProvider, useTheme } from "@/hooks/useTheme";

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

  return (
    <NavigationContainer theme={navigationTheme}>
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

      // Inbox orphan cleanup — async, non-blocking
      import("@/lib/inboxStorage")
        .then((m) => m.cleanupOrphanedInboxItems())
        .catch(console.warn);

      setReady(true);
    }
    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (ready) await SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
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
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
