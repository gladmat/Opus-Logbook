import React, { useMemo } from "react";
import { View, StyleSheet, Pressable, Alert, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@/components/FeatherIcon";
import * as Haptics from "expo-haptics";
import { EncryptedImage } from "@/components/EncryptedImage";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { OperativeMediaItem, MediaAttachment } from "@/types/case";
import { MEDIA_TAG_REGISTRY } from "@/types/media";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useMediaCallback } from "@/contexts/MediaCallbackContext";
import {
  operativeMediaToAttachments,
  attachmentsToOperativeMedia,
} from "@/lib/operativeMedia";
import { resolveMediaTag } from "@/lib/mediaTagMigration";
import { ProtocolBadge, GuidedCaptureFlow } from "@/components/media";
import { findProtocols, mergeProtocols } from "@/data/mediaCaptureProtocols";
import type { MediaContext } from "@/lib/mediaContext";
import { getInboxCount, releaseReservedInboxItems } from "@/lib/inboxStorage";

interface OperativeMediaSectionProps {
  media: OperativeMediaItem[];
  onMediaChange: (media: OperativeMediaItem[]) => void;
  maxItems?: number;
  mediaContext?: MediaContext;
}

export function OperativeMediaSection({
  media,
  onMediaChange,
  maxItems = 15,
  mediaContext,
}: OperativeMediaSectionProps) {
  const { theme } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { registerCallback, registerGenericCallback } = useMediaCallback();
  const canAddMore = media.length < maxItems;

  const protocols = useMemo(
    () =>
      findProtocols({
        specialties: mediaContext?.specialty
          ? [mediaContext.specialty]
          : undefined,
        procedureTags: mediaContext?.procedureTags,
        procedurePicklistIds: mediaContext?.procedurePicklistIds,
        diagnosisPicklistIds: mediaContext?.diagnosisPicklistIds,
        hasSkinCancerAssessment: mediaContext?.hasSkinCancerAssessment,
      }),
    [mediaContext],
  );
  const mergedProtocol = useMemo(() => mergeProtocols(protocols), [protocols]);
  const capturedProtocolSteps = useMemo(() => {
    const protocolTags = new Set(mergedProtocol.steps.map((step) => step.tag));
    const mediaTags = new Set(media.map((item) => resolveMediaTag(item)));
    return Array.from(mediaTags).filter((tag) => protocolTags.has(tag)).length;
  }, [media, mergedProtocol.steps]);

  const handleManageMedia = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const attachments: MediaAttachment[] = operativeMediaToAttachments(media);
    const callbackId = registerCallback((updatedAttachments) => {
      onMediaChange(attachmentsToOperativeMedia(updatedAttachments));
    });

    navigation.navigate("MediaManagement", {
      existingAttachments: attachments,
      callbackId,
      maxAttachments: maxItems,
      context: "case",
      mediaContext,
    });
  };

  const handleGalleryPick = () => {
    const remaining = maxItems - media.length;
    if (remaining <= 0) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const callbackId = registerGenericCallback(
      (newMedia: OperativeMediaItem[]) => {
        onMediaChange([...media, ...newMedia]);
      },
    );

    navigation.navigate("SmartImport", {
      targetMode: "case",
      callbackId,
      procedureDate: mediaContext?.procedureDate,
      selectionLimit: remaining,
    });
  };

  const handleEditMedia = (item: OperativeMediaItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const callbackId = registerGenericCallback(
      (updatedMedia: OperativeMediaItem) => {
        onMediaChange(
          media.map((m) => (m.id === updatedMedia.id ? updatedMedia : m)),
        );
      },
    );
    navigation.navigate("AddOperativeMedia", {
      imageUri: item.localUri,
      mimeType: item.mimeType,
      callbackId,
      editMode: true,
      existingMediaId: item.id,
      existingMediaType: item.mediaType,
      existingTag: item.tag,
      existingCaption: item.caption,
      existingTimestamp: item.timestamp,
      existingCreatedAt: item.createdAt,
      mediaContext,
    });
  };

  const handleRemove = (mediaId: string) => {
    Alert.alert("Remove Media", "Are you sure you want to remove this?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          const item = media.find((m) => m.id === mediaId);
          if (item) {
            if (item.sourceInboxId) {
              releaseReservedInboxItems([item.sourceInboxId]);
            } else {
              const { deleteEncryptedMedia } = await import(
                "@/lib/mediaStorage"
              );
              await deleteEncryptedMedia(item.localUri);
            }
          }
          onMediaChange(media.filter((m) => m.id !== mediaId));
        },
      },
    ]);
  };

  const handleFromInbox = () => {
    const count = getInboxCount();
    if (count === 0) {
      Alert.alert(
        "Inbox Empty",
        "No photos in the inbox. Take or import photos to the inbox first.",
      );
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const callbackId = registerGenericCallback(
      (newMedia: OperativeMediaItem[]) => {
        onMediaChange([...media, ...newMedia]);
      },
    );
    navigation.navigate("Inbox", {
      pickMode: true,
      callbackId,
      procedureDate: mediaContext?.procedureDate,
      reservationKey: `draft:${callbackId}`,
    });
  };

  const hasUntaggedPhotos = media.some((m) => !m.tag || m.tag === "other");
  const showOrganiseButton =
    protocols.length > 0 && media.length > 0 && hasUntaggedPhotos;

  const handleOrganise = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const callbackId = registerGenericCallback(
      (updatedMedia: OperativeMediaItem[]) => {
        onMediaChange(updatedMedia);
      },
    );
    navigation.navigate("CaseMediaOrganiser", {
      callbackId,
      media,
      protocolSteps: mergedProtocol.steps,
      procedureDate: mediaContext?.procedureDate,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Feather name="image" size={18} color={theme.link} />
          <ThemedText style={styles.headerTitle}>Operative Media</ThemedText>
          {protocols.length > 0 ? (
            <ProtocolBadge
              label={mergedProtocol.label}
              capturedCount={capturedProtocolSteps}
              totalSteps={mergedProtocol.steps.length}
            />
          ) : null}
        </View>
        <View style={styles.headerRight}>
          {showOrganiseButton ? (
            <Pressable
              onPress={handleOrganise}
              style={[
                styles.manageButton,
                { backgroundColor: theme.link + "15", borderColor: theme.link },
              ]}
            >
              <Feather name="grid" size={14} color={theme.link} />
              <ThemedText
                style={[styles.manageButtonText, { color: theme.link }]}
              >
                Organise
              </ThemedText>
            </Pressable>
          ) : null}
          {media.length > 0 ? (
            <Pressable
              onPress={handleManageMedia}
              style={[
                styles.manageButton,
                { backgroundColor: theme.link + "15", borderColor: theme.link },
              ]}
            >
              <Feather name="sliders" size={14} color={theme.link} />
              <ThemedText
                style={[styles.manageButtonText, { color: theme.link }]}
              >
                Manage
              </ThemedText>
            </Pressable>
          ) : null}
          <ThemedText
            style={[styles.countBadge, { color: theme.textSecondary }]}
          >
            {media.length} / {maxItems}
          </ThemedText>
        </View>
      </View>

      {protocols.length > 0 ? (
        <GuidedCaptureFlow
          protocols={protocols}
          existingMedia={media}
          onMediaChange={onMediaChange}
          maxItems={maxItems}
          mediaContext={mediaContext}
        />
      ) : null}

      {media.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.previewContainer}
        >
          {media.map((item) => {
            const tag = resolveMediaTag(item);
            const tagLabel = MEDIA_TAG_REGISTRY[tag]?.label ?? tag;

            return (
              <Pressable
                key={item.id}
                onPress={() => handleEditMedia(item)}
                style={[
                  styles.previewItem,
                  { backgroundColor: theme.backgroundDefault },
                ]}
              >
                <EncryptedImage
                  uri={item.localUri}
                  style={styles.previewImage}
                  resizeMode="cover"
                  thumbnail
                  onError={() =>
                    console.warn("Media file missing:", item.localUri)
                  }
                />
                <View
                  style={[styles.typeBadge, { backgroundColor: theme.link }]}
                >
                  <ThemedText
                    style={[styles.typeBadgeText, { color: theme.buttonText }]}
                  >
                    {tagLabel}
                  </ThemedText>
                </View>
                <Pressable
                  onPress={() => handleRemove(item.id)}
                  style={[
                    styles.removeButton,
                    { backgroundColor: theme.error },
                  ]}
                  hitSlop={8}
                >
                  <Feather name="x" size={12} color={theme.buttonText} />
                </Pressable>
                <View
                  style={[
                    styles.editBadge,
                    { backgroundColor: theme.backgroundRoot + "80" },
                  ]}
                >
                  <Feather name="edit-2" size={10} color={theme.text} />
                </View>
                {item.caption ? (
                  <View
                    style={[
                      styles.captionOverlay,
                      { backgroundColor: theme.backgroundRoot + "99" },
                    ]}
                  >
                    <ThemedText
                      style={[styles.captionText, { color: theme.text }]}
                      numberOfLines={2}
                    >
                      {item.caption}
                    </ThemedText>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
          {canAddMore ? (
            <View style={styles.addButtonsColumn}>
              <Pressable
                onPress={handleFromInbox}
                style={[styles.smallAddButton, { backgroundColor: theme.accent }]}
              >
                <Feather name="inbox" size={18} color={theme.accentContrast} />
              </Pressable>
              <Pressable
                onPress={handleGalleryPick}
                style={[
                  styles.smallAddButton,
                  { backgroundColor: theme.backgroundDefault },
                ]}
              >
                <Feather name="image" size={18} color={theme.text} />
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.buttonRow}>
            <Pressable
              onPress={handleFromInbox}
              style={[styles.addButton, { backgroundColor: theme.accent }]}
            >
              <Feather name="inbox" size={20} color={theme.accentContrast} />
              <ThemedText
                style={[styles.addButtonText, { color: theme.accentContrast }]}
              >
                From Inbox
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={handleGalleryPick}
              style={[
                styles.addButton,
                { backgroundColor: theme.backgroundDefault },
              ]}
            >
              <Feather name="image" size={20} color={theme.text} />
              <ThemedText style={styles.addButtonText}>From Gallery</ThemedText>
            </Pressable>
          </View>
          <ThemedText
            style={[styles.placeholderText, { color: theme.textSecondary }]}
          >
            Assign photos from your Inbox or Camera Roll
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.md,
  },
  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    rowGap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flexShrink: 1,
  },
  headerTitle: {
    fontWeight: "600",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  manageButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  manageButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  countBadge: {
    fontSize: 13,
  },
  previewContainer: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  previewItem: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  typeBadge: {
    position: "absolute",
    top: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: "600",
  },
  removeButton: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  editBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  captionOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  captionText: {
    fontSize: 10,
  },
  addButtonsColumn: {
    gap: Spacing.xs,
    justifyContent: "center",
  },
  smallAddButton: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    gap: Spacing.md,
  },
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  addButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  placeholderText: {
    fontSize: 13,
    textAlign: "center",
  },
});
