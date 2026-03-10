import React, { useMemo } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Alert,
  Platform,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@/components/FeatherIcon";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { v4 as uuidv4 } from "uuid";
import { importMediaAssets } from "@/lib/mediaStorage";
import { EncryptedImage } from "@/components/EncryptedImage";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import {
  OperativeMediaItem,
  MediaAttachment,
} from "@/types/case";
import { MEDIA_TAG_REGISTRY } from "@/types/media";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useMediaCallback } from "@/contexts/MediaCallbackContext";
import {
  operativeMediaToAttachments,
  attachmentsToOperativeMedia,
} from "@/lib/operativeMedia";
import { resolveMediaTag } from "@/lib/mediaTagMigration";
import { ProtocolBadge, GuidedCaptureFlow } from "@/components/media";
import { findProtocols } from "@/data/mediaCaptureProtocols";

interface OperativeMediaSectionProps {
  media: OperativeMediaItem[];
  onMediaChange: (media: OperativeMediaItem[]) => void;
  maxItems?: number;
  specialty?: string;
  procedureTags?: string[];
  hasSkinCancerAssessment?: boolean;
  procedureDate?: string;
}

export function OperativeMediaSection({
  media,
  onMediaChange,
  maxItems = 15,
  specialty,
  procedureTags,
  hasSkinCancerAssessment,
  procedureDate,
}: OperativeMediaSectionProps) {
  const { theme } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { registerCallback, registerGenericCallback } = useMediaCallback();
  const [cameraPermission, requestCameraPermission] =
    ImagePicker.useCameraPermissions();
  const canAddMore = media.length < maxItems;

  const protocols = useMemo(
    () =>
      findProtocols({
        specialties: specialty ? [specialty] : undefined,
        procedureTags,
        hasSkinCancerAssessment,
      }),
    [specialty, procedureTags, hasSkinCancerAssessment],
  );

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
      specialty,
      procedureTags,
      hasSkinCancerAssessment,
    });
  };

  const navigateToAddMedia = (uri: string, mimeType: string) => {
    const callbackId = registerGenericCallback(
      (newMedia: OperativeMediaItem) => {
        onMediaChange([...media, newMedia]);
      },
    );
    navigation.navigate("AddOperativeMedia", {
      imageUri: uri,
      mimeType,
      callbackId,
      specialty,
      procedureTags,
      hasSkinCancerAssessment,
      procedureDate,
    });
  };

  const handleCameraCapture = async () => {
    if (!cameraPermission?.granted) {
      if (cameraPermission?.canAskAgain !== false) {
        const result = await requestCameraPermission();
        if (!result.granted) return;
      } else {
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
        const mime = asset.mimeType || "image/jpeg";
        navigateToAddMedia(asset.uri, mime);
      }
    } catch (error: any) {
      console.error("Error capturing image:", error);
      Alert.alert(
        "Error",
        `Failed to capture image: ${error?.message || "Unknown error"}`,
      );
    }
  };

  const handleGalleryPick = async () => {
    const remaining = maxItems - media.length;
    if (remaining <= 0) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.7,
        allowsMultipleSelection: true,
        selectionLimit: remaining,
      });

      if (!result.canceled && result.assets.length > 0) {
        if (result.assets.length === 1) {
          const asset = result.assets[0];
          if (!asset) return;
          const mime = asset.mimeType || "image/jpeg";
          navigateToAddMedia(asset.uri, mime);
        } else {
          const startingMedia = [...media];
          const importedItems: OperativeMediaItem[] = [];
          await importMediaAssets(result.assets, (savedAsset) => {
            importedItems.push({
              id: uuidv4(),
              localUri: savedAsset.localUri,
              mimeType: savedAsset.mimeType,
              tag: "intraop",
              mediaType: "intraoperative_photo",
              createdAt: new Date().toISOString(),
            });
            onMediaChange([...startingMedia, ...importedItems]);
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (error: any) {
      console.error("Error picking image:", error);
      Alert.alert(
        "Error",
        `Failed to select images: ${error?.message || "Unknown error"}`,
      );
    }
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
      specialty,
      procedureTags,
      hasSkinCancerAssessment,
      procedureDate,
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
            const { deleteEncryptedMedia } = await import("@/lib/mediaStorage");
            await deleteEncryptedMedia(item.localUri);
          }
          onMediaChange(media.filter((m) => m.id !== mediaId));
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Feather name="image" size={18} color={theme.link} />
          <ThemedText style={styles.headerTitle}>Operative Media</ThemedText>
          {protocols.length > 0 ? (
            <ProtocolBadge
              label={protocols[0]!.label}
              capturedCount={media.length}
              totalSteps={protocols.reduce((sum, p) => sum + p.steps.length, 0)}
            />
          ) : null}
        </View>
        <View style={styles.headerRight}>
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
          specialty={specialty}
          procedureTags={procedureTags}
          hasSkinCancerAssessment={hasSkinCancerAssessment}
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
                    style={[
                      styles.typeBadgeText,
                      { color: theme.buttonText },
                    ]}
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
                onPress={handleCameraCapture}
                style={[styles.smallAddButton, { backgroundColor: theme.link }]}
              >
                <Feather name="camera" size={18} color={theme.buttonText} />
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
              onPress={handleCameraCapture}
              style={[styles.addButton, { backgroundColor: theme.link }]}
            >
              <Feather name="camera" size={20} color={theme.buttonText} />
              <ThemedText
                style={[styles.addButtonText, { color: theme.buttonText }]}
              >
                Take Photo
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
            Add intraoperative photos, X-rays, or other imaging
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
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
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
