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
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { v4 as uuidv4 } from "uuid";
import {
  saveEncryptedMedia,
  consumePendingBase64,
  setPendingBase64,
  isEncryptedMediaUri,
} from "@/lib/mediaStorage";
import { EncryptedImage } from "@/components/EncryptedImage";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { OperativeMediaType, OPERATIVE_MEDIA_TYPE_LABELS } from "@/types/case";
import { DatePickerField } from "@/components/FormField";
import { useMediaCallback } from "@/contexts/MediaCallbackContext";

type AddOperativeMediaRouteProp = RouteProp<
  RootStackParamList,
  "AddOperativeMedia"
>;
type AddOperativeMediaNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "AddOperativeMedia"
>;

const MEDIA_TYPE_OPTIONS: {
  value: OperativeMediaType;
  label: string;
  icon: keyof typeof Feather.glyphMap;
}[] = [
  { value: "preoperative_photo", label: "Preop Photo", icon: "image" },
  { value: "intraoperative_photo", label: "Intraop Photo", icon: "camera" },
  { value: "xray", label: "X-ray", icon: "file" },
  { value: "ct_scan", label: "CT Scan", icon: "layers" },
  { value: "mri", label: "MRI", icon: "activity" },
  { value: "diagram", label: "Diagram", icon: "edit-3" },
  { value: "document", label: "Document", icon: "file-text" },
  { value: "other", label: "Other", icon: "paperclip" },
];

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
    existingMediaType,
    existingCaption,
    existingTimestamp,
  } = route.params;

  const [selectedType, setSelectedType] = useState<OperativeMediaType>(
    (existingMediaType as OperativeMediaType) || "intraoperative_photo",
  );
  const [captionInput, setCaptionInput] = useState(existingCaption || "");
  const [mediaDate, setMediaDate] = useState(
    existingTimestamp
      ? existingTimestamp.split("T")[0]
      : new Date().toISOString().split("T")[0],
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
        setCurrentUri(asset.uri);
        setCurrentMimeType(mime);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to capture image.");
    }
  };

  const handleReplaceGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.7,
        base64: true,
      });
      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        if (!asset) return;
        const mime = asset.mimeType || "image/jpeg";
        if (asset.base64) {
          setPendingBase64(asset.base64, mime);
        }
        setCurrentUri(asset.uri);
        setCurrentMimeType(mime);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to select image.");
    }
  };

  const handleConfirm = async () => {
    if (!currentUri || saving) return;
    setSaving(true);

    try {
      let finalUri = currentUri;
      const pending = consumePendingBase64();
      if (pending) {
        finalUri = await saveEncryptedMedia(
          pending.base64,
          pending.mimeType,
          currentUri,
        );
      } else if (editMode && isEncryptedMediaUri(currentUri)) {
        finalUri = currentUri;
      }

      // Build timestamp from selected date
      const today = new Date().toISOString().split("T")[0];
      const timestamp =
        mediaDate === today
          ? new Date().toISOString()
          : new Date(mediaDate + "T12:00:00").toISOString();

      const mediaData = {
        id: editMode && existingMediaId ? existingMediaId : uuidv4(),
        localUri: finalUri,
        mimeType: currentMimeType,
        mediaType: selectedType,
        caption: captionInput.trim() || undefined,
        timestamp,
        createdAt: editMode ? (existingTimestamp || new Date().toISOString()) : new Date().toISOString(),
      };

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (callbackId) {
        executeGenericCallback(callbackId, mediaData);
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
    <ThemedView style={styles.container}>
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
          <View style={styles.previewContainer}>
            {isEncryptedMediaUri(currentUri) ? (
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

          <ThemedText
            style={[styles.sectionLabel, { color: theme.textSecondary }]}
          >
            Media Type
          </ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.typeChipsContainer}
          >
            {MEDIA_TYPE_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedType(option.value);
                }}
                style={[
                  styles.typeChip,
                  {
                    backgroundColor:
                      selectedType === option.value
                        ? theme.link
                        : theme.backgroundRoot,
                    borderColor:
                      selectedType === option.value ? theme.link : theme.border,
                  },
                ]}
              >
                <Feather
                  name={option.icon}
                  size={14}
                  color={selectedType === option.value ? "#fff" : theme.text}
                />
                <ThemedText
                  style={[
                    styles.typeChipText,
                    {
                      color:
                        selectedType === option.value ? "#fff" : theme.text,
                    },
                  ]}
                >
                  {option.label}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>

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
            testID="input-media-caption"
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
            testID="button-confirm-media"
            onPress={handleConfirm}
            disabled={saving}
            style={[
              styles.confirmButton,
              { backgroundColor: saving ? theme.textTertiary : theme.link },
            ]}
          >
            <Feather name="check" size={20} color="#fff" />
            <ThemedText style={styles.confirmButtonText}>
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
    backgroundColor: "#000",
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
  typeChipsContainer: {
    gap: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: "500",
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
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
