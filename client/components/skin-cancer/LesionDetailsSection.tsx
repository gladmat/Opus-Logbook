/**
 * LesionDetailsSection
 * ════════════════════
 * Lesion location and dimensions section. Contains:
 * 1. Grouped anatomical site picker (Head & Neck / Trunk / Upper Limb / Lower Limb)
 * 2. Laterality (Left / Right / Midline with auto-select)
 * 3. Clinical dimensions (length x width mm)
 *
 * Plus inline clinical photo capture (camera icon next to SITE label).
 * Photos are encrypted, auto-captioned, and surfaced as case thumbnail.
 */

import React, { useCallback, useEffect, useRef } from "react";
import { View, Pressable, TextInput, StyleSheet, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { v4 as uuidv4 } from "uuid";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { EncryptedImage } from "@/components/EncryptedImage";
import { SkinCancerNumericInput } from "./SkinCancerNumericInput";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import {
  saveEncryptedMediaFromUri,
  deleteEncryptedMedia,
} from "@/lib/mediaStorage";
import { getSkinCancerPrimaryHistology } from "@/lib/skinCancerConfig";
import type {
  SkinCancerLesionAssessment,
  SkinCancerPathologyCategory,
  LesionPhoto,
} from "@/types/skinCancer";
import { SKIN_CANCER_SITE_GROUPS, MIDLINE_SITES } from "@/types/skinCancer";

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════

const LATERALITY_OPTIONS: {
  value: "left" | "right" | "midline";
  label: string;
}[] = [
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "midline", label: "Midline" },
];

const CATEGORY_LABELS: Record<SkinCancerPathologyCategory, string> = {
  bcc: "BCC",
  scc: "SCC",
  melanoma: "Melanoma",
  merkel_cell: "MCC",
  rare_malignant: "Other malig.",
  benign: "Benign",
  uncertain: "Uncertain",
};

// ═══════════════════════════════════════════════════════════════
// Caption helper
// ═══════════════════════════════════════════════════════════════

export function generateLesionCaption(
  assessment: SkinCancerLesionAssessment,
): string {
  const parts: string[] = [];
  const category =
    getSkinCancerPrimaryHistology(assessment)?.pathologyCategory ??
    assessment.clinicalSuspicion;
  if (category) parts.push(CATEGORY_LABELS[category]);
  if (assessment.site) parts.push(assessment.site);
  if (assessment.laterality && assessment.laterality !== "midline") {
    parts.push(assessment.laterality === "left" ? "L" : "R");
  }
  return parts.join(" \u2014 ") || "Lesion photo";
}

// ═══════════════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════════════

interface LesionDetailsSectionProps {
  assessment: SkinCancerLesionAssessment;
  onChange: (updated: SkinCancerLesionAssessment) => void;
  onPhotoAdded?: (photo: LesionPhoto) => void;
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

export function LesionDetailsSection({
  assessment,
  onChange,
  onPhotoAdded,
}: LesionDetailsSectionProps) {
  const { theme } = useTheme();
  const widthInputRef = useRef<TextInput>(null);
  const [cameraPermission, requestCameraPermission] =
    ImagePicker.useCameraPermissions();

  // Auto-set laterality to midline when a midline site is selected
  useEffect(() => {
    if (
      assessment.site &&
      MIDLINE_SITES.has(assessment.site) &&
      !assessment.laterality
    ) {
      onChange({ ...assessment, laterality: "midline" });
    }
  }, [assessment.site]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSiteSelect = useCallback(
    (site: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const newSite = assessment.site === site ? undefined : site;
      onChange({
        ...assessment,
        site: newSite,
        laterality:
          newSite && MIDLINE_SITES.has(newSite)
            ? "midline"
            : assessment.laterality,
      });
    },
    [assessment, onChange],
  );

  const handleLateralitySelect = useCallback(
    (value: "left" | "right" | "midline") => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange({
        ...assessment,
        laterality: assessment.laterality === value ? undefined : value,
      });
    },
    [assessment, onChange],
  );

  // ── Photo capture ──

  const captureFromCamera = useCallback(async () => {
    if (!cameraPermission?.granted) {
      const { granted } = await requestCameraPermission();
      if (!granted) {
        Alert.alert(
          "Camera Access",
          "Camera permission is needed to take lesion photos.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open Settings",
              onPress: async () => {
                const { Linking } = await import("react-native");
                await Linking.openSettings();
              },
            },
          ],
        );
        return;
      }
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.7,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        if (!asset) return;
        const savedMedia = await saveEncryptedMediaFromUri(
          asset.uri,
          asset.mimeType || "image/jpeg",
        );
        const photo: LesionPhoto = {
          id: uuidv4(),
          uri: savedMedia.localUri,
          caption: generateLesionCaption(assessment),
          photoType: "clinical",
          createdAt: new Date().toISOString(),
        };
        onChange({
          ...assessment,
          lesionPhotos: [...(assessment.lesionPhotos ?? []), photo],
        });
        onPhotoAdded?.(photo);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error: any) {
      console.error("Error capturing lesion photo:", error);
      Alert.alert("Error", "Failed to capture photo.");
    }
  }, [
    assessment,
    onChange,
    onPhotoAdded,
    cameraPermission,
    requestCameraPermission,
  ]);

  const pickFromGallery = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.7,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        if (!asset) return;
        const savedMedia = await saveEncryptedMediaFromUri(
          asset.uri,
          asset.mimeType || "image/jpeg",
        );
        const photo: LesionPhoto = {
          id: uuidv4(),
          uri: savedMedia.localUri,
          caption: generateLesionCaption(assessment),
          photoType: "clinical",
          createdAt: new Date().toISOString(),
        };
        onChange({
          ...assessment,
          lesionPhotos: [...(assessment.lesionPhotos ?? []), photo],
        });
        onPhotoAdded?.(photo);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error: any) {
      console.error("Error picking lesion photo:", error);
      Alert.alert("Error", "Failed to select photo.");
    }
  }, [assessment, onChange, onPhotoAdded]);

  const handleCameraPress = useCallback(() => {
    Alert.alert("Lesion Photo", "", [
      { text: "Camera", onPress: captureFromCamera },
      { text: "Gallery", onPress: pickFromGallery },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [captureFromCamera, pickFromGallery]);

  const handleDeletePhoto = useCallback(
    (photoId: string) => {
      const photo = assessment.lesionPhotos?.find((p) => p.id === photoId);
      if (!photo) return;

      Alert.alert("Delete Photo", "Remove this lesion photo?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteEncryptedMedia(photo.uri);
            onChange({
              ...assessment,
              lesionPhotos: (assessment.lesionPhotos ?? []).filter(
                (p) => p.id !== photoId,
              ),
            });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
        },
      ]);
    },
    [assessment, onChange],
  );

  const photos = assessment.lesionPhotos ?? [];

  return (
    <View style={styles.container}>
      {/* ── Anatomical Site ── */}
      <View style={styles.section}>
        <View style={styles.siteLabelRow}>
          <ThemedText
            style={[styles.sectionLabel, { color: theme.textSecondary }]}
          >
            SITE
          </ThemedText>
          <Pressable
            style={styles.cameraButton}
            onPress={handleCameraPress}
            hitSlop={8}
          >
            <Feather name="camera" size={18} color={theme.textSecondary} />
          </Pressable>
        </View>

        {/* ── Thumbnail strip ── */}
        {photos.length > 0 && (
          <View style={styles.thumbnailRow}>
            {photos.map((photo) => (
              <Pressable
                key={photo.id}
                style={[
                  styles.thumbnailContainer,
                  { borderColor: theme.border },
                ]}
                onLongPress={() => handleDeletePhoto(photo.id)}
              >
                <EncryptedImage
                  uri={photo.uri}
                  thumbnail
                  style={styles.thumbnailImage}
                />
              </Pressable>
            ))}
          </View>
        )}

        {SKIN_CANCER_SITE_GROUPS.map((group) => (
          <View key={group.label} style={styles.siteGroup}>
            <ThemedText
              style={[styles.groupLabel, { color: theme.textTertiary }]}
            >
              {group.label}
            </ThemedText>
            <View style={styles.chipRow}>
              {group.sites.map((site) => {
                const isSelected = assessment.site === site;
                return (
                  <Pressable
                    key={site}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected
                          ? theme.link
                          : theme.backgroundTertiary,
                        borderColor: isSelected ? theme.link : theme.border,
                      },
                    ]}
                    onPress={() => handleSiteSelect(site)}
                  >
                    <ThemedText
                      style={[
                        styles.chipText,
                        {
                          color: isSelected ? theme.buttonText : theme.text,
                        },
                      ]}
                    >
                      {site}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </View>

      {/* ── Laterality ── */}
      <View style={styles.section}>
        <ThemedText
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          LATERALITY
        </ThemedText>
        <View style={styles.chipRow}>
          {LATERALITY_OPTIONS.map((opt) => {
            const isSelected = assessment.laterality === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected
                      ? theme.link
                      : theme.backgroundTertiary,
                    borderColor: isSelected ? theme.link : theme.border,
                  },
                ]}
                onPress={() => handleLateralitySelect(opt.value)}
              >
                <ThemedText
                  style={[
                    styles.chipText,
                    {
                      color: isSelected ? theme.buttonText : theme.text,
                    },
                  ]}
                >
                  {opt.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ── Dimensions ── */}
      <View style={styles.section}>
        <ThemedText
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          CLINICAL SIZE (MM)
        </ThemedText>
        <View style={styles.dimensionRow}>
          <SkinCancerNumericInput
            style={[
              styles.dimensionInput,
              {
                backgroundColor: theme.backgroundElevated,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            value={assessment.clinicalLengthMm}
            onValueChange={(clinicalLengthMm) => {
              onChange({
                ...assessment,
                clinicalLengthMm,
              });
            }}
            placeholder="Length"
            placeholderTextColor={theme.textTertiary}
            keyboardType="decimal-pad"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => widthInputRef.current?.focus()}
          />
          <ThemedText
            style={[styles.dimensionSeparator, { color: theme.textSecondary }]}
          >
            ×
          </ThemedText>
          <SkinCancerNumericInput
            ref={widthInputRef}
            style={[
              styles.dimensionInput,
              {
                backgroundColor: theme.backgroundElevated,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            value={assessment.clinicalWidthMm}
            onValueChange={(clinicalWidthMm) => {
              onChange({
                ...assessment,
                clinicalWidthMm,
              });
            }}
            placeholder="Width"
            placeholderTextColor={theme.textTertiary}
            keyboardType="decimal-pad"
            returnKeyType="done"
            blurOnSubmit
          />
          <ThemedText
            style={[styles.dimensionUnit, { color: theme.textSecondary }]}
          >
            mm
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  siteLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cameraButton: {
    padding: 4,
  },
  thumbnailRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  thumbnailContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    overflow: "hidden",
  },
  thumbnailImage: {
    width: 56,
    height: 56,
  },
  siteGroup: {
    gap: Spacing.xs,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 4,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  dimensionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  dimensionInput: {
    width: 80,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    textAlign: "center",
  },
  dimensionSeparator: {
    fontSize: 16,
    fontWeight: "500",
  },
  dimensionUnit: {
    fontSize: 14,
    fontWeight: "500",
  },
});
