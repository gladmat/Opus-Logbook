import React, { useState, useMemo, useEffect, useLayoutEffect } from "react";
import { View, StyleSheet, Alert, Pressable } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@/components/FeatherIcon";
import * as Haptics from "expo-haptics";
import { v4 as uuidv4 } from "uuid";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import {
  TimelineEvent,
  TimelineEventType,
  TIMELINE_EVENT_TYPE_LABELS,
  FollowUpInterval,
  FOLLOW_UP_INTERVAL_LABELS,
  MediaAttachment,
  PROMData,
  ComplicationEntry,
  ClavienDindoGrade,
  CLAVIEN_DINDO_LABELS,
} from "@/types/case";
import {
  FormField,
  SelectField,
  DatePickerField,
} from "@/components/FormField";
import { SectionHeader } from "@/components/SectionHeader";
import { Button } from "@/components/Button";
import { MediaCapture } from "@/components/MediaCapture";
import { PROMEntryForm } from "@/components/PROMEntryForm";
import { WoundAssessment } from "@/types/wound";
import { WoundAssessmentForm } from "@/components/WoundAssessmentForm";
import type { NerveOutcomeAssessment } from "@/types/peripheralNerve";
import { NerveOutcomeForm } from "@/components/peripheral-nerve/NerveOutcomeForm";
import {
  saveTimelineEvent,
  getTimelineEvents,
  updateTimelineEvent,
} from "@/lib/storage";
import {
  normalizeDateOnlyValue,
  toIsoDateValue,
  toUtcNoonIsoTimestamp,
} from "@/lib/dateValues";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type RouteParams = RouteProp<RootStackParamList, "AddTimelineEvent">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const EVENT_TYPES: { value: TimelineEventType; label: string }[] =
  Object.entries(TIMELINE_EVENT_TYPE_LABELS)
    .filter(([value]) => value !== "discharge_photo")
    .map(([value, label]) => ({
      value: value as TimelineEventType,
      label,
    }));

const FOLLOW_UP_INTERVALS: { value: FollowUpInterval; label: string }[] =
  Object.entries(FOLLOW_UP_INTERVAL_LABELS).map(([value, label]) => ({
    value: value as FollowUpInterval,
    label,
  }));

const CLAVIEN_DINDO_OPTIONS: { value: ClavienDindoGrade; label: string }[] =
  Object.entries(CLAVIEN_DINDO_LABELS).map(([value, label]) => ({
    value: value as ClavienDindoGrade,
    label,
  }));

export default function AddTimelineEventScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParams>();
  const insets = useSafeAreaInsets();

  const {
    caseId,
    initialEventType,
    caseDischargeDate,
    editEventId,
    mediaContext,
    hasPeripheralNerveAssessment,
    nerveInjured,
    procedureDate,
  } = route.params;

  const isEditMode = !!editEventId;

  const [saving, setSaving] = useState(false);
  const [eventType, setEventType] = useState<TimelineEventType | "">(
    initialEventType || "",
  );
  const [eventDate, setEventDate] = useState(() => toIsoDateValue(new Date()));
  const [note, setNote] = useState("");
  const [followUpInterval, setFollowUpInterval] = useState<
    FollowUpInterval | ""
  >("");
  const [mediaAttachments, setMediaAttachments] = useState<MediaAttachment[]>(
    [],
  );
  const [promData, setPromData] = useState<PROMData>({
    questionnaire: "dash",
  });
  const [complicationDescription, setComplicationDescription] = useState("");
  const [complicationGrade, setComplicationGrade] =
    useState<ClavienDindoGrade>("none");
  const [complicationManagement, setComplicationManagement] = useState("");
  const [woundAssessmentData, setWoundAssessmentData] =
    useState<WoundAssessment>({
      dressings: [],
    });
  const [dischargeWoundStatus, setDischargeWoundStatus] = useState<
    "dry_healing" | "moist" | "redness" | "breakdown" | ""
  >("");
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);

  // Nerve outcome state — shown for follow_up_visit when case has peripheral nerve assessment
  const [nerveOutcome, setNerveOutcome] = useState<NerveOutcomeAssessment>(
    () => {
      const monthsSince =
        procedureDate && eventDate
          ? Math.round(
              (new Date(eventDate).getTime() -
                new Date(procedureDate).getTime()) /
                (1000 * 60 * 60 * 24 * 30.44),
            )
          : 0;
      return {
        assessmentDate: eventDate,
        monthsSinceSurgery: Math.max(0, monthsSince),
      };
    },
  );

  // Set dynamic header title
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: isEditMode ? "Edit Event" : "Add Event",
    });
  }, [navigation, isEditMode]);

  // Load existing event data when editing
  useEffect(() => {
    if (!editEventId) return;
    (async () => {
      try {
        const events = await getTimelineEvents(caseId);
        const existing = events.find((e) => e.id === editEventId);
        if (!existing) return;
        setEditingEvent(existing);
        setEventType(existing.eventType);
        setEventDate(
          normalizeDateOnlyValue(existing.createdAt) ??
            toIsoDateValue(new Date()),
        );
        setNote(existing.note || "");
        if (existing.followUpInterval)
          setFollowUpInterval(existing.followUpInterval);
        if (existing.mediaAttachments)
          setMediaAttachments(existing.mediaAttachments);
        if (existing.promData) setPromData(existing.promData);
        if (existing.complicationData) {
          setComplicationDescription(
            existing.complicationData.description || "",
          );
          setComplicationGrade(
            existing.complicationData.clavienDindoGrade || "none",
          );
          setComplicationManagement(
            existing.complicationData.managementNotes || "",
          );
        }
        if (existing.woundAssessmentData)
          setWoundAssessmentData(existing.woundAssessmentData);
        if (existing.nerveOutcome) setNerveOutcome(existing.nerveOutcome);
      } catch (error) {
        console.error("Error loading event for editing:", error);
      }
    })();
  }, [editEventId, caseId]);

  const isDischargeDay = useMemo(() => {
    if (!caseDischargeDate) return false;
    return toIsoDateValue(new Date()) === caseDischargeDate;
  }, [caseDischargeDate]);

  const getSubtitle = () => {
    switch (eventType) {
      case "photo":
        return "Add follow-up photos to document progress";
      case "imaging":
        return "Add X-rays or other imaging results";
      case "prom":
        return "Record patient-reported outcome measure";
      case "complication":
        return "Document a complication";
      case "follow_up_visit":
        return "Record a follow-up visit";
      case "wound_assessment":
        return "Document wound status, dressings applied, and healing progress";
      default:
        return "Record a post-operative event";
    }
  };

  const validateForm = (): boolean => {
    if (!eventType) {
      Alert.alert("Required Field", "Please select an event type");
      return false;
    }

    if (eventType === "photo" || eventType === "imaging") {
      if (mediaAttachments.length === 0) {
        Alert.alert(
          "Required Field",
          eventType === "photo"
            ? "Please add at least one photo"
            : "Please add at least one image",
        );
        return false;
      }
    }

    if (eventType === "discharge_photo") {
      if (mediaAttachments.length === 0) {
        Alert.alert("Required Field", "Please add at least one photo");
        return false;
      }
    }

    if (eventType === "prom") {
      if (!promData.score && promData.score !== 0) {
        Alert.alert("Required Field", "Please enter a PROM score");
        return false;
      }
    }

    if (eventType === "complication") {
      if (!complicationDescription.trim()) {
        Alert.alert("Required Field", "Please describe the complication");
        return false;
      }
    }

    if (eventType === "follow_up_visit") {
      if (!followUpInterval) {
        Alert.alert("Required Field", "Please select a follow-up interval");
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const WOUND_STATUS_LABELS: Record<string, string> = {
        dry_healing: "Dry & healing",
        moist: "Moist / exudate",
        redness: "Redness / concern",
        breakdown: "Wound breakdown",
      };

      const dischargeNote =
        eventType === "discharge_photo" && dischargeWoundStatus
          ? `Wound status: ${WOUND_STATUS_LABELS[dischargeWoundStatus]}${note.trim() ? " — " + note.trim() : ""}`
          : note.trim();

      // Build the updates object (shared by create and update paths)
      const updates: Partial<TimelineEvent> = {
        eventType: eventType as TimelineEventType,
        note: dischargeNote,
      };

      if (
        eventType === "photo" ||
        eventType === "imaging" ||
        eventType === "discharge_photo"
      ) {
        updates.mediaAttachments = mediaAttachments;
      }

      if (eventType === "prom") {
        updates.promData = promData;
      }

      if (eventType === "complication") {
        const complication: ComplicationEntry = {
          id: editingEvent?.complicationData?.id || uuidv4(),
          description: complicationDescription.trim(),
          clavienDindoGrade: complicationGrade,
          dateIdentified:
            editingEvent?.complicationData?.dateIdentified ||
            new Date().toISOString(),
          managementNotes: complicationManagement.trim() || undefined,
          resolved: editingEvent?.complicationData?.resolved ?? false,
        };
        updates.complicationData = complication;
      }

      if (eventType === "follow_up_visit" && followUpInterval) {
        updates.followUpInterval = followUpInterval;
        if (hasPeripheralNerveAssessment) {
          updates.nerveOutcome = nerveOutcome;
        }
      }

      if (eventType === "wound_assessment") {
        updates.woundAssessmentData = woundAssessmentData;
      }

      if (isEditMode && editEventId) {
        // Preserve original time if date unchanged, otherwise use selected date
        const existingDate = normalizeDateOnlyValue(editingEvent?.createdAt);
        if (existingDate !== eventDate) {
          updates.createdAt =
            toUtcNoonIsoTimestamp(eventDate) ?? new Date().toISOString();
        }
        await updateTimelineEvent(editEventId, updates);
      } else {
        // Build timestamp: use current time if today, otherwise noon on selected date
        const today = toIsoDateValue(new Date());
        const createdAt =
          eventDate === today
            ? new Date().toISOString()
            : (toUtcNoonIsoTimestamp(eventDate) ?? new Date().toISOString());

        const event: TimelineEvent = {
          id: uuidv4(),
          caseId,
          createdAt,
          clinicalContext: isDischargeDay ? "discharge" : undefined,
          ...updates,
        } as TimelineEvent;
        await saveTimelineEvent(event);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error) {
      console.error("Error saving event:", error);
      Alert.alert("Error", "Failed to save event. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const renderEventTypeButtons = () => (
    <View style={styles.eventTypeGrid}>
      {EVENT_TYPES.map((type) => {
        const isSelected = eventType === type.value;
        const icon = getEventTypeIcon(type.value);
        return (
          <Pressable
            key={type.value}
            disabled={isEditMode}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setEventType(type.value);
            }}
            style={[
              styles.eventTypeButton,
              {
                backgroundColor: isSelected
                  ? theme.link
                  : theme.backgroundDefault,
              },
            ]}
            testID={`timelineEvent.picker-type-${type.value}`}
          >
            <Feather
              name={icon}
              size={22}
              color={isSelected ? theme.buttonText : theme.text}
            />
            <ThemedText
              style={[
                styles.eventTypeLabel,
                { color: isSelected ? theme.buttonText : theme.text },
              ]}
            >
              {type.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );

  const getEventTypeIcon = (
    type: TimelineEventType,
  ): keyof typeof Feather.glyphMap => {
    switch (type) {
      case "photo":
        return "camera";
      case "imaging":
        return "image";
      case "prom":
        return "clipboard";
      case "complication":
        return "alert-triangle";
      case "follow_up_visit":
        return "calendar";
      case "note":
        return "file-text";
      case "wound_assessment":
        return "thermometer";
      case "discharge_photo":
        return "log-out";
      default:
        return "file";
    }
  };

  return (
    <KeyboardAwareScrollViewCompat
      testID="screen-addTimelineEvent"
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Spacing.lg,
          paddingBottom: insets.bottom + Spacing["3xl"],
        },
      ]}
    >
      <SectionHeader
        title={isEditMode ? "Edit Event" : "Add to Timeline"}
        subtitle={getSubtitle()}
      />

      {isDischargeDay ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            gap: Spacing.sm,
            backgroundColor: theme.warning + "1A",
            borderRadius: BorderRadius.md,
            padding: Spacing.md,
            marginTop: Spacing.md,
            borderLeftWidth: 4,
            borderLeftColor: theme.warning,
          }}
        >
          <Feather
            name="log-out"
            size={18}
            color={theme.warning}
            style={{ marginTop: 2 }}
          />
          <View style={{ flex: 1 }}>
            <ThemedText
              style={{ fontWeight: "600", fontSize: 14, color: theme.warning }}
            >
              Discharge day
            </ThemedText>
            <ThemedText
              style={{
                fontSize: 13,
                color: theme.textSecondary,
                marginTop: 2,
              }}
            >
              This event will be tagged to discharge. Use Discharge Photo for a
              quick wound record.
            </ThemedText>
          </View>
        </View>
      ) : null}

      <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
        Entry Type
      </ThemedText>
      {renderEventTypeButtons()}

      {eventType ? (
        <DatePickerField
          label="Event Date"
          value={eventDate}
          onChange={setEventDate}
          placeholder="Select date..."
        />
      ) : null}

      {eventType === "photo" || eventType === "imaging" ? (
        <View style={styles.section}>
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            {eventType === "photo" ? "Photos" : "Imaging"}
          </ThemedText>
          <MediaCapture
            attachments={mediaAttachments}
            onAttachmentsChange={setMediaAttachments}
            mediaType={eventType === "imaging" ? "imaging" : "photo"}
            eventType={eventType}
            defaultMediaDate={eventDate}
            mediaContext={mediaContext}
          />
          <FormField
            label="Caption / Notes"
            value={note}
            onChangeText={setNote}
            placeholder="Add notes about these images..."
            multiline
          />
        </View>
      ) : null}

      {eventType === "prom" ? (
        <View style={styles.section}>
          <PROMEntryForm promData={promData} onPromDataChange={setPromData} />
          <FormField
            label="Notes"
            value={note}
            onChangeText={setNote}
            placeholder="Additional notes about this assessment..."
            multiline
          />
        </View>
      ) : null}

      {eventType === "complication" ? (
        <View style={styles.section}>
          <FormField
            label="Description"
            value={complicationDescription}
            onChangeText={setComplicationDescription}
            placeholder="Describe the complication..."
            multiline
            required
          />
          <SelectField
            label="Clavien-Dindo Grade"
            value={complicationGrade}
            options={CLAVIEN_DINDO_OPTIONS}
            onSelect={(value) =>
              setComplicationGrade(value as ClavienDindoGrade)
            }
          />
          <FormField
            label="Management"
            value={complicationManagement}
            onChangeText={setComplicationManagement}
            placeholder="How was this managed?"
            multiline
          />
        </View>
      ) : null}

      {eventType === "follow_up_visit" ? (
        <View style={styles.section}>
          <SelectField
            label="Follow-up Interval"
            value={followUpInterval}
            options={FOLLOW_UP_INTERVALS}
            onSelect={(value) => setFollowUpInterval(value as FollowUpInterval)}
            required
          />
          <MediaCapture
            attachments={mediaAttachments}
            onAttachmentsChange={setMediaAttachments}
            mediaType="photo"
            eventType="follow_up_visit"
            defaultMediaDate={eventDate}
            mediaContext={mediaContext}
          />
          {hasPeripheralNerveAssessment && (
            <NerveOutcomeForm
              outcome={nerveOutcome}
              onChange={setNerveOutcome}
              nerveInjured={nerveInjured}
            />
          )}
          <FormField
            label="Clinical Notes"
            value={note}
            onChangeText={setNote}
            placeholder="Document the follow-up findings..."
            multiline
          />
        </View>
      ) : null}

      {eventType === "wound_assessment" ? (
        <View style={styles.section}>
          <WoundAssessmentForm
            value={woundAssessmentData}
            onChange={setWoundAssessmentData}
          />
        </View>
      ) : null}

      {eventType === "discharge_photo" ? (
        <View style={styles.section}>
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            Wound / Site Photos
          </ThemedText>
          <MediaCapture
            attachments={mediaAttachments}
            onAttachmentsChange={setMediaAttachments}
            mediaType="photo"
            eventType="discharge_photo"
            defaultMediaDate={eventDate}
            mediaContext={mediaContext}
          />

          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            Wound Status
          </ThemedText>
          <View
            style={{ flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm }}
          >
            {(
              [
                {
                  value: "dry_healing" as const,
                  label: "Dry & healing",
                  color: theme.success,
                },
                {
                  value: "moist" as const,
                  label: "Moist / exudate",
                  color: theme.warning,
                },
                {
                  value: "redness" as const,
                  label: "Redness / concern",
                  color: theme.error,
                },
                {
                  value: "breakdown" as const,
                  label: "Wound breakdown",
                  color: theme.error,
                },
              ] as const
            ).map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setDischargeWoundStatus(opt.value);
                }}
                style={{
                  paddingHorizontal: Spacing.md,
                  paddingVertical: Spacing.sm,
                  borderRadius: BorderRadius.sm,
                  borderWidth: 1.5,
                  borderColor:
                    dischargeWoundStatus === opt.value
                      ? opt.color
                      : theme.border,
                  backgroundColor:
                    dischargeWoundStatus === opt.value
                      ? opt.color + "1A"
                      : theme.backgroundElevated,
                }}
              >
                <ThemedText
                  style={{
                    fontSize: 14,
                    fontWeight:
                      dischargeWoundStatus === opt.value ? "600" : "400",
                    color:
                      dischargeWoundStatus === opt.value
                        ? opt.color
                        : theme.text,
                  }}
                >
                  {opt.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          <FormField
            label="Notes (optional)"
            value={note}
            onChangeText={setNote}
            placeholder="e.g. dressings intact, no concerns, patient comfortable"
            multiline
          />
        </View>
      ) : null}

      {eventType === "note" ? (
        <View style={styles.section}>
          <FormField
            label="Note"
            value={note}
            onChangeText={setNote}
            placeholder="Record your note..."
            multiline
            required
          />
        </View>
      ) : null}

      {eventType ? (
        <View style={styles.buttonContainer}>
          <Button onPress={handleSave} disabled={saving} testID="timelineEvent.btn-save">
            {saving
              ? "Saving..."
              : isEditMode
                ? "Save Changes"
                : "Add to Timeline"}
          </Button>
        </View>
      ) : null}
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  eventTypeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  eventTypeButton: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    minWidth: 100,
    gap: Spacing.xs,
  },
  eventTypeLabel: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  section: {
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  buttonContainer: {
    marginTop: Spacing.xl,
  },
});
