import { useMemo } from "react";
import { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { isLiquidGlassAvailable } from "expo-glass-effect";

import { useTheme } from "@/hooks/useTheme";

// Device capability — constant for the process. Evaluated once instead of a
// native call on every render of every navigator that consumes the options.
const LIQUID_GLASS_AVAILABLE = isLiquidGlassAvailable();

export function useScreenOptions(): NativeStackNavigationOptions {
  const { theme } = useTheme();

  // Memoised on the theme so `screenOptions` keeps a stable identity across
  // navigator re-renders (a fresh object re-applies native header options
  // to every screen in the stack).
  return useMemo<NativeStackNavigationOptions>(
    () => ({
      headerTitleAlign: "center",
      headerTransparent: false,
      headerTintColor: theme.link, // Amber for interactive back chevron
      headerTitleStyle: {
        color: theme.text,
        fontWeight: "600",
        fontSize: 17,
      },
      headerBackTitle: "", // Clean chevron-only back button
      // iOS 26 falls back to the previous ROUTE NAME ("CaseDetail",
      // "Main") when the back title is empty — "minimal" is the supported
      // way to get a chevron-only back button on native-stack 7.
      headerBackButtonDisplayMode: "minimal",
      headerShadowVisible: false,
      headerStyle: {
        backgroundColor: theme.backgroundRoot,
      },
      gestureEnabled: true,
      gestureDirection: "horizontal",
      fullScreenGestureEnabled: !LIQUID_GLASS_AVAILABLE,
      contentStyle: {
        backgroundColor: theme.backgroundRoot,
      },
    }),
    [theme],
  );
}
