import React, { useEffect, useMemo } from "react";
import { StyleSheet } from "react-native";
import { NavigationContainer, DefaultTheme, DarkTheme, Theme } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider, KeyboardController } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { MediaCallbackProvider } from "@/contexts/MediaCallbackContext";
import { ThemeProvider, useTheme } from "@/hooks/useTheme";

function StatusBarThemed() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? "light" : "dark"} />;
}

function ThemedNavigationContainer({ children }: { children: React.ReactNode }) {
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

  return <NavigationContainer theme={navigationTheme}>{children}</NavigationContainer>;
}

export default function App() {
  useEffect(() => {
    KeyboardController.preload();
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <MediaCallbackProvider>
              <SafeAreaProvider>
                <GestureHandlerRootView style={styles.root}>
                  <KeyboardProvider>
                    <ThemedNavigationContainer>
                      <RootStackNavigator />
                    </ThemedNavigationContainer>
                    <StatusBarThemed />
                  </KeyboardProvider>
                </GestureHandlerRootView>
              </SafeAreaProvider>
            </MediaCallbackProvider>
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
