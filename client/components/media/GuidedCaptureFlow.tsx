import React, { useMemo, useCallback } from "react";
import { View, ScrollView, StyleSheet, Alert, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { CaptureStepCard } from "./CaptureStepCard";
import type {
  CaptureProtocol,
  MergedCaptureStep,
} from "@/data/mediaCaptureProtocols";
import { mergeProtocols } from "@/data/mediaCaptureProtocols";
import type { OperativeMediaItem } from "@/types/case";
import type { MediaTag } from "@/types/media";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useMediaCallback } from "@/contexts/MediaCallbackContext";
import {
  operativeMediaToAttachments,
} from "@/lib/operativeMedia";
import { deleteEncryptedMedia } from "@/lib/mediaStorage";
import { resolveMediaTag } from "@/lib/mediaTagMigration";

// ═══════════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════════

interface GuidedCaptureFlowProps {
  protocols: CaptureProtocol[];
  existingMedia: OperativeMediaItem[];
  onMediaChange: (media: OperativeMediaItem[]) => void;
  maxItems?: number;
  specialty?: string;
  procedureTags?: string[];
  hasSkinCancerAssessment?: boolean;
}

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

function GuidedCaptureFlowInner({
  protocols,
  existingMedia,
  onMediaChange,
  maxItems = 15,
  specialty,
  procedureTags,
  hasSkinCancerAssessment,
}: GuidedCaptureFlowProps) {
  const { theme } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { registerGenericCallback } = useMediaCallback();
  const [cameraPermission, requestCameraPermission] =
    ImagePicker.useCameraPermissions();

  // Merge protocols into a single checklist
  const merged = useMemo(() => mergeProtocols(protocols), [protocols]);
  const steps = merged.steps;

  // Match existing media to steps by tag
  const mediaByTag = useMemo(() => {
    const map = new Map<string, OperativeMediaItem>();
    for (const item of existingMedia) {
      const tag = resolveMediaTag(item);
      if (!map.has(tag)) {
        map.set(tag, item);
      }
    }
    return map;
  }, [existingMedia]);

  const capturedCount = useMemo(
    () => steps.filter((s) => mediaByTag.has(s.tag)).length,
    [steps, mediaByTag],
  );

  // Convert OperativeMediaItem to MediaAttachment for CaptureStepCard
  const getAttachmentForStep = useCallback(
    (step: MergedCaptureStep) => {
      const item = mediaByTag.get(step.tag);
      if (!item) return undefined;
      return operativeMediaToAttachments([item])[0];
    },
    [mediaByTag],
  );

  const ensureCameraPermission = async (): Promise<boolean> => {
    if (cameraPermission?.granted) return true;
    if (cameraPermission?.canAskAgain !== false) {
      const result = await requestCameraPermission();
      return result.granted;
    }
    Alert.alert(
      "Camera Permission Required",
      "Please enable camera access in your device settings.",
      [
        { text: "Cancel", style: "cancel" },
        ...(Platform.OS !== "web"
          ? [
              {
                text: "Open Settings",
                onPress: async () => {
                  try {
                    const { Linking } = await import("react-native");
                    await Linking.openSettings();
                  } catch {}
                },
              },
            ]
          : []),
      ],
    );
    return false;
  };

  const handleCapture = useCallback(
    async (tag: MediaTag) => {
      if (existingMedia.length >= maxItems) {
        Alert.alert("Limit reached", `Maximum ${maxItems} photos allowed.`);
        return;
      }

      const hasPermission = await ensureCameraPermission();
      if (!hasPermission) return;

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

          // Navigate to AddOperativeMedia with pre-selected tag
          const callbackId = registerGenericCallback(
            (newMedia: OperativeMediaItem) => {
              onMediaChange([...existingMedia, newMedia]);
            },
          );
          navigation.navigate("AddOperativeMedia", {
            imageUri: asset.uri,
            mimeType: asset.mimeType || "image/jpeg",
            callbackId,
            existingTag: tag,
            specialty,
            procedureTags,
            hasSkinCancerAssessment,
          });
        }
      } catch (error) {
        console.warn("[GuidedCaptureFlow] Capture failed:", error);
        Alert.alert("Error", "Failed to capture image.");
      }
    },
    [
      existingMedia,
      maxItems,
      navigation,
      onMediaChange,
      registerGenericCallback,
      specialty,
      procedureTags,
      hasSkinCancerAssessment,
    ],
  );

  const handleRemove = useCallback(
    (mediaId: string) => {
      Alert.alert("Remove Photo", "Remove this photo from the protocol?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const item = existingMedia.find((m) => m.id === mediaId);
            if (item) {
              await deleteEncryptedMedia(item.localUri);
            }
            onMediaChange(existingMedia.filter((m) => m.id !== mediaId));
          },
        },
      ]);
    },
    [existingMedia, onMediaChange],
  );

  if (steps.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText
          style={[styles.counterText, { color: theme.textSecondary }]}
        >
          {capturedCount}/{steps.length} captured
        </ThemedText>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.stepsList}
      >
        {steps.map((step, index) => (
          <CaptureStepCard
            key={`${step.sourceProtocolId}-${step.tag}-${index}`}
            step={step}
            capturedMedia={getAttachmentForStep(step)}
            onCapture={handleCapture}
            onRemove={handleRemove}
            sectionLabel={step.sectionLabel}
          />
        ))}
      </ScrollView>
    </View>
  );
}

export const GuidedCaptureFlow = React.memo(GuidedCaptureFlowInner);

// ═══════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: Spacing.sm,
  },
  counterText: {
    fontSize: 12,
    fontWeight: "500",
  },
  stepsList: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
});
