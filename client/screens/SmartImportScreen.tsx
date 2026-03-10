import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Animated,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Feather } from "@/components/FeatherIcon";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { addMultipleToInbox } from "@/lib/inboxStorage";
import {
  getAlwaysDeleteAfterImport,
  setAlwaysDeleteAfterImport,
} from "@/lib/smartImportPrefs";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

type NavProp = NativeStackNavigationProp<RootStackParamList, "SmartImport">;

type ImportPhase =
  | "picking"
  | "encrypting"
  | "prompting"
  | "deleting"
  | "done";

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export default function SmartImportScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<NavProp>();

  const [phase, setPhase] = useState<ImportPhase>("picking");
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [importedCount, setImportedCount] = useState(0);
  const [assetIds, setAssetIds] = useState<string[]>([]);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pickerLaunched = useRef(false);

  // ── Launch picker on mount ─────────────────────────────

  useEffect(() => {
    if (pickerLaunched.current) return;
    pickerLaunched.current = true;

    (async () => {
      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 0.7,
          allowsMultipleSelection: true,
          selectionLimit: 50,
          orderedSelection: true,
        });

        if (result.canceled || result.assets.length === 0) {
          navigation.goBack();
          return;
        }

        // Collect valid assetIds for later deletion
        const ids = result.assets
          .map((a) => a.assetId)
          .filter((id): id is string => !!id);
        setAssetIds(ids);

        // Transition to encrypting
        setPhase("encrypting");
        setProgress({ completed: 0, total: result.assets.length });

        const assets = result.assets.map((a) => ({
          uri: a.uri,
          mimeType: a.mimeType,
        }));

        const imported = await addMultipleToInbox(
          assets,
          "smart_import",
          (completed, total) => {
            setProgress({ completed, total });
            Animated.timing(progressAnim, {
              toValue: completed / total,
              duration: 200,
              useNativeDriver: false,
            }).start();
          },
        );

        setImportedCount(imported.length);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Check auto-delete preference
        if (ids.length > 0) {
          const alwaysDelete = await getAlwaysDeleteAfterImport();
          if (alwaysDelete) {
            setPhase("deleting");
            await performDelete(ids);
            return;
          }
          setPhase("prompting");
        } else {
          // No valid assetIds — can't delete originals, go back
          navigation.goBack();
        }
      } catch (error) {
        console.warn("[SmartImport] Import failed:", error);
        Alert.alert(
          "Import Error",
          "Some photos could not be imported. Successfully imported photos are in your Inbox.",
          [{ text: "OK", onPress: () => navigation.goBack() }],
        );
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Delete originals ───────────────────────────────────

  const performDelete = useCallback(
    async (ids: string[]) => {
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission Required",
            "Opus needs photo library access to delete originals. Your photos are safely in the Inbox.",
            [{ text: "OK", onPress: () => navigation.goBack() }],
          );
          return;
        }

        const deleted = await MediaLibrary.deleteAssetsAsync(ids);
        if (deleted) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
        navigation.goBack();
      } catch (error) {
        console.warn("[SmartImport] Delete failed:", error);
        Alert.alert(
          "Could Not Delete",
          "Your photos are safely in the Opus Inbox. You can delete originals from Camera Roll manually.",
          [{ text: "OK", onPress: () => navigation.goBack() }],
        );
      }
    },
    [navigation],
  );

  // ── Button handlers ────────────────────────────────────

  const handleDelete = useCallback(() => {
    setPhase("deleting");
    performDelete(assetIds);
  }, [assetIds, performDelete]);

  const handleKeep = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleAlwaysDelete = useCallback(async () => {
    await setAlwaysDeleteAfterImport(true);
    setPhase("deleting");
    performDelete(assetIds);
  }, [assetIds, performDelete]);

  // ── Render ─────────────────────────────────────────────

  if (phase === "picking") {
    // Picker is open — show nothing (or minimal background)
    return <ThemedView style={styles.container} />;
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.center}>
        {phase === "encrypting" && (
          <>
            <Feather
              name="shield"
              size={48}
              color={theme.link}
              style={styles.icon}
            />
            <ThemedText style={[styles.title, { color: theme.text }]}>
              Encrypting photos...
            </ThemedText>
            <ThemedText
              style={[styles.subtitle, { color: theme.textSecondary }]}
            >
              Stripping metadata & encrypting
            </ThemedText>

            {/* Progress bar */}
            <View
              style={[
                styles.progressTrack,
                { backgroundColor: theme.backgroundElevated },
              ]}
            >
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: theme.link,
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0%", "100%"],
                    }),
                  },
                ]}
              />
            </View>
            <ThemedText
              style={[styles.progressText, { color: theme.textSecondary }]}
            >
              {progress.completed} of {progress.total}
            </ThemedText>
          </>
        )}

        {phase === "prompting" && (
          <>
            <Feather
              name="check-circle"
              size={48}
              color={theme.success}
              style={styles.icon}
            />
            <ThemedText style={[styles.title, { color: theme.text }]}>
              {importedCount} photo{importedCount !== 1 ? "s" : ""} imported
            </ThemedText>
            <ThemedText
              style={[styles.subtitle, { color: theme.textSecondary }]}
            >
              Delete originals from Camera Roll to protect patient privacy?
            </ThemedText>

            <Pressable
              onPress={handleDelete}
              style={[styles.primaryButton, { backgroundColor: theme.link }]}
            >
              <Feather name="trash-2" size={18} color={theme.buttonText} />
              <ThemedText
                style={[styles.primaryButtonText, { color: theme.buttonText }]}
              >
                Delete Originals
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={handleKeep}
              style={[
                styles.secondaryButton,
                { backgroundColor: theme.backgroundElevated },
              ]}
            >
              <ThemedText
                style={[styles.secondaryButtonText, { color: theme.text }]}
              >
                Keep Originals
              </ThemedText>
            </Pressable>

            <Pressable onPress={handleAlwaysDelete} style={styles.textLink}>
              <ThemedText
                style={[styles.textLinkLabel, { color: theme.textSecondary }]}
              >
                Always delete after import
              </ThemedText>
            </Pressable>
          </>
        )}

        {phase === "deleting" && (
          <>
            <ActivityIndicator
              size="large"
              color={theme.link}
              style={styles.icon}
            />
            <ThemedText style={[styles.title, { color: theme.text }]}>
              Removing from Camera Roll...
            </ThemedText>
          </>
        )}
      </View>
    </ThemedView>
  );
}

// ═══════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  icon: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },

  // Progress bar
  progressTrack: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: Spacing.sm,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: Spacing.lg,
  },

  // Buttons
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    width: "100%",
    paddingVertical: 14,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 14,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.lg,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  textLink: {
    paddingVertical: Spacing.sm,
  },
  textLinkLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
});
