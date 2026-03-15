import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { BreastSummaryPanel } from "@/components/breast/BreastSummaryPanel";

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
    Pressable: createPrimitive("Pressable"),
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
  impactAsync: vi.fn(),
  ImpactFeedbackStyle: {
    Light: "light",
    Medium: "medium",
  },
}));

vi.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({
    theme: {
      link: "#E5A00D",
      success: "#2E9E5B",
      backgroundSecondary: "#20232A",
      backgroundDefault: "#17191F",
      backgroundTertiary: "#2B3039",
      border: "#444",
      buttonText: "#fff",
      text: "#fff",
      textSecondary: "#D0D4DA",
      textTertiary: "#9AA3AF",
    },
  }),
}));

vi.mock("@/components/FeatherIcon", () => ({
  Feather: (props: any) => React.createElement("Feather", props),
}));

vi.mock("@/components/ThemedText", () => ({
  ThemedText: ({ children, ...props }: any) =>
    React.createElement("Text", props, children),
}));

function getNodeText(node: TestRenderer.ReactTestInstance): string {
  return node.children
    .map((child) =>
      typeof child === "string" ? child : getNodeText(child as TestRenderer.ReactTestInstance),
    )
    .join("");
}

function findPressableByText(
  tree: TestRenderer.ReactTestRenderer,
  text: string,
): TestRenderer.ReactTestInstance {
  return tree.root.find(
    (node) =>
      node.type === ("Pressable" as any) &&
      typeof node.props.onPress === "function" &&
      getNodeText(node).includes(text),
  );
}

describe("BreastSummaryPanel", () => {
  it("keeps coding details collapsed by default and reveals SNOMED codes on demand", () => {
    let tree: TestRenderer.ReactTestRenderer;

    act(() => {
      tree = TestRenderer.create(
        <BreastSummaryPanel
          diagnosisName="Breast cancer — invasive"
          diagnosisCode="254837009"
          summaryChips={["Left", "Reconstructive", "Immediate"]}
          suggestedProcedures={[]}
          selectedSuggestedProcedureIds={new Set()}
          acceptedProcedures={[
            {
              id: "proc-1",
              sequenceOrder: 1,
              procedureName:
                "Skin-sparing mastectomy + immediate reconstruction",
              specialty: "breast",
              surgeonRole: "PS",
              snomedCtCode: "445528008",
            },
          ]}
          draftProcedureCount={1}
          isAccepted
          onToggleSuggestedProcedure={vi.fn()}
          onAccept={vi.fn()}
          onEditMapping={vi.fn()}
        />,
      );
    });

    expect(
      tree!.root.findAll(
        (node) =>
          node.type === ("Text" as any) &&
          getNodeText(node).includes("SNOMED CT 254837009"),
      ),
    ).toHaveLength(0);

    act(() => {
      findPressableByText(tree!, "Coding details").props.onPress();
    });

    expect(
      tree!.root.findAll(
        (node) =>
          node.type === ("Text" as any) &&
          getNodeText(node).includes("SNOMED CT 254837009"),
      ),
    ).toHaveLength(1);

    expect(
      tree!.root.findAll(
        (node) =>
          node.type === ("Text" as any) &&
          getNodeText(node).includes("SNOMED CT 445528008"),
      ),
    ).toHaveLength(1);
  });
});
