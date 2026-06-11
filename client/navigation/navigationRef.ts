import { createNavigationContainerRef } from "@react-navigation/native";
import type { RootStackParamList } from "./RootStackNavigator";

/**
 * Module-level navigation ref so non-component code (push-notification
 * handlers in App.tsx, the TOFU mismatch alert in the case-save pipeline)
 * can navigate. Attached to the NavigationContainer in App.tsx.
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
