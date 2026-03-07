import { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { isLiquidGlassAvailable } from "expo-glass-effect";

import { useTheme } from "@/hooks/useTheme";

export function useScreenOptions(): NativeStackNavigationOptions {
  const { theme } = useTheme();

  return {
    headerTitleAlign: "center",
    headerTransparent: false,
    headerTintColor: theme.link, // Amber for interactive back chevron
    headerTitleStyle: {
      color: theme.text,
      fontWeight: "600",
      fontSize: 17,
    },
    headerBackTitle: "", // Clean chevron-only back button
    headerShadowVisible: false,
    headerStyle: {
      backgroundColor: theme.backgroundRoot,
    },
    gestureEnabled: true,
    gestureDirection: "horizontal",
    fullScreenGestureEnabled: isLiquidGlassAvailable() ? false : true,
    contentStyle: {
      backgroundColor: theme.backgroundRoot,
    },
  };
}
