import React, { useState, useCallback, useRef } from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
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
} from "@/types/surgicalPreferences";

export default function SurgicalPreferencesScreen() {
  const { theme } = useTheme();
  const { profile, updateProfile } = useAuth();
  const insets = useSafeAreaInsets();

  const prefs = profile?.surgicalPreferences?.microsurgery;
  const [selectedAnticoag, setSelectedAnticoag] = useState<
    AnticoagulationProtocolId | undefined
  >(prefs?.anticoagulationProtocol);
  const [selectedMonitoring, setSelectedMonitoring] = useState<
    FlapMonitoringProtocolId | undefined
  >(prefs?.monitoringProtocol);

  // Debounced save
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedSave = useCallback(
    (
      anticoag: AnticoagulationProtocolId | undefined,
      monitoring: FlapMonitoringProtocolId | undefined,
    ) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        updateProfile({
          surgicalPreferences: {
            ...profile?.surgicalPreferences,
            microsurgery: {
              anticoagulationProtocol: anticoag,
              monitoringProtocol: monitoring,
            },
          },
        });
      }, 300);
    },
    [updateProfile, profile?.surgicalPreferences],
  );

  const handleAnticoagSelect = useCallback(
    (id: AnticoagulationProtocolId) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const newValue = selectedAnticoag === id ? undefined : id;
      setSelectedAnticoag(newValue);
      debouncedSave(newValue, selectedMonitoring);
    },
    [selectedAnticoag, selectedMonitoring, debouncedSave],
  );

  const handleMonitoringSelect = useCallback(
    (id: FlapMonitoringProtocolId) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const newValue = selectedMonitoring === id ? undefined : id;
      setSelectedMonitoring(newValue);
      debouncedSave(selectedAnticoag, newValue);
    },
    [selectedAnticoag, selectedMonitoring, debouncedSave],
  );

  return (
    <ScrollView
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
        Set your default protocols for microsurgery cases. These will auto-fill
        when you create new free flap cases.
      </ThemedText>

      {/* Microsurgery Section */}
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
});
