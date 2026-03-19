import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  View,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Animated,
  InteractionManager,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import * as Haptics from "expo-haptics";
import { v4 as uuidv4 } from "uuid";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Feather } from "@/components/FeatherIcon";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import {
  addMultipleToInbox,
  setPendingInboxSelection,
} from "@/lib/inboxStorage";
import { buildCapturedOperativeMediaItem } from "@/lib/inboxCapture";
import {
  deleteMultipleEncryptedMedia,
  saveEncryptedMediaFromUri,
} from "@/lib/mediaStorage";
import {
  getAlwaysDeleteAfterImport,
  setAlwaysDeleteAfterImport,
} from "@/lib/smartImportPrefs";
import { useMediaCallback } from "@/contexts/MediaCallbackContext";
import { getCase, saveCase } from "@/lib/storage";
import type { OperativeMediaItem, Case } from "@/types/case";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavProp = NativeStackNavigationProp<RootStackParamList, "SmartImport">;
type Route = RouteProp<RootStackParamList, "SmartImport">;

type ImportPhase = "picking" | "encrypting" | "prompting" | "deleting";

async function resolveCapturedAt(
  assetId?: string | null,
): Promise<string | undefined> {
  if (!assetId) {
    return undefined;
  }

  try {
    const info = await MediaLibrary.getAssetInfoAsync(assetId);
    if (typeof info.creationTime === "number" && info.creationTime > 0) {
      return new Date(info.creationTime).toISOString();
    }
  } catch (error) {
    console.warn("[SmartImport] Could not resolve asset timestamp:", error);
  }

  return undefined;
}

export default function SmartImportScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<Route>();
  const { executeGenericCallback } = useMediaCallback();
  const params = useMemo(
    () => route.params ?? { targetMode: "inbox" as const },
    [route.params],
  );

  const [phase, setPhase] = useState<ImportPhase>("picking");
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [importedCount, setImportedCount] = useState(0);
  const [assetIds, setAssetIds] = useState<string[]>([]);
  const [canDeleteOriginals, setCanDeleteOriginals] = useState(false);
  const [deleteHelpText, setDeleteHelpText] = useState<string | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pickerLaunched = useRef(false);
  const importedInboxIdsRef = useRef<string[]>([]);
  const importedCaseMediaRef = useRef<OperativeMediaItem[]>([]);
  const importedCaseUrisRef = useRef<string[]>([]);

  const completeImport = useCallback(async () => {
    if (params.targetMode === "case") {
      const importedMedia = importedCaseMediaRef.current;

      if (params.targetCaseId) {
        const caseData = await getCase(params.targetCaseId);
        if (!caseData) {
          await deleteMultipleEncryptedMedia(importedCaseUrisRef.current);
          Alert.alert("Import Error", "The target case could not be loaded.");
          navigation.goBack();
          return;
        }

        const updatedCase: Case = {
          ...caseData,
          operativeMedia: [
            ...(caseData.operativeMedia ?? []),
            ...importedMedia,
          ],
          updatedAt: new Date().toISOString(),
        };
        await saveCase(updatedCase);
      } else if (params.callbackId) {
        const executed = executeGenericCallback(
          params.callbackId,
          importedMedia,
        );
        if (!executed) {
          await deleteMultipleEncryptedMedia(importedCaseUrisRef.current);
          Alert.alert(
            "Import Error",
            "The case form is no longer available. Imported photos were discarded.",
          );
          navigation.goBack();
          return;
        }
      }
    } else {
      setPendingInboxSelection(importedInboxIdsRef.current);
    }

    navigation.goBack();
  }, [executeGenericCallback, navigation, params]);

  const performDelete = useCallback(
    async (ids: string[]) => {
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission Required",
            "Opus needs photo library access to delete originals. Imported photos have been kept safely.",
            [{ text: "OK", onPress: () => void completeImport() }],
          );
          return;
        }

        await MediaLibrary.deleteAssetsAsync(ids);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await completeImport();
      } catch (error) {
        console.warn("[SmartImport] Delete failed:", error);
        Alert.alert(
          "Could Not Delete",
          "Imported photos were saved successfully. You can delete originals manually from Camera Roll.",
          [{ text: "OK", onPress: () => void completeImport() }],
        );
      }
    },
    [completeImport],
  );

  useEffect(() => {
    if (pickerLaunched.current) return;
    pickerLaunched.current = true;

    // Wait for fullScreenModal transition to complete before launching the
    // system image picker — firing immediately on mount can cause the picker
    // to be dismissed or fail silently on iOS.
    const task = InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        void (async () => {
          try {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ["images"],
              quality: 0.7,
              allowsMultipleSelection: true,
              selectionLimit: params.selectionLimit ?? 50,
              orderedSelection: true,
            });

            if (result.canceled || result.assets.length === 0) {
              navigation.goBack();
              return;
            }

            const ids = result.assets
              .map((asset) => asset.assetId)
              .filter((id): id is string => !!id);
            setAssetIds(ids);
            setCanDeleteOriginals(ids.length > 0);
            if (ids.length === 0) {
              setDeleteHelpText(
                "Some selected items do not expose library IDs, so Opus cannot delete the originals automatically.",
              );
            } else {
              setDeleteHelpText(null);
            }

            setPhase("encrypting");
            setProgress({ completed: 0, total: result.assets.length });

            if (params.targetMode === "inbox") {
              const inboxAssets = await Promise.all(
                result.assets.map(async (asset) => ({
                  uri: asset.uri,
                  mimeType: asset.mimeType,
                  assetId: asset.assetId,
                  capturedAt:
                    (await resolveCapturedAt(asset.assetId)) ?? undefined,
                  width: asset.width,
                  height: asset.height,
                })),
              );

              const imported = await addMultipleToInbox(
                inboxAssets,
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

              importedInboxIdsRef.current = imported.map((item) => item.id);
              setImportedCount(imported.length);
            } else {
              const importedMedia: OperativeMediaItem[] = [];

              for (let index = 0; index < result.assets.length; index += 1) {
                const asset = result.assets[index];
                if (!asset) continue;

                const capturedAt =
                  (await resolveCapturedAt(asset.assetId)) ??
                  new Date().toISOString();
                const saved = await saveEncryptedMediaFromUri(
                  asset.uri,
                  asset.mimeType || "image/jpeg",
                );
                importedCaseUrisRef.current.push(saved.localUri);
                importedMedia.push(
                  buildCapturedOperativeMediaItem({
                    id: uuidv4(),
                    localUri: saved.localUri,
                    mimeType: saved.mimeType,
                    capturedAt,
                    procedureDate: params.procedureDate,
                  }),
                );

                setProgress({
                  completed: index + 1,
                  total: result.assets.length,
                });
                Animated.timing(progressAnim, {
                  toValue: (index + 1) / result.assets.length,
                  duration: 200,
                  useNativeDriver: false,
                }).start();
              }

              importedCaseMediaRef.current = importedMedia;
              setImportedCount(importedMedia.length);
            }

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            if (ids.length > 0) {
              const alwaysDelete = await getAlwaysDeleteAfterImport();
              if (alwaysDelete) {
                setPhase("deleting");
                await performDelete(ids);
                return;
              }
            }

            setPhase("prompting");
          } catch (error) {
            console.warn("[SmartImport] Import failed:", error);
            Alert.alert(
              "Import Error",
              "Some photos could not be imported. Successfully imported photos were kept.",
              [{ text: "OK", onPress: () => navigation.goBack() }],
            );
          }
        })();
      }, 100);
    });

    return () => task.cancel();
  }, [completeImport, navigation, params, performDelete, progressAnim]);

  const handleDelete = useCallback(() => {
    setPhase("deleting");
    void performDelete(assetIds);
  }, [assetIds, performDelete]);

  const handleKeep = useCallback(() => {
    void completeImport();
  }, [completeImport]);

  const handleAlwaysDelete = useCallback(async () => {
    await setAlwaysDeleteAfterImport(true);
    setPhase("deleting");
    void performDelete(assetIds);
  }, [assetIds, performDelete]);

  if (phase === "picking") {
    return <ThemedView style={styles.container} />;
  }

  return (
    <ThemedView testID="screen-smartImport" style={styles.container}>
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
              Stripping metadata and preparing secure attachments
            </ThemedText>

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
              {canDeleteOriginals
                ? "Delete originals from Camera Roll to protect patient privacy?"
                : "Imported photos are ready. Original photos remain in Camera Roll."}
            </ThemedText>

            {deleteHelpText ? (
              <ThemedText
                style={[styles.helpText, { color: theme.textTertiary }]}
              >
                {deleteHelpText}
              </ThemedText>
            ) : null}

            {canDeleteOriginals ? (
              <>
                <Pressable
                  onPress={handleDelete}
                  style={[
                    styles.primaryButton,
                    { backgroundColor: theme.link },
                  ]}
                >
                  <Feather name="trash-2" size={18} color={theme.buttonText} />
                  <ThemedText
                    style={[
                      styles.primaryButtonText,
                      { color: theme.buttonText },
                    ]}
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
                    style={[
                      styles.textLinkLabel,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Always delete after import
                  </ThemedText>
                </Pressable>
              </>
            ) : (
              <Pressable
                onPress={handleKeep}
                style={[styles.primaryButton, { backgroundColor: theme.link }]}
              >
                <ThemedText
                  style={[
                    styles.primaryButtonText,
                    { color: theme.buttonText },
                  ]}
                >
                  Continue
                </ThemedText>
              </Pressable>
            )}
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
  helpText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    marginTop: -Spacing.md,
    marginBottom: Spacing.lg,
  },
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
