import React, { useMemo } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useCaseFormState } from "@/contexts/CaseFormContext";
import { useTheme } from "@/hooks/useTheme";
import {
  Spacing,
  BorderRadius,
  Shadows,
  Typography,
  Fonts,
} from "@/constants/theme";
import {
  SPECIALTY_LABELS,
  SLNB_BASIN_LABELS,
  EXCISION_COMPLETENESS_LABELS,
  type ClinicalDetails,
  type FreeFlapDetails,
  type SlnbDetails,
  type SkinLesionExcisionDetails,
  type HandSurgeryDetails,
  type BodyContouringDetails,
} from "@/types/case";
import { Button } from "@/components/Button";
import { validateRequiredFields } from "@/hooks/useCaseForm";

interface CaseSummaryViewProps {
  onEdit: (sectionId: string) => void;
  onConfirmSave: () => void;
  onBackToEdit: () => void;
  saving: boolean;
}

// ── Sub-components ────────────────────────────────────────────────────────

function SummaryCard({
  title,
  sectionId,
  onEdit,
  accentColor,
  warning,
  children,
}: {
  title: string;
  sectionId: string;
  onEdit: (sectionId: string) => void;
  accentColor?: string;
  warning?: string;
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundElevated,
          borderLeftColor: accentColor || "transparent",
          borderLeftWidth: accentColor ? 4 : 0,
        },
        Shadows.card,
      ]}
    >
      <View style={styles.cardHeader}>
        <ThemedText style={[styles.cardTitle, { color: theme.text }]}>
          {title}
        </ThemedText>
        <Pressable onPress={() => onEdit(sectionId)} hitSlop={8}>
          <ThemedText style={[styles.editLink, { color: theme.link }]}>
            Edit
          </ThemedText>
        </Pressable>
      </View>
      {warning ? (
        <View style={styles.warningRow}>
          <Feather name="alert-triangle" size={14} color={theme.warning} />
          <ThemedText style={[styles.warningText, { color: theme.warning }]}>
            {warning}
          </ThemedText>
        </View>
      ) : null}
      {children}
    </View>
  );
}

function SummaryRow({
  label,
  value,
  snomedCode,
  mono,
}: {
  label: string;
  value?: string | null;
  snomedCode?: string;
  mono?: boolean;
}) {
  const { theme } = useTheme();
  if (!value) return null;
  return (
    <View style={styles.row}>
      <ThemedText style={[styles.rowLabel, { color: theme.textTertiary }]}>
        {label}
      </ThemedText>
      <ThemedText
        style={[
          styles.rowValue,
          { color: theme.text },
          mono ? { fontFamily: Fonts?.mono, fontSize: 14 } : undefined,
        ]}
      >
        {value}
      </ThemedText>
      {snomedCode ? (
        <ThemedText style={[styles.snomedCode, { color: theme.textTertiary }]}>
          SNOMED: {snomedCode}
        </ThemedText>
      ) : null}
    </View>
  );
}

// ── Type Guards ───────────────────────────────────────────────────────────

function isFreeFlapDetails(d: ClinicalDetails): d is FreeFlapDetails {
  return "anastomoses" in d;
}
function isSlnbDetails(d: ClinicalDetails): d is SlnbDetails {
  return "basins" in d;
}
function isSkinLesionDetails(
  d: ClinicalDetails,
): d is SkinLesionExcisionDetails {
  return "excisionCompleteness" in d;
}
function isHandSurgeryDetails(d: ClinicalDetails): d is HandSurgeryDetails {
  return "fractures" in d && Array.isArray((d as HandSurgeryDetails).fractures);
}
function isBodyContouringDetails(
  d: ClinicalDetails,
): d is BodyContouringDetails {
  return "resectionWeightGrams" in d;
}

// ── Procedure Clinical Detail Rows ───────────────────────────────────────

function ProcedureClinicalSummary({ details }: { details: ClinicalDetails }) {
  if (isFreeFlapDetails(details)) {
    const parts: string[] = [];
    if (details.flapDisplayName || details.flapType)
      parts.push(details.flapDisplayName || details.flapType || "");
    if (details.harvestSide) parts.push(`${details.harvestSide} side`);
    if (details.anastomoses?.length)
      parts.push(
        `${details.anastomoses.length} anastomos${details.anastomoses.length === 1 ? "is" : "es"}`,
      );
    if (details.ischemiaTimeMinutes)
      parts.push(`${details.ischemiaTimeMinutes} min ischaemia`);
    return parts.length > 0 ? (
      <SummaryRow label="Flap Details" value={parts.join(" · ")} />
    ) : null;
  }

  if (isSlnbDetails(details)) {
    const basinSummary = details.basins
      ?.map((b) => {
        const name = SLNB_BASIN_LABELS[b.basin] || b.basin;
        const nodes =
          b.nodesRemoved != null
            ? `${b.nodesPositive ?? 0}/${b.nodesRemoved}`
            : "";
        return nodes ? `${name} (${nodes})` : name;
      })
      .join(", ");
    const techniques: string[] = [];
    if (details.radioisotopeUsed) techniques.push("Radioisotope");
    if (details.blueDyeUsed) techniques.push("Blue dye");
    if (details.gammaProbeUsed) techniques.push("Gamma probe");
    if (details.spectCtPerformed) techniques.push("SPECT-CT");
    return (
      <>
        {basinSummary ? (
          <SummaryRow label="SLNB Basins" value={basinSummary} />
        ) : null}
        {techniques.length > 0 ? (
          <SummaryRow label="Technique" value={techniques.join(", ")} />
        ) : null}
      </>
    );
  }

  if (isSkinLesionDetails(details)) {
    const parts: string[] = [];
    if (details.peripheralMarginMm != null)
      parts.push(`${details.peripheralMarginMm}mm peripheral`);
    if (details.deepMarginMm != null)
      parts.push(`${details.deepMarginMm}mm deep`);
    if (details.excisionCompleteness)
      parts.push(EXCISION_COMPLETENESS_LABELS[details.excisionCompleteness]);
    return parts.length > 0 ? (
      <SummaryRow label="Excision" value={parts.join(" · ")} />
    ) : null;
  }

  if (isHandSurgeryDetails(details) && details.fractures?.length) {
    const fractureSummary = details.fractures
      .map((f) => `${f.boneName} (${f.aoCode})`)
      .join(", ");
    return <SummaryRow label="Fractures" value={fractureSummary} />;
  }

  if (isBodyContouringDetails(details) && details.resectionWeightGrams) {
    return (
      <SummaryRow
        label="Resection Weight"
        value={`${details.resectionWeightGrams}g`}
        mono
      />
    );
  }

  return null;
}

// ── Main Component ────────────────────────────────────────────────────────

export function CaseSummaryView({
  onEdit,
  onConfirmSave,
  onBackToEdit,
  saving,
}: CaseSummaryViewProps) {
  const { theme } = useTheme();
  const { state, calculatedBmi, durationDisplay, specialty } =
    useCaseFormState();

  const { valid, errors } = useMemo(
    () => validateRequiredFields(state),
    [state],
  );

  const hasWarnings = errors.length > 0;
  const patientWarning = errors.find((e) => e.sectionId === "patient")?.message;
  const diagnosisWarning = errors.find(
    (e) => e.sectionId === "diagnosis",
  )?.message;

  return (
    <View style={styles.container}>
      {/* Patient Info */}
      <SummaryCard
        title="Patient Info"
        sectionId="patient"
        onEdit={onEdit}
        warning={patientWarning}
      >
        <SummaryRow label="Patient ID" value={state.patientIdentifier} />
        <SummaryRow label="Procedure Date" value={state.procedureDate} mono />
        <SummaryRow label="Facility" value={state.facility} />
        <SummaryRow label="Gender" value={state.gender || undefined} />
        <SummaryRow
          label="Age"
          value={state.age ? `${state.age} years` : undefined}
          mono
        />
        <SummaryRow label="Ethnicity" value={state.ethnicity || undefined} />
      </SummaryCard>

      {/* Diagnosis Groups */}
      {state.diagnosisGroups.map((group, idx) => {
        const accentColor =
          idx === 0
            ? theme.link
            : idx === 1
              ? theme.link + "99"
              : theme.link + "59";
        return (
          <SummaryCard
            key={group.id}
            title={`Diagnosis Group ${idx + 1}`}
            sectionId="diagnosis"
            onEdit={onEdit}
            accentColor={accentColor}
            warning={idx === 0 ? diagnosisWarning : undefined}
          >
            <SummaryRow
              label="Specialty"
              value={SPECIALTY_LABELS[group.specialty]}
            />
            <SummaryRow
              label="Diagnosis"
              value={group.diagnosis?.displayName}
              snomedCode={group.diagnosis?.snomedCtCode}
            />
            {group.diagnosisStagingSelections &&
              Object.entries(group.diagnosisStagingSelections).length > 0 && (
                <SummaryRow
                  label="Staging"
                  value={Object.entries(group.diagnosisStagingSelections)
                    .map(([system, value]) => `${system}: ${value}`)
                    .join(" · ")}
                />
              )}
            {group.isMultiLesion &&
              group.lesionInstances &&
              group.lesionInstances.length > 0 && (
                <SummaryRow
                  label="Lesions"
                  value={group.lesionInstances
                    .map(
                      (l) =>
                        l.site +
                        (l.pathologyType ? ` (${l.pathologyType})` : ""),
                    )
                    .join(", ")}
                />
              )}
            {group.procedures.map((proc, pIdx) => (
              <View key={proc.id}>
                <SummaryRow
                  label={`Procedure ${pIdx + 1}`}
                  value={proc.procedureName}
                  snomedCode={proc.snomedCtCode || proc.snomedCtDisplay}
                />
                {proc.clinicalDetails ? (
                  <ProcedureClinicalSummary details={proc.clinicalDetails} />
                ) : null}
              </View>
            ))}
          </SummaryCard>
        );
      })}

      {/* Admission */}
      <SummaryCard title="Admission" sectionId="admission" onEdit={onEdit}>
        <SummaryRow
          label="Urgency"
          value={state.admissionUrgency || undefined}
        />
        <SummaryRow label="Stay Type" value={state.stayType || undefined} />
        <SummaryRow
          label="Admission Date"
          value={state.admissionDate || undefined}
          mono
        />
        <SummaryRow
          label="Discharge Date"
          value={state.dischargeDate || undefined}
          mono
        />
        <SummaryRow
          label="Injury Date"
          value={state.injuryDate || undefined}
          mono
        />
      </SummaryCard>

      {/* Media */}
      <SummaryCard title="Operative Media" sectionId="media" onEdit={onEdit}>
        <SummaryRow
          label="Attached"
          value={
            state.operativeMedia.length > 0
              ? `${state.operativeMedia.length} item${state.operativeMedia.length !== 1 ? "s" : ""}`
              : "None"
          }
          mono
        />
      </SummaryCard>

      {/* Patient Factors */}
      <SummaryCard title="Patient Factors" sectionId="factors" onEdit={onEdit}>
        <SummaryRow
          label="ASA Score"
          value={state.asaScore || undefined}
          mono
        />
        <SummaryRow
          label="BMI"
          value={calculatedBmi ? `${calculatedBmi}` : undefined}
          mono
        />
        <SummaryRow
          label="Height"
          value={state.heightCm ? `${state.heightCm} cm` : undefined}
          mono
        />
        <SummaryRow
          label="Weight"
          value={state.weightKg ? `${state.weightKg} kg` : undefined}
          mono
        />
        <SummaryRow label="Smoking" value={state.smoker || undefined} />
        <SummaryRow
          label="Comorbidities"
          value={
            state.selectedComorbidities.length > 0
              ? state.selectedComorbidities.map((c) => c.displayName).join(", ")
              : undefined
          }
        />
      </SummaryCard>

      {/* Operative Factors */}
      <SummaryCard
        title="Operative Factors"
        sectionId="operative"
        onEdit={onEdit}
      >
        <SummaryRow
          label="Anaesthetic"
          value={state.anaestheticType || undefined}
        />
        <SummaryRow
          label="Wound Risk"
          value={state.woundInfectionRisk || undefined}
        />
        <SummaryRow
          label="Start Time"
          value={state.surgeryStartTime || undefined}
          mono
        />
        <SummaryRow
          label="End Time"
          value={state.surgeryEndTime || undefined}
          mono
        />
        <SummaryRow label="Duration" value={durationDisplay} mono />
        <SummaryRow label="Role" value={state.role} />
        <SummaryRow
          label="Antibiotics"
          value={state.antibioticProphylaxis ? "Yes" : undefined}
        />
        <SummaryRow
          label="DVT Prophylaxis"
          value={state.dvtProphylaxis ? "Yes" : undefined}
        />
        {state.operatingTeam.length > 0 ? (
          <SummaryRow
            label="Team"
            value={state.operatingTeam
              .map((m) => `${m.name} (${m.role})`)
              .join(", ")}
          />
        ) : null}
      </SummaryCard>

      {/* Infection */}
      {state.infectionOverlay ? (
        <SummaryCard title="Infection" sectionId="infection" onEdit={onEdit}>
          <SummaryRow label="Documented" value="Yes" />
        </SummaryCard>
      ) : null}

      {/* Outcomes */}
      <SummaryCard title="Outcomes" sectionId="outcomes" onEdit={onEdit}>
        <SummaryRow label="Outcome" value={state.outcome || undefined} />
        <SummaryRow
          label="Return to Theatre"
          value={state.returnToTheatre ? "Yes" : undefined}
        />
        <SummaryRow
          label="Return Reason"
          value={state.returnToTheatreReason || undefined}
        />
        <SummaryRow
          label="Unplanned ICU"
          value={state.unplannedICU !== "no" ? state.unplannedICU : undefined}
        />
        <SummaryRow
          label="MDM Discussed"
          value={state.discussedAtMDM ? "Yes" : undefined}
        />
      </SummaryCard>

      {/* Buttons */}
      <View style={styles.buttonGroup}>
        <Button onPress={onConfirmSave} disabled={saving || hasWarnings}>
          {saving ? "Saving..." : "Confirm & Save"}
        </Button>
        <Pressable onPress={onBackToEdit} style={styles.backButton}>
          <ThemedText style={[styles.backButtonText, { color: theme.link }]}>
            Back to Edit
          </ThemedText>
        </Pressable>
      </View>

      {hasWarnings ? (
        <View
          style={[
            styles.warningBanner,
            {
              backgroundColor: theme.warning + "10",
              borderColor: theme.warning + "40",
            },
          ]}
        >
          <Feather name="alert-triangle" size={16} color={theme.warning} />
          <ThemedText
            style={[styles.warningBannerText, { color: theme.warning }]}
          >
            Complete all required fields to save
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  card: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    padding: Spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  editLink: {
    fontSize: 14,
    fontWeight: "600",
  },
  warningRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  warningText: {
    fontSize: 13,
    fontWeight: "500",
  },
  row: {
    paddingVertical: Spacing.xs,
  },
  rowLabel: {
    ...Typography.caption,
    marginBottom: 2,
  },
  rowValue: {
    ...Typography.small,
  },
  snomedCode: {
    ...Typography.caption,
    marginTop: 2,
  },
  buttonGroup: {
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  backButton: {
    alignItems: "center",
    padding: Spacing.md,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  warningBannerText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
