import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Alert,
  Platform,
  ScrollView,
  FlatList,
  TextInput,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { v4 as uuidv4 } from "uuid";
import { saveEncryptedMedia, deleteEncryptedMedia } from "@/lib/mediaStorage";
import { EncryptedImage } from "@/components/EncryptedImage";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useMediaCallback } from "@/contexts/MediaCallbackContext";
import {
  MediaAttachment,
  MediaCategory,
  MEDIA_CATEGORY_OPTIONS,
  MEDIA_CATEGORY_LABELS,
} from "@/types/case";

type MediaManagementRouteProp = RouteProp<RootStackParamList, "MediaManagement">;
type MediaManagementNavigationProp = NativeStackNavigationProp<RootStackParamList, "MediaManagement">;

export default function MediaManagementScreen() {
  const navigation = useNavigation<MediaManagementNavigationProp>();
  const route = useRoute<MediaManagementRouteProp>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { executeCallback } = useMediaCallback();

  const { existingAttachments, callbackId, maxAttachments = 20, context = "case", eventType } = route.params || {};

  const [attachments, setAttachments] = useState<MediaAttachment[]>(existingAttachments || []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastSelectedCategory, setLastSelectedCategory] = useState<MediaCategory | null>(null);
  const [cameraPermission, requestCameraPermission] = ImagePicker.useCameraPermissions();

  const canAddMore = attachments.length < maxAttachments;

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
              ? [{ text: "Open Settings", onPress: async () => {
                  try {
                    const { Linking } = await import("react-native");
                    await Linking.openSettings();
                  } catch (e) {}
                }}]
              : []),
          ]
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
          })
        );
        setAttachments((prev) => [...prev, ...encryptedAttachments]);
        if (encryptedAttachments.length === 1) {
          setSelectedId(encryptedAttachments[0].id);
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Error picking images:", error);
      Alert.alert("Error", "Failed to select images.");
    }
  };

  const handleRemove = async (id: string) => {
    const item = attachments.find((a) => a.id === id);
    if (item) {
      await deleteEncryptedMedia(item.localUri);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAttachments((prev) => prev.filter((a) => a.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
    }
  };

  const handleSetCategory = (id: string, category: MediaCategory) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLastSelectedCategory(category);
    setAttachments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, category } : a))
    );
  };

  const handleTagAll = () => {
    if (!lastSelectedCategory) {
      Alert.alert(
        "Select a category first",
        "Tap a category on any photo, then use 'Tag all' to apply it to the rest."
      );
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAttachments((prev) =>
      prev.map((a) => (!a.category ? { ...a, category: lastSelectedCategory } : a))
    );
  };

  const handleCaptionChange = (id: string, caption: string) => {
    setAttachments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, caption } : a))
    );
  };

  const handleSave = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (callbackId) {
      executeCallback(callbackId, attachments);
    }
    navigation.goBack();
  }, [attachments, callbackId, executeCallback, navigation]);

  const selectedAttachment = attachments.find((a) => a.id === selectedId);

  const sortedGroupedCategories = useMemo(() => {
    const grouped = MEDIA_CATEGORY_OPTIONS.reduce((acc, option) => {
      if (!acc[option.group]) acc[option.group] = [];
      acc[option.group].push(option);
      return acc;
    }, {} as Record<string, typeof MEDIA_CATEGORY_OPTIONS>);

    if (eventType === "discharge_photo") {
      const order = ["Discharge", "Follow-up", "Imaging", "Operation Day", "Other"];
      return order
        .filter((g) => grouped[g])
        .map((g) => [g, grouped[g]] as [string, typeof MEDIA_CATEGORY_OPTIONS]);
    }

    return Object.entries(grouped);
  }, [eventType]);

  const renderThumbnail = ({ item }: { item: MediaAttachment }) => (
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
      <EncryptedImage uri={item.localUri} style={styles.thumbnailImage} />
      {item.category ? (
        <View style={[styles.categoryBadge, { backgroundColor: theme.link }]}>
          <ThemedText style={styles.categoryBadgeText}>
            {MEDIA_CATEGORY_LABELS[item.category].slice(0, 6)}
          </ThemedText>
        </View>
      ) : null}
      <Pressable
        onPress={() => handleRemove(item.id)}
        style={[styles.removeButton, { backgroundColor: theme.error }]}
        hitSlop={8}
      >
        <Feather name="x" size={10} color="#fff" />
      </Pressable>
    </Pressable>
  );

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView style={styles.keyboardAvoidingView} behavior="padding" keyboardVerticalOffset={0}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Feather name="x" size={24} color={theme.text} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Manage Media</ThemedText>
        <Pressable onPress={handleSave} style={styles.headerButton}>
          <ThemedText style={[styles.saveText, { color: theme.link }]}>Done</ThemedText>
        </Pressable>
      </View>

      {attachments.length > 1 ? (
        <View style={{
          flexDirection: "row",
          justifyContent: "flex-end",
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}>
          <Pressable
            onPress={handleTagAll}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: Spacing.xs,
              paddingHorizontal: Spacing.md,
              paddingVertical: Spacing.sm,
              borderRadius: BorderRadius.sm,
              backgroundColor: lastSelectedCategory ? theme.link + "15" : theme.backgroundElevated,
              borderWidth: 1,
              borderColor: lastSelectedCategory ? theme.link : theme.border,
            }}
          >
            <Feather name="tag" size={14} color={lastSelectedCategory ? theme.link : theme.textTertiary} />
            <ThemedText style={{
              fontSize: 13,
              color: lastSelectedCategory ? theme.link : theme.textSecondary,
              fontWeight: "500",
            }}>
              {lastSelectedCategory
                ? `Tag all untagged as: ${MEDIA_CATEGORY_LABELS[lastSelectedCategory]}`
                : "Tag all untagged"}
            </ThemedText>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.thumbnailStrip}>
        <FlatList
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
                  <Feather name="camera" size={20} color="#fff" />
                </Pressable>
                <Pressable
                  onPress={handleGalleryPick}
                  style={[styles.addButton, { backgroundColor: theme.backgroundElevated }]}
                >
                  <Feather name="image" size={20} color={theme.text} />
                </Pressable>
              </View>
            ) : null
          }
        />
      </View>

      {selectedAttachment ? (
        <ScrollView style={styles.detailSection} contentContainerStyle={styles.detailContent}>
          <View style={styles.previewContainer}>
            <EncryptedImage
              uri={selectedAttachment.localUri}
              style={styles.previewImage}
              resizeMode="contain"
            />
          </View>

          <TextInput
            testID="input-caption"
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
            onChangeText={(text) => handleCaptionChange(selectedAttachment.id, text)}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            Select Category
          </ThemedText>

          {sortedGroupedCategories.map(([groupName, options]) => (
            <View key={groupName} style={styles.categoryGroup}>
              <ThemedText style={[styles.groupTitle, { color: theme.textSecondary }]}>
                {groupName}
              </ThemedText>
              <View style={styles.categoryGrid}>
                {options.map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() => handleSetCategory(selectedAttachment.id, option.value)}
                    style={[
                      styles.categoryOption,
                      {
                        backgroundColor:
                          selectedAttachment.category === option.value
                            ? theme.link + "20"
                            : theme.backgroundElevated,
                        borderColor:
                          selectedAttachment.category === option.value
                            ? theme.link
                            : theme.border,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.categoryOptionText,
                        {
                          color:
                            selectedAttachment.category === option.value
                              ? theme.link
                              : theme.text,
                          fontWeight:
                            selectedAttachment.category === option.value ? "600" : "400",
                        },
                      ]}
                    >
                      {option.label}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          {attachments.length === 0 ? (
            <>
              <Feather name="image" size={48} color={theme.textTertiary} />
              <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                No photos added yet
              </ThemedText>
              <ThemedText style={[styles.emptySubtext, { color: theme.textTertiary }]}>
                Tap camera or gallery to add photos
              </ThemedText>
              <View style={styles.emptyButtons}>
                <Pressable
                onPress={handleCameraCapture}
                style={[styles.emptyActionButton, { backgroundColor: theme.link }]}
              >
                <Feather name="camera" size={20} color="#fff" />
                <ThemedText style={[styles.emptyActionText, { color: "#fff" }]}>Take Photo</ThemedText>
              </Pressable>
              <Pressable
                onPress={handleGalleryPick}
                style={[styles.emptyActionButton, { backgroundColor: theme.backgroundElevated, borderWidth: 1, borderColor: theme.border }]}
              >
                <Feather name="image" size={20} color={theme.text} />
                <ThemedText style={styles.emptyActionText}>From Gallery</ThemedText>
              </Pressable>
              </View>
            </>
          ) : (
            <>
              <Feather name="check-circle" size={48} color={theme.textTertiary} />
              <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                Select a photo to categorize
              </ThemedText>
            </>
          )}
        </View>
      )}

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <ThemedText style={[styles.countText, { color: theme.textSecondary }]}>
          {attachments.length} photo{attachments.length !== 1 ? "s" : ""} added
          {attachments.filter((a) => !a.category).length > 0 && (
            <ThemedText style={{ color: theme.warning }}>
              {" "}({attachments.filter((a) => !a.category).length} uncategorized)
            </ThemedText>
          )}
        </ThemedText>
        <Pressable
          onPress={handleSave}
          disabled={attachments.length === 0}
          style={[
            styles.saveButtonPressable,
            { 
              backgroundColor: attachments.length === 0 ? theme.textTertiary : theme.link,
              opacity: attachments.length === 0 ? 0.5 : 1,
            }
          ]}
        >
          <ThemedText style={styles.saveButtonText}>Save Photos</ThemedText>
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
  categoryBadge: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  categoryBadgeText: {
    fontSize: 8,
    color: "#fff",
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  categoryGroup: {
    marginBottom: Spacing.lg,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  categoryOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  categoryOptionText: {
    fontSize: 14,
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
  emptyButton: {
    minWidth: 130,
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
  saveButton: {
    width: "100%",
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
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
