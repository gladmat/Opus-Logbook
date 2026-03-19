import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  Alert,
  Platform,
  ScrollView,
  TextInput,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@/components/FeatherIcon";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { v4 as uuidv4 } from "uuid";
import {
  saveEncryptedMediaFromUri,
  deleteEncryptedMedia,
} from "@/lib/mediaStorage";
import { EncryptedImage } from "@/components/EncryptedImage";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { DatePickerField } from "@/components/FormField";
import { useMediaCallback } from "@/contexts/MediaCallbackContext";
import {
  normalizeDateOnlyValue,
  toIsoDateValue,
  toUtcNoonIsoTimestamp,
} from "@/lib/dateValues";
import { MediaTagPicker } from "@/components/media";
import {
  resolveMediaTag,
  suggestDefaultMediaTag,
} from "@/lib/mediaTagHelpers";
import type { MediaTag } from "@/types/media";
import {
  buildOperativeMediaItemRecord,
  isPersistedMediaUriValue,
  resolveOperativeMediaSavePlan,
} from "@/lib/operativeMediaForm";

type AddOperativeMediaRouteProp = RouteProp<
  RootStackParamList,
  "AddOperativeMedia"
>;
type AddOperativeMediaNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "AddOperativeMedia"
>;

export default function AddOperativeMediaScreen() {
  const navigation = useNavigation<AddOperativeMediaNavigationProp>();
  const route = useRoute<AddOperativeMediaRouteProp>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const { executeGenericCallback } = useMediaCallback();
  const {
    imageUri,
    mimeType = "image/jpeg",
    callbackId,
    editMode = false,
    existingMediaId,
    existingTag,
    existingCaption,
    existingTimestamp,
    existingCreatedAt,
    mediaContext,
  } = route.params;

  // Resolve initial tag from existingTag or suggest from context
  const initialTag: MediaTag = existingTag
    ? existingTag
    : suggestDefaultMediaTag({
        procedureDate: mediaContext?.procedureDate,
      });

  const [selectedTag, setSelectedTag] = useState<MediaTag>(initialTag);
  const [captionInput, setCaptionInput] = useState(existingCaption || "");
  const [mediaDate, setMediaDate] = useState(
    () =>
      normalizeDateOnlyValue(existingTimestamp) ?? toIsoDateValue(new Date()),
  );
  const [cameraPermission, requestCameraPermission] =
    ImagePicker.useCameraPermissions();
  const [currentUri, setCurrentUri] = useState(imageUri);
  const [currentMimeType, setCurrentMimeType] = useState(mimeType);
  const [saving, setSaving] = useState(false);

  const handleRetakeCamera = async () => {
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
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.7,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        if (!asset) return;
        const mime = asset.mimeType || "image/jpeg";
        setCurrentUri(asset.uri);
        setCurrentMimeType(mime);
      }
    } catch {
      Alert.alert("Error", "Failed to capture image.");
    }
  };

  const handleReplaceGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.7,
      });
      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        if (!asset) return;
        const mime = asset.mimeType || "image/jpeg";
        setCurrentUri(asset.uri);
        setCurrentMimeType(mime);
      }
    } catch {
      Alert.alert("Error", "Failed to select image.");
    }
  };

  const handleConfirm = async () => {
    if (!currentUri || saving) return;
    setSaving(true);

    try {
      const savePlan = resolveOperativeMediaSavePlan({
        editMode,
        originalUri: imageUri,
        currentUri,
      });

      let finalUri = currentUri;
      let finalMimeType = currentMimeType;
      let savedReplacementUri: string | undefined;
      if (!savePlan.reuseExistingUri) {
        const savedMedia = await saveEncryptedMediaFromUri(
          currentUri,
          currentMimeType,
        );
        finalUri = savedMedia.localUri;
        finalMimeType = savedMedia.mimeType;
        savedReplacementUri = savedMedia.localUri;
      }

      // Build timestamp from selected date
      const today = toIsoDateValue(new Date());
      const timestamp =
        mediaDate === today
          ? new Date().toISOString()
          : (toUtcNoonIsoTimestamp(mediaDate) ?? new Date().toISOString());

      const mediaData = buildOperativeMediaItemRecord({
        id: editMode && existingMediaId ? existingMediaId : uuidv4(),
        localUri: finalUri,
        mimeType: finalMimeType,
        tag: selectedTag,
        caption: captionInput,
        timestamp,
        createdAt:
          editMode && existingCreatedAt
            ? existingCreatedAt
            : new Date().toISOString(),
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const committed = callbackId
        ? executeGenericCallback(callbackId, mediaData)
        : true;
      if (!committed) {
        if (savedReplacementUri) {
          await deleteEncryptedMedia(savedReplacementUri);
        }
        setSaving(false);
        Alert.alert("Error", "Failed to save media changes. Please try again.");
        return;
      }

      if (committed && savePlan.uriToDeleteAfterCommit) {
        await deleteEncryptedMedia(savePlan.uriToDeleteAfterCommit);
      }
      navigation.goBack();
    } catch (error: any) {
      setSaving(false);
      console.error("Error saving media:", error);
      Alert.alert(
        "Error",
        `Failed to save media: ${error?.message || "Unknown error"}. Please try again.`,
      );
    }
  };

  return (
    <ThemedView testID="screen-addOperativeMedia" style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.headerButton}
          >
            <Feather name="x" size={24} color={theme.text} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>
            {editMode ? "Edit Media" : "Add Media"}
          </ThemedText>
          <Pressable
            onPress={handleConfirm}
            disabled={saving}
            style={styles.headerButton}
          >
            <ThemedText
              style={[
                styles.saveText,
                { color: saving ? theme.textTertiary : theme.link },
              ]}
            >
              {saving ? "Saving..." : editMode ? "Save" : "Add"}
            </ThemedText>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={[
            styles.scrollInner,
            { paddingBottom: insets.bottom + Spacing.xl },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.previewContainer,
              { backgroundColor: theme.backgroundRoot },
            ]}
          >
            {isPersistedMediaUriValue(currentUri) ? (
              <EncryptedImage
                uri={currentUri}
                style={styles.previewImage}
                resizeMode="contain"
              />
            ) : (
              <Image
                source={{ uri: currentUri }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            )}
          </View>

          <View style={styles.replaceRow}>
            <Pressable
              onPress={handleRetakeCamera}
              style={[
                styles.replaceButton,
                { backgroundColor: theme.backgroundElevated },
              ]}
            >
              <Feather name="camera" size={16} color={theme.text} />
              <ThemedText style={styles.replaceText}>Retake</ThemedText>
            </Pressable>
            <Pressable
              onPress={handleReplaceGallery}
              style={[
                styles.replaceButton,
                { backgroundColor: theme.backgroundElevated },
              ]}
            >
              <Feather name="image" size={16} color={theme.text} />
              <ThemedText style={styles.replaceText}>Replace</ThemedText>
            </Pressable>
          </View>

          <MediaTagPicker
            selectedTag={selectedTag}
            onSelectTag={setSelectedTag}
            specialty={mediaContext?.specialty}
            procedureTags={mediaContext?.procedureTags}
            hasSkinCancerAssessment={mediaContext?.hasSkinCancerAssessment}
          />

          <DatePickerField
            label="Date"
            value={mediaDate}
            onChange={setMediaDate}
            placeholder="Select date..."
          />

          <ThemedText
            style={[styles.sectionLabel, { color: theme.textSecondary }]}
          >
            Caption (optional)
          </ThemedText>
          <TextInput
            testID="media.add.input-caption"
            value={captionInput}
            onChangeText={setCaptionInput}
            placeholder="e.g., Pre-fixation view, Flap inset..."
            placeholderTextColor={theme.textTertiary}
            style={[
              styles.captionInput,
              {
                backgroundColor: theme.backgroundRoot,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            multiline
            numberOfLines={3}
          />

          <Pressable
            testID="media.add.btn-confirm"
            onPress={handleConfirm}
            disabled={saving}
            style={[
              styles.confirmButton,
              { backgroundColor: saving ? theme.textTertiary : theme.link },
            ]}
          >
            <Feather name="check" size={20} color={theme.buttonText} />
            <ThemedText
              style={[styles.confirmButtonText, { color: theme.buttonText }]}
            >
              {saving ? "Saving..." : editMode ? "Save Changes" : "Add Media"}
            </ThemedText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
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
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: Spacing.md,
  },
  previewContainer: {
    height: 250,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginBottom: Spacing.md,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  replaceRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  replaceButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  replaceText: {
    fontSize: 13,
    fontWeight: "500",
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  captionInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15,
    minHeight: 80,
    marginBottom: Spacing.xl,
    textAlignVertical: "top",
  },
  confirmButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
