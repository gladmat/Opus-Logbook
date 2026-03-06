import React from "react";
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
import { saveEncryptedMedia, setPendingBase64 } from "@/lib/mediaStorage";
import { EncryptedImage } from "@/components/EncryptedImage";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import {
  OperativeMediaItem,
  OperativeMediaType,
  OPERATIVE_MEDIA_TYPE_LABELS,
  MediaAttachment,
  MediaCategory,
} from "@/types/case";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useMediaCallback } from "@/contexts/MediaCallbackContext";

// Mapping between OperativeMediaType and MediaCategory
const MEDIA_TYPE_TO_CATEGORY: Record<OperativeMediaType, MediaCategory> = {
  preoperative_photo: "preop",
  intraoperative_photo: "immediate_postop", // closest match for intraop photos
  xray: "xray",
  ct_scan: "ct_angiogram",
  mri: "ultrasound", // closest imaging category
  diagram: "other",
  document: "other",
  other: "other",
};

const CATEGORY_TO_MEDIA_TYPE: Partial<
  Record<MediaCategory, OperativeMediaType>
> = {
  preop: "preoperative_photo",
  flap_harvest: "intraoperative_photo",
  flap_inset: "intraoperative_photo",
  anastomosis: "intraoperative_photo",
  closure: "intraoperative_photo",
  immediate_postop: "intraoperative_photo",
  flap_planning: "preoperative_photo",
  xray: "xray",
  preop_xray: "xray",
  intraop_xray: "xray",
  postop_xray: "xray",
  ct_angiogram: "ct_scan",
  ultrasound: "other",
  other: "other",
};

interface OperativeMediaSectionProps {
  media: OperativeMediaItem[];
  onMediaChange: (media: OperativeMediaItem[]) => void;
  maxItems?: number;
}

export function OperativeMediaSection({
  media,
  onMediaChange,
  maxItems = 20,
}: OperativeMediaSectionProps) {
  const { theme } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { registerGenericCallback } = useMediaCallback();
  const [cameraPermission, requestCameraPermission] =
    ImagePicker.useCameraPermissions();
  const canAddMore = media.length < maxItems;

  const handleManageMedia = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Convert OperativeMediaItem[] to MediaAttachment[] for MediaManagementScreen
    const attachments: MediaAttachment[] = media.map((item) => ({
      id: item.id,
      localUri: item.localUri,
      thumbnailUri: item.thumbnailUri,
      mimeType: item.mimeType,
      caption: item.caption,
      createdAt: item.createdAt,
      category: MEDIA_TYPE_TO_CATEGORY[item.mediaType],
      timestamp: item.timestamp,
    }));

    const callbackId = registerGenericCallback(
      (updatedAttachments: MediaAttachment[]) => {
        // Convert back from MediaAttachment[] to OperativeMediaItem[]
        const updatedMedia: OperativeMediaItem[] = updatedAttachments.map(
          (att) => ({
            id: att.id,
            localUri: att.localUri,
            thumbnailUri: att.thumbnailUri,
            mimeType: att.mimeType,
            caption: att.caption,
            createdAt: att.createdAt,
            timestamp: att.timestamp,
            mediaType:
              (att.category && CATEGORY_TO_MEDIA_TYPE[att.category]) ||
              "intraoperative_photo",
          }),
        );
        onMediaChange(updatedMedia);
      },
    );

    navigation.navigate("MediaManagement", {
      existingAttachments: attachments,
      callbackId,
      maxAttachments: maxItems,
      context: "case",
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
        base64: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        if (!asset) return;
        const mime = asset.mimeType || "image/jpeg";
        if (asset.base64) {
          setPendingBase64(asset.base64, mime);
        }
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
        base64: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        if (result.assets.length === 1) {
          const asset = result.assets[0];
          if (!asset) return;
          const mime = asset.mimeType || "image/jpeg";
          if (asset.base64) {
            setPendingBase64(asset.base64, mime);
          }
          navigateToAddMedia(asset.uri, mime);
        } else {
          const encryptedItems = await Promise.all(
            result.assets.map(async (asset) => {
              const mime = asset.mimeType || "image/jpeg";
              const encryptedUri = asset.base64
                ? await saveEncryptedMedia(asset.base64, mime, asset.uri)
                : asset.uri;
              return {
                id: uuidv4(),
                localUri: encryptedUri,
                mimeType: asset.mimeType || "image/jpeg",
                mediaType: "intraoperative_photo" as const,
                createdAt: new Date().toISOString(),
              };
            }),
          );
          onMediaChange([...media, ...encryptedItems]);
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
      existingCaption: item.caption,
      existingTimestamp: item.timestamp,
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

      {media.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.previewContainer}
        >
          {media.map((item) => (
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
                onError={() =>
                  console.warn("Media file missing:", item.localUri)
                }
              />
              <View style={[styles.typeBadge, { backgroundColor: theme.link }]}>
                <ThemedText style={styles.typeBadgeText}>
                  {OPERATIVE_MEDIA_TYPE_LABELS[item.mediaType]}
                </ThemedText>
              </View>
              <Pressable
                onPress={() => handleRemove(item.id)}
                style={[styles.removeButton, { backgroundColor: theme.error }]}
                hitSlop={8}
              >
                <Feather name="x" size={12} color="#fff" />
              </Pressable>
              <View
                style={[
                  styles.editBadge,
                  { backgroundColor: "rgba(0,0,0,0.5)" },
                ]}
              >
                <Feather name="edit-2" size={10} color="#fff" />
              </View>
              {item.caption ? (
                <View
                  style={[
                    styles.captionOverlay,
                    { backgroundColor: "rgba(0,0,0,0.6)" },
                  ]}
                >
                  <ThemedText style={styles.captionText} numberOfLines={2}>
                    {item.caption}
                  </ThemedText>
                </View>
              ) : null}
            </Pressable>
          ))}
          {canAddMore ? (
            <View style={styles.addButtonsColumn}>
              <Pressable
                onPress={handleCameraCapture}
                style={[styles.smallAddButton, { backgroundColor: theme.link }]}
              >
                <Feather name="camera" size={18} color="#fff" />
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
              <Feather name="camera" size={20} color="#fff" />
              <ThemedText style={[styles.addButtonText, { color: "#fff" }]}>
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
    color: "#fff",
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
    color: "#fff",
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
