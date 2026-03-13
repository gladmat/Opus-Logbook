import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { BreastAssessment } from "@/components/breast/BreastAssessment";

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
    LayoutAnimation: {
      Presets: {
        easeInEaseOut: "easeInEaseOut",
      },
      configureNext: vi.fn(),
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
      backgroundSecondary: "#20232A",
      border: "#444",
      buttonText: "#fff",
      text: "#fff",
    },
  }),
}));

vi.mock("@/components/ThemedText", () => ({
  ThemedText: ({ children, ...props }: any) =>
    React.createElement("Text", props, children),
}));

vi.mock("@/components/breast/BreastSideCard", () => ({
  BreastSideCard: (props: any) => React.createElement("BreastSideCard", props),
}));

vi.mock("@/components/breast/LiposuctionCard", () => ({
  LiposuctionCard: (props: any) =>
    React.createElement("LiposuctionCard", props),
}));

vi.mock("@/components/breast/LipofillingCard", () => ({
  LipofillingCard: (props: any) =>
    React.createElement("LipofillingCard", props),
}));

describe("BreastAssessment", () => {
  const baseFlags = {
    showImplantDetails: false,
    showBreastFlapDetails: false,
    showPedicledFlapDetails: false,
    showLipofilling: false,
    showChestMasculinisation: false,
    showNippleDetails: false,
  };

  it("shows an initialized left side immediately on first open", () => {
    let tree: TestRenderer.ReactTestRenderer;

    act(() => {
      tree = TestRenderer.create(
        <BreastAssessment
          value={{ laterality: "left", sides: {} }}
          onChange={vi.fn()}
          moduleFlags={baseFlags}
          defaultClinicalContext="aesthetic"
        />,
      );
    });

    const sideCard = tree!.root.find(
      (node) => node.type === ("BreastSideCard" as any),
    );
    expect(sideCard.props.value.side).toBe("left");
    expect(sideCard.props.value.clinicalContext).toBe("aesthetic");
  });

  it("shows copy only when the opposite side is truly empty", () => {
    let tree: TestRenderer.ReactTestRenderer;

    act(() => {
      tree = TestRenderer.create(
        <BreastAssessment
          value={{
            laterality: "bilateral",
            sides: {
              left: {
                side: "left",
                clinicalContext: "reconstructive",
                reconstructionTiming: "immediate",
              },
              right: {
                side: "right",
                clinicalContext: "reconstructive",
              },
            },
          }}
          onChange={vi.fn()}
          moduleFlags={baseFlags}
        />,
      );
    });

    const sideCards = tree!.root.findAll(
      (node) => node.type === ("BreastSideCard" as any),
    );
    expect(sideCards[0]?.props.showCopyButton).toBe(true);
    expect(sideCards[1]?.props.showCopyButton).toBe(false);
  });

  it("renders one shared lipofilling card with the active sides", () => {
    let tree: TestRenderer.ReactTestRenderer;

    act(() => {
      tree = TestRenderer.create(
        <BreastAssessment
          value={{
            laterality: "bilateral",
            sides: {
              left: { side: "left", clinicalContext: "aesthetic" },
              right: { side: "right", clinicalContext: "reconstructive" },
            },
          }}
          onChange={vi.fn()}
          moduleFlags={{ ...baseFlags, showLipofilling: true }}
        />,
      );
    });

    const lipofillingCard = tree!.root.find(
      (node) => node.type === ("LipofillingCard" as any),
    );
    expect(lipofillingCard.props.activeSides).toEqual(["left", "right"]);
  });
});
