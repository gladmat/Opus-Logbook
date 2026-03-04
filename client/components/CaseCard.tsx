import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { EncryptedImage } from "@/components/EncryptedImage";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Shadows } from "@/constants/theme";
import {
  Case,
  Specialty,
  SPECIALTY_LABELS,
  getPrimaryDiagnosisName,
  getPrimarySiteLabel,
  isExcisionBiopsyDiagnosis,
} from "@/types/case";
import { RoleBadge } from "@/components/RoleBadge";
import { SpecialtyBadge } from "@/components/SpecialtyBadge";

import { SpecialtyIcon } from "@/components/SpecialtyIcon";

interface CaseCardProps {
  caseData: Case;
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const CaseThumbnail = React.memo(function CaseThumbnail({
  caseData,
}: {
  caseData: Case;
}) {
  const { theme } = useTheme();
  const firstPhoto = caseData.operativeMedia?.[0];

  if (firstPhoto?.localUri) {
    return (
      <View
        style={[
          thumbStyles.container,
          { backgroundColor: theme.backgroundElevated },
        ]}
      >
        <EncryptedImage
          uri={firstPhoto.localUri}
          style={thumbStyles.image}
          resizeMode="cover"
          thumbnail
        />
      </View>
    );
  }

  return (
    <View
      style={[
        thumbStyles.container,
        { backgroundColor: theme.specialty[caseData.specialty] + "10" },
      ]}
    >
      <SpecialtyIcon
        specialty={caseData.specialty}
        size={20}
        color={theme.specialty[caseData.specialty]}
      />
    </View>
  );
});

function SiteChip({ caseData }: { caseData: Case }) {
  const { theme } = useTheme();
  const label = getPrimarySiteLabel(caseData);
  if (!label) return null;

  return (
    <View
      style={[chipStyles.chip, { backgroundColor: theme.textTertiary + "15" }]}
    >
      <ThemedText style={[chipStyles.chipText, { color: theme.textSecondary }]}>
        {label}
      </ThemedText>
    </View>
  );
}

export const CaseCard = React.memo(function CaseCard({
  caseData,
  onPress,
}: CaseCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const formattedDate = new Date(caseData.procedureDate).toLocaleDateString(
    "en-NZ",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  );

  const userRole =
    caseData.teamMembers.find((m) => m.id === caseData.ownerId)?.role || "PS";

  const caseTitle = getPrimaryDiagnosisName(caseData) || caseData.procedureType;

  const hasHistologyPending = caseData.diagnosisGroups?.some(
    (g) =>
      g.diagnosisCertainty === "clinical" ||
      isExcisionBiopsyDiagnosis(g.diagnosisPicklistId),
  );

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={`${caseData.patientIdentifier}, ${caseTitle}, ${formattedDate}`}
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundDefault,
        },
        animatedStyle,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <SpecialtyBadge specialty={caseData.specialty} size="small" />
          <RoleBadge role={userRole} size="small" />
          {hasHistologyPending ? (
            <View style={[chipStyles.chip, { backgroundColor: "#E5A00D20" }]}>
              <ThemedText style={[chipStyles.chipText, { color: "#E5A00D" }]}>
                Histology pending
              </ThemedText>
            </View>
          ) : null}
        </View>
        <Feather name="chevron-right" size={20} color={theme.textTertiary} />
      </View>

      <View style={styles.contentRow}>
        <CaseThumbnail caseData={caseData} />
        <View style={styles.contentText}>
          <ThemedText type="h3" style={styles.patientId} numberOfLines={1}>
            {caseData.patientIdentifier}
          </ThemedText>
          <View style={styles.diagnosisRow}>
            <ThemedText
              style={[styles.procedureType, { color: theme.textSecondary }]}
              numberOfLines={1}
            >
              {caseTitle}
            </ThemedText>
            <SiteChip caseData={caseData} />
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <Feather name="calendar" size={14} color={theme.textTertiary} />
          <ThemedText
            style={[styles.footerText, { color: theme.textSecondary }]}
          >
            {formattedDate}
          </ThemedText>
        </View>
        <View style={styles.footerItem}>
          <Feather name="map-pin" size={14} color={theme.textTertiary} />
          <ThemedText
            style={[styles.footerText, { color: theme.textSecondary }]}
          >
            {caseData.facility}
          </ThemedText>
        </View>
      </View>
    </AnimatedPressable>
  );
});

const thumbStyles = StyleSheet.create({
  container: {
    width: 48,
    height: 48,
    borderRadius: 10,
    overflow: "hidden",
    marginRight: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  image: {
    width: 48,
    height: 48,
  },
});

const chipStyles = StyleSheet.create({
  chip: {
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: Spacing.xs,
  },
  chipText: {
    fontSize: 11,
    fontWeight: "500",
  },
});

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    ...Shadows.card,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  contentText: {
    flex: 1,
  },
  diagnosisRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  patientId: {
    marginBottom: Spacing.xs,
  },
  procedureType: {
    fontSize: 14,
    flexShrink: 1,
  },
  footer: {
    flexDirection: "row",
    gap: Spacing.lg,
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  footerText: {
    fontSize: 13,
  },
});
