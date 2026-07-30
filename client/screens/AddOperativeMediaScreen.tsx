import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
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
import { notFutureMax } from "@/lib/dateBounds";
import { useMediaCallback } from "@/contexts/MediaCallbackContext";
import {
  normalizeDateOnlyValue,
  toIsoDateValue,
  toUtcNoonIsoTimestamp,
} from "@/lib/dateValues";
import { MediaTagPicker } from "@/components/media";
import { suggestDefaultMediaTag } from "@/lib/mediaTagHelpers";
import type { MediaTag } from "@/types/media";
import {
  buildOperativeMediaItemRecord,
  isPersistedMediaUriValue,
  resolveOperativeMediaSavePlan,
} from "@/lib/operativeMediaForm";
import { offerGalleryCleanup } from "@/lib/galleryCleanup";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import {
  deleteEnhancedTemp,
  getEnhanceDefaultsForTag,
  isImagingTag,
  runXrayEnhancement,
  shouldAutoEnhance,
} from "@/lib/imageEnhance";

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
    existingEnhanced,
    mediaContext,
    sourceAssetId,
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
  // Camera Roll asset id of the CURRENT image when it came from the gallery.
  // The delete-originals offer fires only after the encrypted copy commits;
  // cancelling this screen must never touch the original.
  const galleryAssetIdRef = useRef<string | null>(sourceAssetId ?? null);

  // X-ray enhancement: enhancedUri is a cache-dir temp rendered by the
  // native module for the CURRENT source + tag defaults; enhancedKeyRef
  // tracks which (source uri, grayscale) pair it belongs to so retake /
  // replace / rotate / a tag flip to a colour modality re-runs it.
  const [enhancedUri, setEnhancedUri] = useState<string | null>(null);
  const [enhancing, setEnhancing] = useState(false);
  const [showEnhanced, setShowEnhanced] = useState(true);
  const enhancedKeyRef = useRef<string | null>(null);
  const enhancedUriRef = useRef<string | null>(null);
  enhancedUriRef.current = enhancedUri;

  const resetEnhancement = () => {
    enhancedKeyRef.current = null;
    setShowEnhanced(true);
    setEnhancedUri((prev) => {
      deleteEnhancedTemp(prev);
      return null;
    });
  };

  useEffect(() => {
    if (!shouldAutoEnhance({ tag: selectedTag, uri: currentUri })) return;
    const key = `${currentUri}::${getEnhanceDefaultsForTag(selectedTag).grayscale}`;
    if (enhancedKeyRef.current === key) return;

    let cancelled = false;
    setEnhancing(true);
    void runXrayEnhancement(currentUri, selectedTag).then((result) => {
      if (cancelled) {
        deleteEnhancedTemp(result?.uri);
        return;
      }
      setEnhancing(false);
      if (result) {
        enhancedKeyRef.current = key;
        setShowEnhanced(true);
        setEnhancedUri((prev) => {
          deleteEnhancedTemp(prev);
          return result.uri;
        });
      }
    });
    return () => {
      cancelled = true;
      setEnhancing(false);
    };
  }, [selectedTag, currentUri]);

  // The enhanced temp is only an intermediate: after a successful save the
  // bytes live in the encrypted store, and on cancel it's abandoned — either
  // way it can go when the screen unmounts.
  useEffect(() => {
    return () => deleteEnhancedTemp(enhancedUriRef.current);
  }, []);

  // Enhancement only applies while an imaging tag is selected — switching to
  // a non-imaging tag reverts the preview and the save to the original.
  const enhancementActive = enhancedUri != null && isImagingTag(selectedTag);
  const displayEnhanced = enhancementActive && showEnhanced;

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
        galleryAssetIdRef.current = null;
        resetEnhancement();
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
        galleryAssetIdRef.current = asset.assetId ?? null;
        resetEnhancement();
      }
    } catch {
      Alert.alert("Error", "Failed to select image.");
    }
  };

  // Plaintext sources only — an opus-media: URI (edit mode, image unchanged)
  // is committed encrypted media; Retake/Replace is the path to new bytes.
  const canRotate = !isPersistedMediaUriValue(currentUri);

  const handleRotate = async () => {
    if (!canRotate) return;
    try {
      const context = ImageManipulator.manipulate(currentUri);
      context.rotate(90);
      const image = await context.renderAsync();
      const result = await image.saveAsync({
        format: SaveFormat.JPEG,
        compress: 0.9,
        base64: false,
      });
      setCurrentUri(result.uri);
      setCurrentMimeType("image/jpeg");
      resetEnhancement();
    } catch {
      Alert.alert("Error", "Failed to rotate image.");
    }
  };

  const handleConfirm = async () => {
    if (!currentUri || saving) return;
    setSaving(true);

    try {
      // Save whichever variant is being previewed; the enhanced variant only
      // counts while an imaging tag is still selected.
      const saveEnhanced = displayEnhanced && enhancedUri != null;
      const uriToSave = saveEnhanced ? enhancedUri : currentUri;
      const mimeToSave = saveEnhanced ? "image/jpeg" : currentMimeType;

      const savePlan = resolveOperativeMediaSavePlan({
        editMode,
        originalUri: imageUri,
        currentUri: uriToSave,
      });

      let finalUri = uriToSave;
      let finalMimeType = mimeToSave;
      let savedReplacementUri: string | undefined;
      if (!savePlan.reuseExistingUri) {
        const savedMedia = await saveEncryptedMediaFromUri(
          uriToSave,
          mimeToSave,
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
        // Metadata-only edit keeps the stored bytes' provenance; new bytes
        // carry the flag only when the enhanced variant was saved.
        enhanced: savePlan.reuseExistingUri ? existingEnhanced : saveEnhanced,
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
      if (galleryAssetIdRef.current) {
        void offerGalleryCleanup([galleryAssetIdRef.current]);
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
            {displayEnhanced && enhancedUri ? (
              <Image
                source={{ uri: enhancedUri }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            ) : isPersistedMediaUriValue(currentUri) ? (
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
            {enhancing ? (
              <View
                style={[
                  styles.enhancingOverlay,
                  { backgroundColor: theme.scrim },
                ]}
              >
                <ActivityIndicator size="small" color={theme.accent} />
                <ThemedText
                  style={[styles.enhancingText, { color: theme.text }]}
                >
                  Enhancing…
                </ThemedText>
              </View>
            ) : null}
          </View>

          {enhancementActive ? (
            <View style={styles.enhanceToggleRow}>
              <Pressable
                testID="media.add.chip-enhanced"
                onPress={() => setShowEnhanced(true)}
                accessibilityRole="radio"
                accessibilityState={{ selected: displayEnhanced }}
                style={[
                  styles.enhanceChip,
                  {
                    backgroundColor: displayEnhanced
                      ? theme.accentSurface
                      : theme.backgroundElevated,
                    borderColor: displayEnhanced ? theme.link : theme.border,
                  },
                ]}
              >
                <Feather
                  name="zap"
                  size={14}
                  color={displayEnhanced ? theme.link : theme.textSecondary}
                />
                <ThemedText
                  style={[
                    styles.enhanceChipText,
                    {
                      color: displayEnhanced ? theme.link : theme.textSecondary,
                      fontWeight: displayEnhanced ? "600" : "400",
                    },
                  ]}
                >
                  Enhanced
                </ThemedText>
              </Pressable>
              <Pressable
                testID="media.add.chip-original"
                onPress={() => setShowEnhanced(false)}
                accessibilityRole="radio"
                accessibilityState={{ selected: !displayEnhanced }}
                style={[
                  styles.enhanceChip,
                  {
                    backgroundColor: !displayEnhanced
                      ? theme.accentSurface
                      : theme.backgroundElevated,
                    borderColor: !displayEnhanced ? theme.link : theme.border,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.enhanceChipText,
                    {
                      color: !displayEnhanced
                        ? theme.link
                        : theme.textSecondary,
                      fontWeight: !displayEnhanced ? "600" : "400",
                    },
                  ]}
                >
                  Original
                </ThemedText>
              </Pressable>
            </View>
          ) : null}

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
            {canRotate ? (
              <Pressable
                testID="media.add.btn-rotate"
                onPress={handleRotate}
                style={[
                  styles.replaceButton,
                  { backgroundColor: theme.backgroundElevated },
                ]}
              >
                <Feather name="rotate-cw" size={16} color={theme.text} />
                <ThemedText style={styles.replaceText}>Rotate</ThemedText>
              </Pressable>
            ) : null}
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
            maximumDate={notFutureMax()}
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
  enhancingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  enhancingText: {
    fontSize: 13,
    fontWeight: "500",
  },
  enhanceToggleRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  enhanceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    minHeight: 44,
  },
  enhanceChipText: {
    fontSize: 13,
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
