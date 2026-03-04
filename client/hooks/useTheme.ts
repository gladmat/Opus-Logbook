import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "@/constants/theme";

type ColorScheme = "light" | "dark";
type ThemePreference = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: typeof Colors.light;
  isDark: boolean;
  colorScheme: ColorScheme;
  preference: ThemePreference;
  toggleColorScheme: () => void;
  setColorScheme: (scheme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "@theme_preference";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [userPreference, setUserPreference] = useState<ThemePreference | null>(
    null,
  );

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === "light" || v === "dark" || v === "system") setUserPreference(v);
    });
  }, []);

  const preference: ThemePreference = userPreference ?? "system";
  const colorScheme: ColorScheme =
    preference === "system" ? (systemScheme ?? "dark") : preference;
  const isDark = colorScheme === "dark";
  const theme = Colors[colorScheme];

  const toggleColorScheme = useCallback(() => {
    const next: ColorScheme = isDark ? "light" : "dark";
    setUserPreference(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
  }, [isDark]);

  const setColorSchemeValue = useCallback((scheme: ThemePreference) => {
    setUserPreference(scheme);
    AsyncStorage.setItem(STORAGE_KEY, scheme);
  }, []);

  const value: ThemeContextValue = React.useMemo(
    () => ({
      theme,
      isDark,
      colorScheme,
      preference,
      toggleColorScheme,
      setColorScheme: setColorSchemeValue,
    }),
    [
      theme,
      isDark,
      colorScheme,
      preference,
      toggleColorScheme,
      setColorSchemeValue,
    ],
  );

  return React.createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
