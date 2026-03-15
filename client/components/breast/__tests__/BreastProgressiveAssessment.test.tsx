import React, { useMemo, useState } from "react";
import TestRenderer, { act } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { BreastProgressiveAssessment } from "@/components/breast/BreastProgressiveAssessment";
import { getDiagnosesForSpecialty } from "@/lib/diagnosisPicklists";
import type { DiagnosisPicklistEntry } from "@/types/diagnosis";
import type { BreastAssessmentData } from "@/types/breast";
import type { CaseProcedure } from "@/types/case";

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
  selectionAsync: vi.fn(),
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

vi.mock("@/hooks/useFavouritesRecents", () => ({
  useFavouritesRecents: () => ({
    favouriteDiagnoses: [],
    recentDiagnoses: [],
    isFavourite: () => false,
    toggleFavourite: vi.fn(),
    loaded: true,
  }),
}));

vi.mock("@/components/FavouritesRecentsChips", () => ({
  FavouritesRecentsChips: (props: any) =>
    React.createElement("FavouritesRecentsChips", props),
}));

vi.mock("@/components/FormField", () => ({
  PickerField: (props: any) => React.createElement("PickerField", props),
}));

vi.mock("@/components/CompactProcedureList", () => ({
  CompactProcedureList: (props: any) =>
    React.createElement("CompactProcedureList", props),
}));

vi.mock("@/components/ProcedureEntryCard", () => ({
  ProcedureEntryCard: (props: any) =>
    React.createElement("ProcedureEntryCard", props),
}));

vi.mock("@/components/ProcedureSubcategoryPicker", () => ({
  ProcedureSubcategoryPicker: (props: any) =>
    React.createElement("ProcedureSubcategoryPicker", props),
}));

vi.mock("@/components/SnomedSearchPicker", () => ({
  SnomedSearchPicker: (props: any) =>
    React.createElement("SnomedSearchPicker", props),
}));

vi.mock("@/components/skin-cancer/SectionWrapper", () => ({
  SectionWrapper: ({ children, isCollapsed, ...props }: any) =>
    React.createElement(
      "SectionWrapper",
      { ...props, isCollapsed },
      isCollapsed ? null : children,
    ),
}));

vi.mock("@/components/breast/BreastSideCard", () => ({
  BreastSideCard: (props: any) => React.createElement("BreastSideCard", props),
}));

vi.mock("@/components/breast/BreastFlapCard", () => ({
  BreastFlapCard: (props: any) => React.createElement("BreastFlapCard", props),
}));

vi.mock("@/components/breast/ChestMasculinisationCard", () => ({
  ChestMasculinisationCard: (props: any) =>
    React.createElement("ChestMasculinisationCard", props),
}));

vi.mock("@/components/breast/ImplantDetailsCard", () => ({
  ImplantDetailsCard: (props: any) =>
    React.createElement("ImplantDetailsCard", props),
}));

vi.mock("@/components/breast/LipofillingCard", () => ({
  LipofillingCard: (props: any) => React.createElement("LipofillingCard", props),
}));

vi.mock("@/components/breast/LiposuctionCard", () => ({
  LiposuctionCard: (props: any) => React.createElement("LiposuctionCard", props),
}));

vi.mock("@/components/breast/NippleDetailsCard", () => ({
  NippleDetailsCard: (props: any) =>
    React.createElement("NippleDetailsCard", props),
}));

vi.mock("@/components/breast/BreastSummaryPanel", () => ({
  BreastSummaryPanel: (props: any) =>
    React.createElement("BreastSummaryPanel", props),
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

function findSection(
  tree: TestRenderer.ReactTestRenderer,
  title: string,
): TestRenderer.ReactTestInstance {
  return tree.root.find(
    (node) =>
      node.type === ("SectionWrapper" as any) && node.props.title === title,
  );
}

function makeProcedure(picklistId: string): CaseProcedure {
  const names: Record<string, string> = {
    breast_onco_ssm: "Skin-sparing mastectomy + immediate reconstruction",
    breast_impl_dti: "Direct-to-implant reconstruction",
  };

  const tags: Record<string, string[]> = {
    breast_impl_dti: ["implant"],
  };

  return {
    id: `proc-${picklistId}`,
    sequenceOrder: 1,
    procedureName: names[picklistId] ?? picklistId,
    specialty: "breast",
    surgeonRole: "PS",
    picklistEntryId: picklistId,
    tags: tags[picklistId],
  };
}

interface HarnessProps {
  assessment?: BreastAssessmentData;
  hasPersistedAssessment?: boolean;
  initialDiagnosisId?: string;
  initialProcedures?: CaseProcedure[];
}

function Harness({
  assessment: initialAssessment = {
    laterality: "left",
    sides: {
      left: {
        side: "left",
        clinicalContext: "reconstructive",
        reconstructionTiming: "immediate",
      },
    },
  },
  hasPersistedAssessment = false,
  initialDiagnosisId,
  initialProcedures = [],
}: HarnessProps) {
  const diagnoses = useMemo(() => getDiagnosesForSpecialty("breast"), []);
  const [assessment, setAssessment] = useState(initialAssessment);
  const [selectedDiagnosis, setSelectedDiagnosis] =
    useState<DiagnosisPicklistEntry | null>(
      initialDiagnosisId
        ? diagnoses.find((diagnosis) => diagnosis.id === initialDiagnosisId) ?? null
        : null,
    );
  const [primaryDiagnosis, setPrimaryDiagnosis] = useState<{
    conceptId: string;
    term: string;
  } | null>(
    selectedDiagnosis
      ? {
          conceptId: selectedDiagnosis.snomedCtCode,
          term: selectedDiagnosis.displayName,
        }
      : null,
  );
  const [stagingValues, setStagingValues] = useState<Record<string, string>>({});
  const [procedures, setProcedures] = useState(initialProcedures);

  const diagnosisStaging = selectedDiagnosis?.hasStaging
    ? {
        snomedCtCodes: [selectedDiagnosis.snomedCtCode],
        keywords: [selectedDiagnosis.displayName],
        stagingSystems: [
          {
            name: "TNM Stage",
            options: [{ value: "t1", label: "T1" }],
          },
        ],
      }
    : null;

  return (
    <BreastProgressiveAssessment
      assessment={assessment}
      onAssessmentChange={setAssessment}
      defaultClinicalContext="reconstructive"
      hasPersistedAssessment={hasPersistedAssessment}
      selectedDiagnosis={selectedDiagnosis}
      primaryDiagnosis={primaryDiagnosis}
      diagnosisStaging={diagnosisStaging}
      stagingValues={stagingValues}
      onDiagnosisSelect={(diagnosis) => {
        setSelectedDiagnosis(diagnosis);
        setPrimaryDiagnosis({
          conceptId: diagnosis.snomedCtCode,
          term: diagnosis.displayName,
        });
      }}
      onSnomedDiagnosisSelect={(diagnosis) => {
        setPrimaryDiagnosis(diagnosis);
        setSelectedDiagnosis(null);
      }}
      onDiagnosisClear={() => {
        setSelectedDiagnosis(null);
        setPrimaryDiagnosis(null);
      }}
      onStagingChange={(systemName, value) =>
        setStagingValues((current) => ({ ...current, [systemName]: value }))
      }
      committedProcedures={procedures}
      hasAcceptedMapping={procedures.some((procedure) => procedure.procedureName.trim())}
      onCommittedProceduresChange={setProcedures}
      createProcedureFromPicklistId={makeProcedure}
    />
  );
}

describe("BreastProgressiveAssessment", () => {
  it("keeps diagnosis hidden until laterality is explicitly confirmed", () => {
    let tree: TestRenderer.ReactTestRenderer;

    act(() => {
      tree = TestRenderer.create(<Harness />);
    });

    expect(
      tree!.root.findAll(
        (node) =>
          node.type === ("SectionWrapper" as any) &&
          node.props.title === "2. Diagnosis",
      ),
    ).toHaveLength(0);

    act(() => {
      findPressableByText(tree!, "Left").props.onPress();
    });

    expect(findSection(tree!, "2. Diagnosis").props.title).toBe("2. Diagnosis");
  });

  it("collapses diagnosis after selection and allows reopening completed sections", () => {
    let tree: TestRenderer.ReactTestRenderer;

    act(() => {
      tree = TestRenderer.create(<Harness hasPersistedAssessment />);
    });

    expect(findSection(tree!, "1. Breast Assessment").props.isCollapsed).toBe(
      true,
    );

    act(() => {
      findPressableByText(tree!, "Breast cancer — invasive").props.onPress();
    });

    expect(findSection(tree!, "2. Diagnosis").props.isCollapsed).toBe(true);
    expect(findSection(tree!, "3. Summary & Procedures").props.title).toBe(
      "3. Summary & Procedures",
    );
    expect(
      tree!.root.findAll((node) => node.type === ("PickerField" as any)),
    ).toHaveLength(0);

    act(() => {
      findSection(tree!, "2. Diagnosis").props.onCollapsedChange(false);
    });

    expect(findSection(tree!, "2. Diagnosis").props.isCollapsed).toBe(false);
    expect(
      tree!.root.findAll((node) => node.type === ("PickerField" as any)),
    ).toHaveLength(1);

    act(() => {
      findSection(tree!, "1. Breast Assessment").props.onCollapsedChange(false);
    });

    expect(findSection(tree!, "1. Breast Assessment").props.isCollapsed).toBe(
      false,
    );
  });

  it("adds post-accept detail sections with contiguous numbering", () => {
    let tree: TestRenderer.ReactTestRenderer;

    act(() => {
      tree = TestRenderer.create(
        <Harness
          hasPersistedAssessment
          initialDiagnosisId="breast_dx_invasive_cancer"
          initialProcedures={[makeProcedure("breast_impl_dti")]}
        />,
      );
    });

    const titles = tree!.root
      .findAll((node) => node.type === ("SectionWrapper" as any))
      .map((node) => node.props.title);

    expect(titles).toEqual(
      expect.arrayContaining([
        "1. Breast Assessment",
        "2. Diagnosis",
        "3. Summary & Procedures",
        "4. Implant Details",
      ]),
    );
  });
});
