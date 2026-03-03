import React, { forwardRef } from "react";
import { Platform, ScrollView, ScrollViewProps } from "react-native";
import {
  KeyboardAwareScrollView,
  KeyboardAwareScrollViewProps,
} from "react-native-keyboard-controller";

type Props = KeyboardAwareScrollViewProps & ScrollViewProps;

/**
 * KeyboardAwareScrollView that falls back to ScrollView on web.
 * Use this for any screen containing text inputs.
 * Includes scroll position maintenance to prevent jumping on state updates.
 */
export const KeyboardAwareScrollViewCompat = forwardRef<ScrollView, Props>(
  function KeyboardAwareScrollViewCompat(
    { children, keyboardShouldPersistTaps = "handled", ...props },
    ref
  ) {
    const scrollViewProps = {
      keyboardShouldPersistTaps,
      keyboardDismissMode: "interactive" as const,
      // Prevent scroll jumping when content changes (iOS)
      maintainVisibleContentPosition: Platform.OS === "ios"
        ? { minIndexForVisible: 0 }
        : undefined,
      ...props,
    };

    if (Platform.OS === "web") {
      return (
        <ScrollView ref={ref} {...scrollViewProps}>
          {children}
        </ScrollView>
      );
    }

    return (
      <KeyboardAwareScrollView ref={ref as any} {...scrollViewProps}>
        {children}
      </KeyboardAwareScrollView>
    );
  }
);
