import React, { useState } from "react";
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
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { v4 as uuidv4 } from "uuid";
import { saveEncryptedMedia, deleteEncryptedMedia } from "@/lib/mediaStorage";
import { EncryptedImage } from "@/components/EncryptedImage";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import {
  MediaAttachment,
  MEDIA_CATEGORY_LABELS,
  TimelineEventType,
} from "@/types/case";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useMediaCallback } from "@/contexts/MediaCallbackContext";

interface MediaCaptureProps {
  attachments: MediaAttachment[];
  onAttachmentsChange: (attachments: MediaAttachment[]) => void;
  maxAttachments?: number;
  mediaType?: "photo" | "imaging" | "all";
  eventType?: TimelineEventType;
}

export function MediaCapture({
  attachments,
  onAttachmentsChange,
  maxAttachments = 10,
  mediaType = "all",
  eventType,
}: MediaCaptureProps) {
  const { theme } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { registerCallback } = useMediaCallback();
  const [cameraPermission, requestCameraPermission] =
    ImagePicker.useCameraPermissions();

  const canAddMore = attachments.length < maxAttachments;

  const handleOpenMediaManager = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const callbackId = registerCallback(onAttachmentsChange);
    navigation.navigate("MediaManagement", {
      existingAttachments: attachments,
      callbackId,
      maxAttachments,
      context: "case",
      eventType,
    });
  };

  const handleCameraCapture = async () => {
    if (!cameraPermission?.granted) {
      if (cameraPermission?.canAskAgain !== false) {
        const result = await requestCameraPermission();
        if (!result.granted) {
          return;
        }
      } else {
        Alert.alert(
          "Camera Permission Required",
          "Please enable camera access in your device settings to capture photos.",
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
                      } catch (e) {}
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
        const encryptedUri = asset.base64
          ? await saveEncryptedMedia(asset.base64, mime, asset.uri)
          : asset.uri;
        const newAttachment: MediaAttachment = {
          id: uuidv4(),
          localUri: encryptedUri,
          mimeType: mime,
          createdAt: new Date().toISOString(),
        };
        onAttachmentsChange([...attachments, newAttachment]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Error capturing image:", error);
      Alert.alert("Error", "Failed to capture image. Please try again.");
    }
  };

  const handleGalleryPick = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.7,
        allowsMultipleSelection: true,
        selectionLimit: maxAttachments - attachments.length,
        base64: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        const encryptedAttachments = await Promise.all(
          result.assets.map(async (asset) => {
            const mime = asset.mimeType || "image/jpeg";
            return {
              id: uuidv4(),
              localUri: asset.base64
                ? await saveEncryptedMedia(asset.base64, mime, asset.uri)
                : asset.uri,
              mimeType: mime,
              createdAt: new Date().toISOString(),
            };
          }),
        );
        onAttachmentsChange([...attachments, ...encryptedAttachments]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to select image. Please try again.");
    }
  };

  const handleRemove = async (attachmentId: string) => {
    const item = attachments.find((a) => a.id === attachmentId);
    if (item) {
      await deleteEncryptedMedia(item.localUri);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onAttachmentsChange(attachments.filter((a) => a.id !== attachmentId));
  };

  const handleCaptionEdit = (attachmentId: string) => {
    const attachment = attachments.find((a) => a.id === attachmentId);
    if (!attachment) return;

    Alert.prompt?.(
      "Add Caption",
      "Enter a caption for this image",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save",
          onPress: (caption?: string) => {
            if (caption !== undefined) {
              onAttachmentsChange(
                attachments.map((a) =>
                  a.id === attachmentId ? { ...a, caption } : a,
                ),
              );
            }
          },
        },
      ],
      "plain-text",
      attachment.caption,
    );
  };

  const getPlaceholderText = () => {
    switch (mediaType) {
      case "photo":
        return "Add follow-up photos";
      case "imaging":
        return "Add X-ray or imaging";
      default:
        return "Add photos or images";
    }
  };

  return (
    <View style={styles.container}>
      {attachments.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.previewContainer}
        >
          {attachments.map((attachment) => (
            <Pressable
              key={attachment.id}
              onPress={handleOpenMediaManager}
              style={[
                styles.previewItem,
                { backgroundColor: theme.backgroundDefault },
              ]}
            >
              <EncryptedImage
                uri={attachment.localUri}
                style={styles.previewImage}
                resizeMode="cover"
              />
              <Pressable
                onPress={() => handleRemove(attachment.id)}
                style={[styles.removeButton, { backgroundColor: theme.error }]}
                hitSlop={8}
              >
                <Feather name="x" size={12} color="#fff" />
              </Pressable>
              {attachment.category ? (
                <View
                  style={[
                    styles.categoryBadge,
                    { backgroundColor: theme.link },
                  ]}
                >
                  <ThemedText
                    style={styles.categoryBadgeText}
                    numberOfLines={1}
                  >
                    {MEDIA_CATEGORY_LABELS[attachment.category]}
                  </ThemedText>
                </View>
              ) : (
                <View
                  style={[
                    styles.categoryBadge,
                    { backgroundColor: theme.warning },
                  ]}
                >
                  <ThemedText
                    style={styles.categoryBadgeText}
                    numberOfLines={1}
                  >
                    Uncategorized
                  </ThemedText>
                </View>
              )}
            </Pressable>
          ))}
          <View style={styles.addButtonsColumn}>
            <Pressable
              onPress={handleOpenMediaManager}
              style={[styles.manageButton, { backgroundColor: theme.link }]}
            >
              <Feather name="grid" size={16} color={theme.buttonText} />
              <ThemedText
                style={[styles.manageButtonText, { color: theme.buttonText }]}
              >
                Manage
              </ThemedText>
            </Pressable>
          </View>
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
            {getPlaceholderText()}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.sm,
  },
  previewContainer: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  previewItem: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: "100%",
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
  captionButton: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  captionBadge: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  captionText: {
    fontSize: 10,
  },
  addButtonsColumn: {
    gap: Spacing.xs,
    justifyContent: "center",
  },
  smallAddButton: {
    width: 48,
    height: 48,
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
  categoryBadge: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  categoryBadgeText: {
    fontSize: 9,
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
  },
  manageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  manageButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
