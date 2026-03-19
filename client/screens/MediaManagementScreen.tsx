import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Alert,
  Platform,
  ScrollView,
  TextInput,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@/components/FeatherIcon";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import {
  deleteMultipleEncryptedMedia,
  importMediaAssets,
  saveEncryptedMediaFromUri,
} from "@/lib/mediaStorage";
import { EncryptedImage } from "@/components/EncryptedImage";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { DatePickerField } from "@/components/FormField";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { toUtcNoonIsoTimestamp } from "@/lib/dateValues";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useMediaCallback } from "@/contexts/MediaCallbackContext";
import { MediaAttachment } from "@/types/case";
import { MediaTagPicker } from "@/components/media";
import { MEDIA_TAG_REGISTRY } from "@/types/media";
import { resolveMediaTag } from "@/lib/mediaTagHelpers";
import { buildDefaultMediaAttachment } from "@/lib/mediaAttachmentDefaults";
import type { MediaTag } from "@/types/media";

type MediaManagementRouteProp = RouteProp<
  RootStackParamList,
  "MediaManagement"
>;
type MediaManagementNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "MediaManagement"
>;

export default function MediaManagementScreen() {
  const navigation = useNavigation<MediaManagementNavigationProp>();
  const route = useRoute<MediaManagementRouteProp>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { executeCallback } = useMediaCallback();

  const {
    existingAttachments,
    callbackId,
    maxAttachments = 15,
    eventType,
    mediaContext,
    defaultMediaDate,
  } = route.params || {};
  const initialAttachments = useMemo(
    () => existingAttachments || [],
    [existingAttachments],
  );

  const [attachments, setAttachments] =
    useState<MediaAttachment[]>(initialAttachments);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastSelectedTag, setLastSelectedTag] = useState<MediaTag | null>(null);
  const [saving, setSaving] = useState(false);
  const [cameraPermission, requestCameraPermission] =
    ImagePicker.useCameraPermissions();
  const allowCloseRef = useRef(false);
  const addedUrisRef = useRef<Set<string>>(new Set());
  const canAddMore = attachments.length < maxAttachments;
  const isDirty = useMemo(
    () => JSON.stringify(attachments) !== JSON.stringify(initialAttachments),
    [attachments, initialAttachments],
  );

  const discardPendingNewMedia = useCallback(async () => {
    const newUris = Array.from(addedUrisRef.current);
    if (newUris.length > 0) {
      await deleteMultipleEncryptedMedia(newUris);
      addedUrisRef.current.clear();
    }
  }, []);

  const finalizeRemovedMedia = useCallback(async () => {
    const currentIds = new Set(attachments.map((attachment) => attachment.id));
    const currentUris = new Set(
      attachments.map((attachment) => attachment.localUri),
    );
    const removedExistingUris = initialAttachments
      .filter((attachment) => !currentIds.has(attachment.id))
      .map((attachment) => attachment.localUri);
    const removedNewUris = Array.from(addedUrisRef.current).filter(
      (uri) => !currentUris.has(uri),
    );
    const urisToDelete = [...removedExistingUris, ...removedNewUris];

    if (urisToDelete.length > 0) {
      await deleteMultipleEncryptedMedia(urisToDelete);
    }
  }, [attachments, initialAttachments]);

  const handleCameraCapture = async () => {
    if (!cameraPermission?.granted) {
      if (cameraPermission?.canAskAgain !== false) {
        const result = await requestCameraPermission();
        if (!result.granted) return;
      } else {
        Alert.alert(
          "Camera Permission Required",
          "Please enable camera access in settings.",
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
        const savedMedia = await saveEncryptedMediaFromUri(
          asset.uri,
          asset.mimeType || "image/jpeg",
        );
        const newAttachment = buildDefaultMediaAttachment({
          savedMedia,
          createdAt: new Date().toISOString(),
          eventType,
          procedureDate: mediaContext?.procedureDate,
          mediaDate: defaultMediaDate,
        });
        addedUrisRef.current.add(newAttachment.localUri);
        setAttachments((prev) => [...prev, newAttachment]);
        setSelectedId(newAttachment.id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Error capturing image:", error);
      Alert.alert("Error", "Failed to capture image.");
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
      });

      if (!result.canceled && result.assets.length > 0) {
        const startingAttachments = [...attachments];
        const importedAttachments: MediaAttachment[] = [];
        await importMediaAssets(result.assets, (savedAsset) => {
          const newAttachment = buildDefaultMediaAttachment({
            savedMedia: savedAsset,
            createdAt: new Date().toISOString(),
            eventType,
            procedureDate: mediaContext?.procedureDate,
            mediaDate: defaultMediaDate,
          });
          addedUrisRef.current.add(newAttachment.localUri);
          importedAttachments.push(newAttachment);
          setAttachments([...startingAttachments, ...importedAttachments]);
          setSelectedId((prev) => prev ?? newAttachment.id);
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Error picking images:", error);
      Alert.alert("Error", "Failed to select images.");
    }
  };

  const handleRemove = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAttachments((prev) => prev.filter((a) => a.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
    }
  };

  const handleSetTag = (id: string, tag: MediaTag) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLastSelectedTag(tag);
    setAttachments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, tag } : a)),
    );
  };

  const handleTagAll = () => {
    if (!lastSelectedTag) {
      Alert.alert(
        "Select a tag first",
        "Tap a tag on any photo, then use 'Tag all' to apply it to the rest.",
      );
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAttachments((prev) =>
      prev.map((a) => (!a.tag ? { ...a, tag: lastSelectedTag } : a)),
    );
  };

  const handleCaptionChange = (id: string, caption: string) => {
    setAttachments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, caption } : a)),
    );
  };

  const handleDateChange = (id: string, date: string) => {
    const timestamp = toUtcNoonIsoTimestamp(date) ?? new Date().toISOString();
    setAttachments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, timestamp } : a)),
    );
  };

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (callbackId) {
        executeCallback(callbackId, attachments);
      }
      await finalizeRemovedMedia();
      allowCloseRef.current = true;
      navigation.goBack();
    } catch (error) {
      console.error("Error saving media changes:", error);
      Alert.alert("Error", "Failed to save media changes.");
      setSaving(false);
    }
  }, [
    attachments,
    callbackId,
    executeCallback,
    finalizeRemovedMedia,
    navigation,
    saving,
  ]);

  const discardChanges = useCallback(async () => {
    try {
      await discardPendingNewMedia();
      allowCloseRef.current = true;
      navigation.goBack();
    } catch (error) {
      console.error("Error discarding media changes:", error);
      Alert.alert("Error", "Failed to discard media changes cleanly.");
    }
  }, [discardPendingNewMedia, navigation]);

  const handleAttemptClose = useCallback(() => {
    if (!isDirty || saving) {
      allowCloseRef.current = true;
      navigation.goBack();
      return;
    }

    Alert.alert(
      "Save media changes?",
      "Your photo edits have not been saved.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => {
            void discardChanges();
          },
        },
        {
          text: "Save",
          onPress: () => {
            void handleSave();
          },
        },
      ],
    );
  }, [discardChanges, handleSave, isDirty, navigation, saving]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (event) => {
      if (allowCloseRef.current || !isDirty || saving) {
        return;
      }

      event.preventDefault();
      handleAttemptClose();
    });

    return unsubscribe;
  }, [handleAttemptClose, isDirty, navigation, saving]);

  const selectedAttachment = attachments.find((a) => a.id === selectedId);

  const renderThumbnail = ({ item }: { item: MediaAttachment }) => {
    const resolvedTag = item.tag ?? resolveMediaTag(item);
    const tagLabel =
      resolvedTag !== "other"
        ? MEDIA_TAG_REGISTRY[resolvedTag]?.label
        : undefined;

    return (
      <Pressable
        onPress={() => setSelectedId(item.id)}
        style={[
          styles.thumbnail,
          {
            borderColor: selectedId === item.id ? theme.link : theme.border,
            borderWidth: selectedId === item.id ? 2 : 1,
          },
        ]}
      >
        <EncryptedImage
          uri={item.localUri}
          style={styles.thumbnailImage}
          thumbnail
        />
        {tagLabel ? (
          <View style={[styles.tagBadge, { backgroundColor: theme.link }]}>
            <ThemedText
              style={[styles.tagBadgeText, { color: theme.buttonText }]}
              numberOfLines={1}
            >
              {tagLabel.slice(0, 6)}
            </ThemedText>
          </View>
        ) : null}
        <Pressable
          onPress={() => handleRemove(item.id)}
          style={[styles.removeButton, { backgroundColor: theme.error }]}
          hitSlop={8}
        >
          <Feather name="x" size={10} color={theme.buttonText} />
        </Pressable>
      </Pressable>
    );
  };

  return (
    <ThemedView testID="screen-mediaManagement" style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
          <Pressable onPress={handleAttemptClose} style={styles.headerButton}>
            <Feather name="x" size={24} color={theme.text} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Manage Media</ThemedText>
          <Pressable
            onPress={() => {
              void handleSave();
            }}
            disabled={saving}
            style={styles.headerButton}
          >
            <ThemedText
              style={[
                styles.saveText,
                { color: saving ? theme.textTertiary : theme.link },
              ]}
            >
              Done
            </ThemedText>
          </Pressable>
        </View>

        {attachments.length > 1 ? (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              paddingHorizontal: Spacing.md,
              paddingVertical: Spacing.sm,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            }}
          >
            <Pressable
              onPress={handleTagAll}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: Spacing.xs,
                paddingHorizontal: Spacing.md,
                paddingVertical: Spacing.sm,
                borderRadius: BorderRadius.sm,
                backgroundColor: lastSelectedTag
                  ? theme.link + "15"
                  : theme.backgroundElevated,
                borderWidth: 1,
                borderColor: lastSelectedTag ? theme.link : theme.border,
              }}
            >
              <Feather
                name="tag"
                size={14}
                color={lastSelectedTag ? theme.link : theme.textTertiary}
              />
              <ThemedText
                style={{
                  fontSize: 13,
                  color: lastSelectedTag ? theme.link : theme.textSecondary,
                  fontWeight: "500",
                }}
              >
                {lastSelectedTag
                  ? `Tag all untagged as: ${MEDIA_TAG_REGISTRY[lastSelectedTag]?.label ?? lastSelectedTag}`
                  : "Tag all untagged"}
              </ThemedText>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.thumbnailStrip}>
          <FlashList
            data={attachments}
            renderItem={renderThumbnail}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbnailList}
            ListFooterComponent={
              canAddMore ? (
                <View style={styles.addButtonsRow}>
                  <Pressable
                    onPress={handleCameraCapture}
                    style={[styles.addButton, { backgroundColor: theme.link }]}
                  >
                    <Feather name="camera" size={20} color={theme.buttonText} />
                  </Pressable>
                  <Pressable
                    onPress={handleGalleryPick}
                    style={[
                      styles.addButton,
                      { backgroundColor: theme.backgroundElevated },
                    ]}
                  >
                    <Feather name="image" size={20} color={theme.text} />
                  </Pressable>
                </View>
              ) : null
            }
          />
        </View>

        {selectedAttachment ? (
          <ScrollView
            style={styles.detailSection}
            contentContainerStyle={styles.detailContent}
          >
            <View style={styles.previewContainer}>
              <EncryptedImage
                uri={selectedAttachment.localUri}
                style={styles.previewImage}
                resizeMode="contain"
              />
            </View>

            <TextInput
              testID="media.management.input-caption"
              style={[
                styles.captionInput,
                {
                  color: theme.text,
                  backgroundColor: theme.backgroundElevated,
                  borderColor: theme.border,
                },
              ]}
              placeholder="Add a caption or note..."
              placeholderTextColor={theme.textTertiary}
              value={selectedAttachment.caption || ""}
              onChangeText={(text) =>
                handleCaptionChange(selectedAttachment.id, text)
              }
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <DatePickerField
              label="Date"
              value={
                selectedAttachment.timestamp ?? selectedAttachment.createdAt
              }
              onChange={(date) => handleDateChange(selectedAttachment.id, date)}
              placeholder="Select date..."
            />

            <MediaTagPicker
              selectedTag={
                selectedAttachment.tag ?? resolveMediaTag(selectedAttachment)
              }
              onSelectTag={(tag) => handleSetTag(selectedAttachment.id, tag)}
              specialty={mediaContext?.specialty}
              procedureTags={mediaContext?.procedureTags}
              hasSkinCancerAssessment={mediaContext?.hasSkinCancerAssessment}
            />
          </ScrollView>
        ) : (
          <View style={styles.emptyState}>
            {attachments.length === 0 ? (
              <>
                <Feather name="image" size={48} color={theme.textTertiary} />
                <ThemedText
                  style={[styles.emptyText, { color: theme.textSecondary }]}
                >
                  No photos added yet
                </ThemedText>
                <ThemedText
                  style={[styles.emptySubtext, { color: theme.textTertiary }]}
                >
                  Tap camera or gallery to add photos
                </ThemedText>
                <View style={styles.emptyButtons}>
                  <Pressable
                    onPress={handleCameraCapture}
                    style={[
                      styles.emptyActionButton,
                      { backgroundColor: theme.link },
                    ]}
                  >
                    <Feather name="camera" size={20} color={theme.buttonText} />
                    <ThemedText
                      style={[
                        styles.emptyActionText,
                        { color: theme.buttonText },
                      ]}
                    >
                      Take Photo
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={handleGalleryPick}
                    style={[
                      styles.emptyActionButton,
                      {
                        backgroundColor: theme.backgroundElevated,
                        borderWidth: 1,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Feather name="image" size={20} color={theme.text} />
                    <ThemedText style={styles.emptyActionText}>
                      From Gallery
                    </ThemedText>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Feather
                  name="check-circle"
                  size={48}
                  color={theme.textTertiary}
                />
                <ThemedText
                  style={[styles.emptyText, { color: theme.textSecondary }]}
                >
                  Select a photo to tag
                </ThemedText>
              </>
            )}
          </View>
        )}

        <View
          style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}
        >
          <ThemedText
            style={[styles.countText, { color: theme.textSecondary }]}
          >
            {attachments.length} photo{attachments.length !== 1 ? "s" : ""}{" "}
            added
            {attachments.filter((a) => !a.tag).length > 0 && (
              <ThemedText style={{ color: theme.warning }}>
                {" "}
                ({attachments.filter((a) => !a.tag).length} untagged)
              </ThemedText>
            )}
          </ThemedText>
          <Pressable
            onPress={handleSave}
            disabled={attachments.length === 0 || saving}
            style={[
              styles.saveButtonPressable,
              {
                backgroundColor:
                  attachments.length === 0 || saving
                    ? theme.textTertiary
                    : theme.link,
                opacity: attachments.length === 0 || saving ? 0.5 : 1,
              },
            ]}
          >
            <ThemedText
              style={[styles.saveButtonText, { color: theme.buttonText }]}
            >
              {saving ? "Saving..." : "Save Photos"}
            </ThemedText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  headerButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  saveText: {
    fontSize: 16,
    fontWeight: "600",
  },
  thumbnailStrip: {
    height: 90,
    borderBottomWidth: 1,
  },
  thumbnailList: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    alignItems: "center",
  },
  thumbnail: {
    width: 70,
    height: 70,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
    position: "relative",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  tagBadge: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  tagBadgeText: {
    fontSize: 8,
    fontWeight: "600",
    textAlign: "center",
  },
  removeButton: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    alignItems: "center",
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  detailSection: {
    flex: 1,
  },
  detailContent: {
    padding: Spacing.md,
  },
  previewContainer: {
    height: 200,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginBottom: Spacing.lg,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  captionInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 14,
    minHeight: 72,
    marginBottom: Spacing.lg,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "500",
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: Spacing.xs,
    textAlign: "center",
  },
  emptyButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  footer: {
    padding: Spacing.md,
    borderTopWidth: 1,
  },
  countText: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  emptyActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    minWidth: 130,
  },
  emptyActionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  saveButtonPressable: {
    width: "100%",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
