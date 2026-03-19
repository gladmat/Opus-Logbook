import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@/components/FeatherIcon";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import { PickerField } from "@/components/FormField";
import { FLAP_ELEVATION_PLANES } from "@/data/flapFieldConfig";
import {
  type FreeFlap,
  type ElevationPlane,
  FREE_FLAP_LABELS,
  ELEVATION_PLANE_LABELS,
} from "@/types/case";

interface FreeFlapPickerProps {
  flapType?: FreeFlap;
  elevationPlane?: ElevationPlane;
  onFlapTypeChange: (flapType: FreeFlap) => void;
  onElevationPlaneChange: (plane: ElevationPlane) => void;
  required?: boolean;
}

const ALL_FLAPS: FreeFlap[] = [
  "alt",
  "latissimus_dorsi",
  "gracilis",
  "tug",
  "scip",
  "siea",
  "radial_forearm",
  "fibula",
  "diep",
  "medial_sural",
  "sgap",
  "igap",
  "pap",
  "tdap",
  "parascapular",
  "scapular",
  "serratus_anterior",
  "other",
];

export function FreeFlapPicker({
  flapType,
  elevationPlane,
  onFlapTypeChange,
  onElevationPlaneChange,
  required = false,
}: FreeFlapPickerProps) {
  const { theme } = useTheme();

  const handleFlapSelect = (flap: FreeFlap) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onFlapTypeChange(flap);

    const newPlanes = FLAP_ELEVATION_PLANES[flap];
    if (newPlanes && elevationPlane && !newPlanes.includes(elevationPlane)) {
      onElevationPlaneChange("subfascial" as ElevationPlane);
    }
  };

  const elevationOptions = flapType
    ? (FLAP_ELEVATION_PLANES[flapType] || []).map(
        (plane) => plane as ElevationPlane,
      )
    : [];

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
          Flap Type
        </ThemedText>
        {required ? (
          <ThemedText style={[styles.required, { color: theme.error }]}>
            *
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.flapGrid}>
        {ALL_FLAPS.map((flap) => (
          <Pressable
            key={flap}
            onPress={() => handleFlapSelect(flap)}
            style={[
              styles.flapButton,
              {
                backgroundColor:
                  flapType === flap
                    ? theme.link + "15"
                    : theme.backgroundDefault,
                borderColor: flapType === flap ? theme.link : theme.border,
              },
            ]}
            testID={`caseForm.freeFlap.chip-flapType-${flap}`}
          >
            <ThemedText
              style={[
                styles.flapText,
                {
                  color: flapType === flap ? theme.link : theme.text,
                  fontWeight: flapType === flap ? "600" : "400",
                },
              ]}
            >
              {FREE_FLAP_LABELS[flap]}
            </ThemedText>
            {flapType === flap ? (
              <Feather
                name="check"
                size={14}
                color={theme.link}
                style={styles.checkIcon}
              />
            ) : null}
          </Pressable>
        ))}
      </View>

      {flapType && elevationOptions.length > 0 ? (
        <View style={styles.elevationSection}>
          <PickerField
            label="Elevation Plane"
            value={elevationPlane || ""}
            options={elevationOptions.map((plane) => ({
              value: plane,
              label: ELEVATION_PLANE_LABELS[plane],
            }))}
            onSelect={(value) =>
              onElevationPlaneChange(value as ElevationPlane)
            }
          />
          {flapType === "alt" ? (
            <ThemedText style={[styles.hint, { color: theme.textSecondary }]}>
              ALT flaps support 6-level elevation plane granularity
            </ThemedText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  labelRow: {
    flexDirection: "row",
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
  required: {
    marginLeft: Spacing.xs,
    fontSize: 14,
  },
  flapGrid: {
    gap: Spacing.sm,
  },
  flapButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  flapText: {
    fontSize: 14,
    flex: 1,
  },
  checkIcon: {
    marginLeft: Spacing.sm,
  },
  elevationSection: {
    marginTop: Spacing.md,
  },
  hint: {
    fontSize: 12,
    marginTop: Spacing.xs,
    fontStyle: "italic",
  },
});
