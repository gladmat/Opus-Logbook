import React from "react";
import { Text } from "react-native";
import TestRenderer, { act } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MediaTagBadge } from "@/components/media/MediaTagBadge";
import { MediaTagPicker } from "@/components/media/MediaTagPicker";
import { Colors } from "@/constants/theme";
import { resolveMediaTag } from "@/lib/mediaTagHelpers";
import type { OperativeMediaItem } from "@/types/case";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("react-native", async () => {
  const React = await import("react");

  const createPrimitive = (displayName: string) => {
    const Primitive = React.forwardRef<
      any,
      React.PropsWithChildren<Record<string, unknown>>
    >(({ children, ...props }, ref) =>
      React.createElement(
        displayName,
        { ...props, ref },
        children as React.ReactNode,
      ),
    );
    Primitive.displayName = displayName;
    return Primitive;
  };

  return {
    View: createPrimitive("View"),
    Text: createPrimitive("Text"),
    Pressable: createPrimitive("Pressable"),
    ScrollView: createPrimitive("ScrollView"),
    StyleSheet: {
      create: <T,>(styles: T) => styles,
    },
    Platform: {
      OS: "ios",
      select: <T,>(options: { ios?: T; default?: T; web?: T }) =>
        options.ios ?? options.default ?? options.web,
    },
  };
});

vi.mock("expo-haptics", () => ({
  selectionAsync: vi.fn(),
  impactAsync: vi.fn(),
  ImpactFeedbackStyle: {
    Light: "light",
  },
}));

vi.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({
    theme: Colors.light,
    isDark: false,
    colorScheme: "light",
    preference: "light",
    toggleColorScheme: vi.fn(),
    setColorScheme: vi.fn(),
  }),
}));

describe("media UI", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn> | undefined;

  beforeEach(() => {
    consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation((message) => {
        if (
          typeof message === "string" &&
          message.includes("react-test-renderer is deprecated")
        ) {
          return;
        }
      });
  });

  afterEach(() => {
    consoleErrorSpy?.mockRestore();
  });

  const getChipNodes = (
    tree: TestRenderer.ReactTestRenderer,
    testID: string,
  ): TestRenderer.ReactTestInstance[] =>
    tree.root.findAll(
      (node) =>
        node.props.testID === testID &&
        typeof node.props.onPress === "function",
    );

  it("resyncs MediaTagPicker chips when selectedTag changes groups", () => {
    const onSelectTag = vi.fn();
    let tree: TestRenderer.ReactTestRenderer;

    act(() => {
      tree = TestRenderer.create(
        <MediaTagPicker
          selectedTag="flap_harvest"
          onSelectTag={onSelectTag}
          relevantGroups={["temporal", "flap_surgery", "other"]}
        />,
      );
    });

    expect(
      getChipNodes(tree!, "caseForm.media.chip-tag-flap_harvest").length,
    ).toBeGreaterThan(0);
    expect(
      getChipNodes(tree!, "caseForm.media.chip-tag-followup_3m"),
    ).toHaveLength(0);

    act(() => {
      tree!.update(
        <MediaTagPicker
          selectedTag="followup_3m"
          onSelectTag={onSelectTag}
          relevantGroups={["temporal", "flap_surgery", "other"]}
        />,
      );
    });

    expect(
      getChipNodes(tree!, "caseForm.media.chip-tag-followup_3m").length,
    ).toBeGreaterThan(0);
    expect(
      getChipNodes(tree!, "caseForm.media.chip-tag-flap_harvest"),
    ).toHaveLength(0);
  });

  it("renders the resolved case-detail badge label for specific media tags", () => {
    const item: OperativeMediaItem = {
      id: "media-display",
      localUri: "opus-media:display",
      mimeType: "image/jpeg",
      createdAt: "2026-03-09T00:00:00Z",
      tag: "flap_perfusion",
    };

    let tree: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        <MediaTagBadge tag={resolveMediaTag(item)} size="small" />,
      );
    });

    const labelNode = tree!.root.findByType(Text);
    expect(labelNode.props.children).toBe("Perfusion check");
  });
});
