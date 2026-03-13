import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { JointImplantSection } from "@/components/joint-implant/JointImplantSection";

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
    TextInput: createPrimitive("TextInput"),
    Switch: createPrimitive("Switch"),
    Platform: {
      OS: "ios",
      select: <T,>(options: { ios?: T; default?: T; web?: T }) =>
        options.ios ?? options.default ?? options.web,
    },
    StyleSheet: {
      create: <T,>(styles: T) => styles,
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
  },
}));

vi.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({
    theme: {
      link: "#E5A00D",
      warning: "#F59E0B",
      backgroundSecondary: "#20232A",
      backgroundElevated: "#111827",
      border: "#444",
      text: "#FFFFFF",
      textSecondary: "#D1D5DB",
      textTertiary: "#9CA3AF",
    },
  }),
}));

vi.mock("@/components/ThemedText", () => ({
  ThemedText: ({ children, ...props }: any) =>
    React.createElement("Text", props, children),
}));

vi.mock("@/components/FeatherIcon", () => ({
  Feather: (props: any) => React.createElement("Feather", props),
}));

describe("JointImplantSection", () => {
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

  it("only exposes left and right laterality choices and flags legacy laterality", () => {
    let tree: TestRenderer.ReactTestRenderer;

    act(() => {
      tree = TestRenderer.create(
        <JointImplantSection
          procedurePicklistId="hand_joint_mcp_arthroplasty"
          diagnosisId="hand_dx_rheumatoid_mcp"
          value={{
            jointType: "mcp",
            indication: "ra",
            procedureType: "primary",
            implantSystemId: "mcp_swanson",
            laterality: "bilateral",
            digit: "II",
            sizeUnified: "4",
            approach: "dorsal_longitudinal",
            fixation: "not_applicable",
            bearingSurface: "silicone",
          }}
          onChange={vi.fn()}
        />,
      );
    });

    const textContent = tree!.root
      .findAll((node) => node.type === ("Text" as any))
      .flatMap((node) => {
        const children = node.props.children;
        return Array.isArray(children) ? children : [children];
      })
      .filter((value): value is string => typeof value === "string");

    expect(textContent).toContain("Left");
    expect(textContent).toContain("Right");
    expect(textContent).not.toContain("Bilateral");
    expect(textContent).not.toContain("Not applicable");
    expect(textContent).toContain(
      "Choose Left or Right. Bilateral implant cases need separate procedure rows for registry-complete reporting.",
    );
  });
});
