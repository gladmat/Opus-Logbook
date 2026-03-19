import React, { useState, useCallback, useRef } from "react";
import { View, StyleSheet, Pressable, ScrollView, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import {
  ANTICOAGULATION_PROTOCOLS,
  FLAP_MONITORING_PROTOCOLS,
  type AnticoagulationProtocolId,
  type FlapMonitoringProtocolId,
  type AnticoagulationProtocol,
  type FlapMonitoringProtocol,
  type BreastPreferences,
} from "@/types/surgicalPreferences";
import { IMPLANT_SURFACE_LABELS, POCKET_RINSE_LABELS } from "@/types/breast";
import type { ImplantSurface, PocketRinse } from "@/types/breast";
import { IMPLANT_MANUFACTURERS, ADM_PRODUCTS } from "@/lib/breastConfig";

export default function SurgicalPreferencesScreen() {
  const { theme } = useTheme();
  const { profile, updateProfile } = useAuth();
  const insets = useSafeAreaInsets();

  // ── Microsurgery state ──
  const microPrefs = profile?.surgicalPreferences?.microsurgery;
  const [selectedAnticoag, setSelectedAnticoag] = useState<
    AnticoagulationProtocolId | undefined
  >(microPrefs?.anticoagulationProtocol);
  const [selectedMonitoring, setSelectedMonitoring] = useState<
    FlapMonitoringProtocolId | undefined
  >(microPrefs?.monitoringProtocol);

  // ── Breast state ──
  const breastPrefs = profile?.surgicalPreferences?.breast;
  const [breastState, setBreastState] = useState<BreastPreferences>(
    breastPrefs ?? {},
  );

  // Debounced save — merges all preference domains
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef({
    selectedAnticoag,
    selectedMonitoring,
    breastState,
  });
  latestRef.current = { selectedAnticoag, selectedMonitoring, breastState };

  const debouncedSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const latest = latestRef.current;
      updateProfile({
        surgicalPreferences: {
          ...profile?.surgicalPreferences,
          microsurgery: {
            anticoagulationProtocol: latest.selectedAnticoag,
            monitoringProtocol: latest.selectedMonitoring,
          },
          breast: latest.breastState,
        },
      });
    }, 300);
  }, [updateProfile, profile?.surgicalPreferences]);

  const handleAnticoagSelect = useCallback(
    (id: AnticoagulationProtocolId) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const newValue = selectedAnticoag === id ? undefined : id;
      setSelectedAnticoag(newValue);
      latestRef.current.selectedAnticoag = newValue;
      debouncedSave();
    },
    [selectedAnticoag, debouncedSave],
  );

  const handleMonitoringSelect = useCallback(
    (id: FlapMonitoringProtocolId) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const newValue = selectedMonitoring === id ? undefined : id;
      setSelectedMonitoring(newValue);
      latestRef.current.selectedMonitoring = newValue;
      debouncedSave();
    },
    [selectedMonitoring, debouncedSave],
  );

  const updateBreast = useCallback(
    (patch: Partial<BreastPreferences>) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setBreastState((prev) => {
        const next = { ...prev, ...patch };
        latestRef.current.breastState = next;
        return next;
      });
      debouncedSave();
    },
    [debouncedSave],
  );

  return (
    <ScrollView
      testID="screen-surgicalPreferences"
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xl,
        paddingHorizontal: Spacing.md,
      }}
    >
      {/* Header description */}
      <ThemedText
        style={[styles.headerDescription, { color: theme.textSecondary }]}
      >
        Set your default protocols and preferences. These will auto-fill when
        you create new cases.
      </ThemedText>

      {/* ════════ Microsurgery Section ════════ */}
      <View style={styles.sectionHeader}>
        <Feather name="activity" size={18} color={theme.link} />
        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
          Microsurgery
        </ThemedText>
      </View>

      {/* Anticoagulation Protocol */}
      <ThemedText
        style={[styles.subsectionTitle, { color: theme.textSecondary }]}
      >
        ANTICOAGULATION PROTOCOL
      </ThemedText>
      <View style={styles.cardList}>
        {ANTICOAGULATION_PROTOCOLS.map((protocol) => (
          <ProtocolCard
            key={protocol.id}
            protocol={protocol}
            isSelected={selectedAnticoag === protocol.id}
            onPress={() => handleAnticoagSelect(protocol.id)}
            theme={theme}
          />
        ))}
      </View>

      {/* Flap Monitoring Protocol */}
      <ThemedText
        style={[
          styles.subsectionTitle,
          { color: theme.textSecondary, marginTop: Spacing.lg },
        ]}
      >
        FLAP MONITORING PROTOCOL
      </ThemedText>
      <View style={styles.cardList}>
        {FLAP_MONITORING_PROTOCOLS.map((protocol) => (
          <ProtocolCard
            key={protocol.id}
            protocol={protocol}
            isSelected={selectedMonitoring === protocol.id}
            onPress={() => handleMonitoringSelect(protocol.id)}
            theme={theme}
          />
        ))}
      </View>

      {/* ════════ Breast Surgery Section ════════ */}
      <View style={[styles.sectionHeader, { marginTop: Spacing.xl }]}>
        <Feather name="heart" size={18} color={theme.link} />
        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
          Breast Surgery
        </ThemedText>
      </View>

      {/* Preferred Implant Manufacturer */}
      <ThemedText
        style={[styles.subsectionTitle, { color: theme.textSecondary }]}
      >
        PREFERRED IMPLANT MANUFACTURER
      </ThemedText>
      <View style={styles.chipRow}>
        {IMPLANT_MANUFACTURERS.map((mfr) => (
          <OptionChip
            key={mfr.id}
            label={mfr.label.split(" (")[0]!}
            isSelected={breastState.preferredImplantManufacturer === mfr.id}
            onPress={() =>
              updateBreast({
                preferredImplantManufacturer:
                  breastState.preferredImplantManufacturer === mfr.id
                    ? undefined
                    : mfr.id,
              })
            }
            theme={theme}
          />
        ))}
      </View>

      {/* Preferred Implant Surface */}
      <ThemedText
        style={[
          styles.subsectionTitle,
          { color: theme.textSecondary, marginTop: Spacing.lg },
        ]}
      >
        PREFERRED IMPLANT SURFACE
      </ThemedText>
      <View style={styles.chipRow}>
        {(
          Object.entries(IMPLANT_SURFACE_LABELS) as [ImplantSurface, string][]
        ).map(([id, label]) => (
          <OptionChip
            key={id}
            label={label}
            isSelected={breastState.preferredImplantSurface === id}
            onPress={() =>
              updateBreast({
                preferredImplantSurface:
                  breastState.preferredImplantSurface === id ? undefined : id,
              })
            }
            theme={theme}
          />
        ))}
      </View>

      {/* Default Pocket Rinse */}
      <ThemedText
        style={[
          styles.subsectionTitle,
          { color: theme.textSecondary, marginTop: Spacing.lg },
        ]}
      >
        DEFAULT POCKET RINSE
      </ThemedText>
      <View style={styles.chipRow}>
        {(Object.entries(POCKET_RINSE_LABELS) as [PocketRinse, string][]).map(
          ([id, label]) => (
            <OptionChip
              key={id}
              label={label}
              isSelected={breastState.defaultPocketRinse === id}
              onPress={() =>
                updateBreast({
                  defaultPocketRinse:
                    breastState.defaultPocketRinse === id ? undefined : id,
                })
              }
              theme={theme}
            />
          ),
        )}
      </View>

      {/* Preferred ADM Product */}
      <ThemedText
        style={[
          styles.subsectionTitle,
          { color: theme.textSecondary, marginTop: Spacing.lg },
        ]}
      >
        PREFERRED ADM PRODUCT
      </ThemedText>
      <View style={styles.chipRow}>
        {ADM_PRODUCTS.map((adm) => (
          <OptionChip
            key={adm.id}
            label={adm.label.split(" (")[0]!}
            isSelected={breastState.preferredAdmProduct === adm.id}
            onPress={() =>
              updateBreast({
                preferredAdmProduct:
                  breastState.preferredAdmProduct === adm.id
                    ? undefined
                    : adm.id,
              })
            }
            theme={theme}
          />
        ))}
      </View>

      {/* Always 14-point plan toggle */}
      <View
        style={[
          styles.toggleRow,
          {
            backgroundColor: theme.backgroundElevated,
            borderColor: theme.border,
            marginTop: Spacing.lg,
          },
        ]}
      >
        <View style={styles.toggleTextBlock}>
          <ThemedText style={[styles.toggleLabel, { color: theme.text }]}>
            Always use 14-point plan
          </ThemedText>
          <ThemedText
            style={[styles.toggleDescription, { color: theme.textSecondary }]}
          >
            Auto-enable the antibiotic 14-point plan for all breast implant
            cases
          </ThemedText>
        </View>
        <Switch
          value={breastState.always14PointPlan ?? false}
          onValueChange={(val) => updateBreast({ always14PointPlan: val })}
          trackColor={{ false: theme.border, true: theme.link }}
        />
      </View>

      {/* Coming Soon placeholder */}
      <View
        style={[
          styles.comingSoonCard,
          {
            backgroundColor: theme.backgroundElevated,
            borderColor: theme.border,
          },
        ]}
      >
        <Feather name="plus-circle" size={20} color={theme.textTertiary} />
        <ThemedText
          style={[styles.comingSoonText, { color: theme.textTertiary }]}
        >
          More specialty preferences coming soon
        </ThemedText>
      </View>
    </ScrollView>
  );
}

// ── Protocol Card Component ────────────────────────────────────────────

interface ProtocolCardProps {
  protocol: AnticoagulationProtocol | FlapMonitoringProtocol;
  isSelected: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>["theme"];
}

function ProtocolCard({
  protocol,
  isSelected,
  onPress,
  theme,
}: ProtocolCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.protocolCard,
        {
          backgroundColor: theme.backgroundElevated,
          borderColor: isSelected ? theme.link : theme.border,
          borderWidth: isSelected ? 2 : 1,
          opacity: pressed ? 0.85 : 1,
        },
        Shadows.card,
      ]}
    >
      <View style={styles.protocolCardHeader}>
        <View
          style={[
            styles.radioOuter,
            {
              borderColor: isSelected ? theme.link : theme.textTertiary,
              borderWidth: isSelected ? 2 : 1.5,
            },
          ]}
        >
          {isSelected && (
            <View
              style={[styles.radioInner, { backgroundColor: theme.link }]}
            />
          )}
        </View>
        <ThemedText
          style={[
            styles.protocolLabel,
            { color: theme.text, fontWeight: isSelected ? "700" : "600" },
          ]}
        >
          {protocol.label}
        </ThemedText>
      </View>
      <ThemedText
        style={[styles.protocolDescription, { color: theme.textSecondary }]}
      >
        {protocol.description}
      </ThemedText>
      {protocol.components.length > 0 && (
        <View style={styles.componentsList}>
          {protocol.components.map((comp, i) => (
            <View key={i} style={styles.componentRow}>
              <View
                style={[styles.componentDot, { backgroundColor: theme.link }]}
              />
              <ThemedText
                style={[styles.componentText, { color: theme.textSecondary }]}
              >
                {comp}
              </ThemedText>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}

// ── Option Chip Component ──────────────────────────────────────────────

interface OptionChipProps {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>["theme"];
}

function OptionChip({ label, isSelected, onPress, theme }: OptionChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: isSelected ? theme.link : theme.backgroundElevated,
          borderColor: isSelected ? theme.link : theme.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <ThemedText
        style={[
          styles.chipLabel,
          {
            color: isSelected ? theme.buttonText : theme.text,
            fontWeight: isSelected ? "600" : "500",
          },
        ]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

// ── Styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 26,
  },
  subsectionTitle: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: Spacing.sm,
  },
  cardList: {
    gap: Spacing.sm,
  },
  protocolCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  protocolCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: 4,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  protocolLabel: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  protocolDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginLeft: 32,
    marginBottom: 4,
  },
  componentsList: {
    marginLeft: 32,
    marginTop: 4,
    gap: 2,
  },
  componentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  componentDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 6,
  },
  componentText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  comingSoonCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    padding: Spacing.md,
    marginTop: Spacing.xl,
  },
  comingSoonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  chip: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  chipLabel: {
    fontSize: 14,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  toggleTextBlock: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  toggleDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
});
