import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Typography } from "@/constants/theme";
import {
  ALL_PROTOCOLS,
  filterStepsByPhase,
  type CaptureProtocol,
  type CaptureStep,
} from "@/data/mediaCaptureProtocols";
import { addToInbox, type InboxItemMetadata } from "@/lib/inboxStorage";
import { setPendingInboxSelection } from "@/lib/inboxStorage";
import { buildCapturedOperativeMediaItem } from "@/lib/inboxCapture";
import {
  deleteMultipleEncryptedMedia,
  saveEncryptedMediaFromUri,
} from "@/lib/mediaStorage";
import { useMediaCallback } from "@/contexts/MediaCallbackContext";
import { getCase, saveCase } from "@/lib/storage";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { v4 as uuidv4 } from "uuid";

import type { NativeStackScreenProps } from "@react-navigation/native-stack";

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

type Props = NativeStackScreenProps<RootStackParamList, "OpusCamera">;

type PhaseMode = "preop" | "full";

interface CapturedStep {
  stepIndex: number;
  itemId: string;
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

export default function OpusCameraScreen({ navigation, route }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const params = route.params;
  const { executeGenericCallback } = useMediaCallback();
  const targetMode = params?.targetMode ?? "inbox";

  // Camera
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [flash, setFlash] = useState<"off" | "on">("off");
  const [capturing, setCapturing] = useState(false);

  // Template picker state
  const [phaseMode, setPhaseMode] = useState<PhaseMode>("preop");
  const [patientId, setPatientId] = useState(params?.patientIdentifier ?? "");

  // Viewfinder state
  const [selectedProtocol, setSelectedProtocol] = useState<CaptureProtocol | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [capturedSteps, setCapturedSteps] = useState<CapturedStep[]>([]);
  const [captureCount, setCaptureCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [captureErrors, setCaptureErrors] = useState(0);

  // Quick snap vs guided
  const isQuickSnap = params?.quickSnap === true && !selectedProtocol;
  const showViewfinder = isQuickSnap || selectedProtocol !== null;

  // Processing queue
  const queueRef = useRef<
    Array<{ uri: string; capturedAt: string; stepIndex?: number }>
  >([]);
  const processingPromiseRef = useRef<Promise<void> | null>(null);
  const capturedInboxIdsRef = useRef<string[]>([]);
  const capturedCaseMediaRef = useRef<
    import("@/types/case").OperativeMediaItem[]
  >([]);

  // Auto-select template if templateId param is provided
  useEffect(() => {
    if (params?.templateId) {
      const match = ALL_PROTOCOLS.find((p) => p.id === params.templateId);
      if (match) setSelectedProtocol(match);
    }
  }, [params?.templateId]);

  // Steps filtered by phase mode
  const filteredSteps = useMemo(() => {
    if (!selectedProtocol) return [];
    return filterStepsByPhase(selectedProtocol.steps, phaseMode);
  }, [selectedProtocol, phaseMode]);

  const currentStep: CaptureStep | undefined = filteredSteps[currentStepIndex];

  // ─── Permission handling ────────────────────────────────────

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // ─── Encryption queue ───────────────────────────────────────

  const processQueue = useCallback(() => {
    if (processingPromiseRef.current) {
      return processingPromiseRef.current;
    }

    processingPromiseRef.current = (async () => {
      while (queueRef.current.length > 0) {
        const job = queueRef.current.shift();
        if (!job) break;

        try {
          const metadata: InboxItemMetadata = {
            capturedAt: job.capturedAt,
          };

          if (patientId.trim()) {
            metadata.patientIdentifier = patientId.trim();
          }

          if (selectedProtocol) {
            metadata.templateId = selectedProtocol.id;
            if (job.stepIndex !== undefined) {
              const filteredStep = filteredSteps[job.stepIndex];
              if (filteredStep) {
                const originalIndex = selectedProtocol.steps.indexOf(filteredStep);
                metadata.templateStepIndex =
                  originalIndex >= 0 ? originalIndex : job.stepIndex;
              }
            }
          }

          if (targetMode === "case") {
            const saved = await saveEncryptedMediaFromUri(job.uri, "image/jpeg");
            const mediaItem = buildCapturedOperativeMediaItem({
              id: uuidv4(),
              localUri: saved.localUri,
              mimeType: saved.mimeType,
              capturedAt: job.capturedAt,
              procedureDate: params?.procedureDate,
              templateId: metadata.templateId,
              templateStepIndex: metadata.templateStepIndex,
            });
            capturedCaseMediaRef.current.push(mediaItem);

            if (job.stepIndex !== undefined) {
              setCapturedSteps((prev) => [
                ...prev,
                { stepIndex: job.stepIndex!, itemId: mediaItem.id },
              ]);
            }
          } else {
            const inboxItem = await addToInbox(
              job.uri,
              "image/jpeg",
              "opus_camera",
              metadata,
            );
            capturedInboxIdsRef.current.push(inboxItem.id);

            if (job.stepIndex !== undefined) {
              setCapturedSteps((prev) => [
                ...prev,
                { stepIndex: job.stepIndex!, itemId: inboxItem.id },
              ]);
            }
          }
        } catch (error) {
          setCaptureErrors((prev) => prev + 1);
          console.warn("OpusCamera: failed to persist photo:", error);
        }
      }
    })()
      .finally(() => {
        processingPromiseRef.current = null;
        setIsProcessing(false);
      });

    return processingPromiseRef.current;
  }, [
    filteredSteps,
    params?.procedureDate,
    patientId,
    selectedProtocol,
    targetMode,
  ]);

  // ─── Capture handler ────────────────────────────────────────

  const handleCapture = useCallback(async () => {
    if (capturing || !cameraRef.current) return;
    setCapturing(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.92,
        skipProcessing: false,
      });

      if (photo?.uri) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCaptureCount((prev) => prev + 1);
        const capturedAt = new Date().toISOString();

        // Queue for background encryption
        queueRef.current.push({
          uri: photo.uri,
          capturedAt,
          stepIndex: selectedProtocol ? currentStepIndex : undefined,
        });
        setIsProcessing(true);
        void processQueue();

        // Auto-advance to next uncaptured step in guided mode
        if (selectedProtocol && filteredSteps.length > 0) {
          const capturedIndices = new Set(capturedSteps.map((cs) => cs.stepIndex));
          capturedIndices.add(currentStepIndex);

          // Find next uncaptured step after current
          let nextIndex = -1;
          for (let i = currentStepIndex + 1; i < filteredSteps.length; i++) {
            if (!capturedIndices.has(i)) {
              nextIndex = i;
              break;
            }
          }
          // Wrap around to find any uncaptured step before current
          if (nextIndex === -1) {
            for (let i = 0; i < currentStepIndex; i++) {
              if (!capturedIndices.has(i)) {
                nextIndex = i;
                break;
              }
            }
          }
          if (nextIndex >= 0) {
            setCurrentStepIndex(nextIndex);
          }
        }
      }
    } catch (e) {
      console.warn("OpusCamera: capture failed:", e);
      Alert.alert("Capture failed", "The photo could not be captured.");
    } finally {
      setCapturing(false);
    }
  }, [
    capturing,
    currentStepIndex,
    selectedProtocol,
    filteredSteps,
    capturedSteps,
    processQueue,
  ]);

  // ─── Done handler ───────────────────────────────────────────

  const handleDone = useCallback(() => {
    const finish = async () => {
      if (isFinishing) return;
      setIsFinishing(true);
      setIsProcessing(true);

      try {
        await processQueue();

        if (targetMode === "case") {
          if (params?.targetCaseId) {
            const caseData = await getCase(params.targetCaseId);
            if (!caseData) {
              await deleteMultipleEncryptedMedia(
                capturedCaseMediaRef.current.map((item) => item.localUri),
              );
              Alert.alert("Save failed", "The target case could not be loaded.");
              return;
            }

            await saveCase({
              ...caseData,
              operativeMedia: [
                ...(caseData.operativeMedia ?? []),
                ...capturedCaseMediaRef.current,
              ],
              updatedAt: new Date().toISOString(),
            });
          } else if (params?.callbackId) {
            const executed = executeGenericCallback(
              params.callbackId,
              capturedCaseMediaRef.current,
            );
            if (!executed) {
              await deleteMultipleEncryptedMedia(
                capturedCaseMediaRef.current.map((item) => item.localUri),
              );
              Alert.alert(
                "Save failed",
                "The case form is no longer available. Captured photos were discarded.",
              );
              return;
            }
          }
        } else {
          setPendingInboxSelection(capturedInboxIdsRef.current);
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        if (captureErrors > 0) {
          Alert.alert(
            "Capture completed with errors",
            `${captureErrors} photo${captureErrors === 1 ? "" : "s"} could not be saved.`,
          );
        }

        if (params?.returnTo?.screen === "CaseDetail") {
          navigation.replace("CaseDetail", params.returnTo.params);
        } else if (params?.returnTo?.screen === "Inbox") {
          navigation.replace("Inbox", params.returnTo.params);
        } else {
          navigation.goBack();
        }
      } catch (error) {
        console.warn("OpusCamera: completion failed:", error);
        Alert.alert("Save failed", "Captured photos could not be finalized.");
      } finally {
        setIsFinishing(false);
        setIsProcessing(false);
      }
    };

    void finish();
  }, [
    captureErrors,
    executeGenericCallback,
    isFinishing,
    navigation,
    params,
    processQueue,
    targetMode,
  ]);

  // ─── Step dot check ─────────────────────────────────────────

  const isStepCaptured = useCallback(
    (idx: number) => capturedSteps.some((cs) => cs.stepIndex === idx),
    [capturedSteps],
  );

  // ═══════════════════════════════════════════════════════════
  // Permission screen
  // ═══════════════════════════════════════════════════════════

  if (!permission) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator color={theme.link} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}>
        <Feather name="camera-off" size={48} color={theme.textSecondary} />
        <Text style={[styles.permissionTitle, { color: theme.text }]}>
          Camera Access Required
        </Text>
        <Text style={[styles.permissionBody, { color: theme.textSecondary }]}>
          Opus Camera captures photos directly to encrypted storage, bypassing your Camera Roll.
        </Text>
        {permission.canAskAgain ? (
          <Pressable
            onPress={requestPermission}
            style={[styles.permissionButton, { backgroundColor: theme.link }]}
          >
            <Text style={[styles.permissionButtonText, { color: theme.buttonText }]}>
              Grant Camera Access
            </Text>
          </Pressable>
        ) : (
          <Text style={[styles.permissionBody, { color: theme.textSecondary }]}>
            Please enable camera access in Settings.
          </Text>
        )}
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // Template Picker
  // ═══════════════════════════════════════════════════════════

  if (!showViewfinder) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <ScrollView
          style={styles.pickerScroll}
          contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
        >
          {/* Phase toggle */}
          <View style={styles.phaseToggleRow}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Mode</Text>
            <View style={[styles.segmentedControl, { backgroundColor: theme.backgroundDefault }]}>
              {(["preop", "full"] as const).map((mode) => (
                <Pressable
                  key={mode}
                  onPress={() => setPhaseMode(mode)}
                  style={[
                    styles.segmentButton,
                    phaseMode === mode && { backgroundColor: theme.link },
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      {
                        color: phaseMode === mode ? theme.buttonText : theme.textSecondary,
                        fontWeight: phaseMode === mode ? "600" : "400",
                      },
                    ]}
                  >
                    {mode === "preop" ? "Pre-op" : "Full"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Patient ID */}
          <View style={styles.inputRow}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
              Patient ID (optional)
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.backgroundDefault,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="NHI or identifier"
              placeholderTextColor={theme.textTertiary}
              value={patientId}
              onChangeText={setPatientId}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>

          {/* Protocol list */}
          <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginTop: Spacing.xl }]}>
            Select a template
          </Text>

          {ALL_PROTOCOLS.map((protocol) => {
            const steps = filterStepsByPhase(protocol.steps, phaseMode);
            return (
              <Pressable
                key={protocol.id}
                onPress={() => {
                  setSelectedProtocol(protocol);
                  setCurrentStepIndex(0);
                  setCapturedSteps([]);
                  setCaptureCount(0);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[
                  styles.protocolCard,
                  {
                    backgroundColor: theme.backgroundElevated,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={styles.protocolCardContent}>
                  <Feather name="camera" size={20} color={theme.link} />
                  <View style={styles.protocolCardText}>
                    <Text style={[styles.protocolLabel, { color: theme.text }]}>
                      {protocol.label}
                    </Text>
                    <Text style={[styles.protocolDescription, { color: theme.textSecondary }]}>
                      {steps.length} {steps.length === 1 ? "view" : "views"}
                      {phaseMode === "preop" && steps.length < protocol.steps.length
                        ? ` (${protocol.steps.length} in full mode)`
                        : ""}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={theme.textTertiary} />
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // Guided Viewfinder (or Quick Snap)
  // ═══════════════════════════════════════════════════════════

  const capturedCount = selectedProtocol
    ? capturedSteps.length
    : captureCount;
  const totalSteps = selectedProtocol ? filteredSteps.length : undefined;

  return (
    <View style={styles.viewfinderContainer}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        flash={flash}
      />

      {/* Top overlay */}
      <View style={[styles.topOverlay, { paddingTop: insets.top + Spacing.sm }]}>
        {/* Protocol info */}
        {selectedProtocol && currentStep ? (
          <View style={styles.stepInfoRow}>
            <Text style={styles.stepLabel}>
              {currentStep.label}
            </Text>
            <Text style={styles.stepCounter}>
              Step {currentStepIndex + 1}/{totalSteps}
            </Text>
          </View>
        ) : (
          <View style={styles.stepInfoRow}>
            <Text style={styles.stepLabel}>Quick Snap</Text>
            <Text style={styles.stepCounter}>
              {captureCount} {captureCount === 1 ? "photo" : "photos"}
            </Text>
          </View>
        )}

        {/* Capture hint */}
        {currentStep?.captureHint && (
          <Text style={styles.captureHint}>
            {currentStep.captureHint}
          </Text>
        )}
      </View>

      {/* Step dots (guided mode only) */}
      {selectedProtocol && filteredSteps.length > 0 && (
        <View style={[styles.dotsContainer, { bottom: 200 + insets.bottom }]}>
          <FlatList
            horizontal
            data={filteredSteps}
            keyExtractor={(_, i) => String(i)}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dotsContent}
            renderItem={({ index }) => {
              const captured = isStepCaptured(index);
              const isCurrent = index === currentStepIndex;
              return (
                <Pressable
                  onPress={() => setCurrentStepIndex(index)}
                  style={[
                    styles.dot,
                    captured
                      ? styles.dotCaptured
                      : isCurrent
                        ? [styles.dotCurrent, { borderColor: theme.link }]
                        : styles.dotEmpty,
                  ]}
                >
                  {captured && (
                    <Feather name="check" size={10} color="#fff" />
                  )}
                </Pressable>
              );
            }}
          />
        </View>
      )}

      {/* Bottom controls */}
      <View style={[styles.bottomOverlay, { paddingBottom: insets.bottom + Spacing.lg }]}>
        {/* Processing indicator */}
        {isProcessing && (
          <View style={styles.processingRow}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.processingText}>
              {isFinishing ? "Finishing captures..." : "Encrypting..."}
            </Text>
          </View>
        )}

        <View style={styles.controlsRow}>
          {/* Done button */}
          <Pressable
            onPress={handleDone}
            disabled={isFinishing}
            style={[styles.doneButton, isFinishing && { opacity: 0.5 }]}
          >
            <Text style={styles.doneText}>Done</Text>
          </Pressable>

          {/* Shutter */}
          <Pressable
            onPress={handleCapture}
            disabled={capturing || isFinishing}
            style={[
              styles.shutterOuter,
              (capturing || isFinishing) && { opacity: 0.5 },
            ]}
          >
            <View style={styles.shutterInner} />
          </Pressable>

          {/* Right controls: flash + flip */}
          <View style={styles.rightControls}>
            <Pressable
              onPress={() => setFlash((f) => (f === "off" ? "on" : "off"))}
              disabled={isFinishing}
              style={styles.iconButton}
            >
              <Feather
                name={flash === "on" ? "zap" : "zap-off"}
                size={22}
                color="#fff"
              />
            </Pressable>
            <Pressable
              onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))}
              disabled={isFinishing}
              style={styles.iconButton}
            >
              <Feather name="refresh-cw" size={22} color="#fff" />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing["2xl"],
    gap: Spacing.lg,
  },

  // Permission
  permissionTitle: {
    ...Typography.h2,
    textAlign: "center",
  },
  permissionBody: {
    ...Typography.body,
    textAlign: "center",
    maxWidth: 300,
  },
  permissionButton: {
    paddingHorizontal: Spacing["2xl"],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.md,
  },
  permissionButtonText: {
    ...Typography.body,
    fontWeight: "600",
  },

  // Template picker
  pickerScroll: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  sectionLabel: {
    ...Typography.small,
    fontWeight: "500",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  phaseToggleRow: {
    marginBottom: Spacing.xl,
  },
  segmentedControl: {
    flexDirection: "row",
    borderRadius: BorderRadius.sm,
    padding: 3,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
  },
  segmentText: {
    ...Typography.small,
  },
  inputRow: {
    marginBottom: Spacing.md,
  },
  textInput: {
    ...Typography.body,
    height: Spacing.inputHeight,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
  },
  protocolCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  protocolCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  protocolCardText: {
    flex: 1,
  },
  protocolLabel: {
    ...Typography.body,
    fontWeight: "600",
  },
  protocolDescription: {
    ...Typography.small,
    marginTop: 2,
  },

  // Viewfinder
  viewfinderContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 10,
  },
  stepInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stepLabel: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
    flex: 1,
  },
  stepCounter: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    fontWeight: "500",
  },
  captureHint: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    marginTop: Spacing.xs,
    fontStyle: "italic",
  },

  // Step dots
  dotsContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  dotsContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  dotCaptured: {
    backgroundColor: "#2EA043",
  },
  dotCurrent: {
    backgroundColor: "transparent",
    borderWidth: 2.5,
  },
  dotEmpty: {
    backgroundColor: "rgba(255,255,255,0.3)",
  },

  // Bottom
  bottomOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: Spacing.lg,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 10,
  },
  processingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  processingText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing["2xl"],
  },

  // Done button
  doneButton: {
    width: 64,
    paddingVertical: Spacing.sm,
    alignItems: "center",
  },
  doneText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  // Shutter
  shutterOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#fff",
  },

  // Right controls
  rightControls: {
    width: 64,
    alignItems: "center",
    gap: Spacing.md,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
});
