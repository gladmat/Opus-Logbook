import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActionSheetIOS,
  Platform,
  TextInput,
} from "react-native";
import { v4 as uuidv4 } from "uuid";
import {
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@/components/FeatherIcon";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { WoundDimensionChart } from "@/components/WoundDimensionChart";
import { WoundAssessmentCard } from "@/components/WoundAssessmentCard";
import { EncryptedImage } from "@/components/EncryptedImage";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import {
  Case,
  TimelineEvent,
  TimelineEventType,
  ComplicationEntry,
  ClavienDindoGrade,
  SPECIALTY_LABELS,
  INDICATION_LABELS,
  ANASTOMOSIS_LABELS,
  FreeFlapDetails,
  GENDER_LABELS,
  ADMISSION_URGENCY_LABELS,
  UNPLANNED_READMISSION_LABELS,
  WOUND_INFECTION_RISK_LABELS,
  ANAESTHETIC_TYPE_LABELS,
  UNPLANNED_ICU_LABELS,
  DISCHARGE_OUTCOME_LABELS,
  MORTALITY_CLASSIFICATION_LABELS,
  CLAVIEN_DINDO_LABELS,
  TIMELINE_EVENT_TYPE_LABELS,
  PROM_QUESTIONNAIRE_LABELS,
  FOLLOW_UP_INTERVAL_LABELS,
  BROWN_MANDIBLE_CLASS_LABELS,
  JOINT_CASE_ABLATIVE_SURGEON_LABELS,
  getAllProcedures,
  isExcisionBiopsyDiagnosis,
  CLINICAL_SUSPICION_LABELS,
  JOINT_CASE_RECONSTRUCTION_SEQUENCE_LABELS,
  UnplannedReadmissionReason,
  UnplannedICUReason,
  JOINT_CASE_PARTNER_SPECIALTY_LABELS,
  JOINT_CASE_STRUCTURE_RESECTED_LABELS,
  MANDIBLE_SEGMENT_LABELS,
  RECIPIENT_VESSEL_QUALITY_LABELS,
  VEIN_GRAFT_SOURCE_LABELS,
} from "@/types/case";
import { getCasePrimaryTitle } from "@/lib/caseDiagnosisSummary";
import {
  generateHandInfectionSummary,
  HAND_ANTIBIOTIC_LABELS,
  ANTIBIOTIC_ROUTE_LABELS,
  SEVERITY_LABELS as HAND_INFECTION_SEVERITY_LABELS,
  countKanavelSigns,
} from "@/types/handInfection";
import {
  getCase,
  getTimelineEvents,
  deleteCase,
  updateCase,
  markNoComplications,
  deleteTimelineEvent,
} from "@/lib/storage";
import { deleteMultipleEncryptedMedia } from "@/lib/mediaStorage";
import { SpecialtyBadge } from "@/components/SpecialtyBadge";
import { RoleBadge } from "@/components/RoleBadge";
import {
  resolveOperativeRole,
  migrateLegacyRole,
  isLegacyRole,
  type OperativeRole,
} from "@/types/operativeRole";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { SectionHeader } from "@/components/SectionHeader";
import { SkinCancerDetailSummary } from "@/components/skin-cancer/SkinCancerDetailSummary";
import { HeaderTitleText } from "@/components/HeaderTitleText";
import { MediaTagBadge } from "@/components/media";
import {
  caseNeedsHistology,
  caseCanAddHistology,
  getFirstHistologyTarget,
} from "@/lib/skinCancerConfig";
import { IMPLANT_CATALOGUE } from "@/data/implantCatalogue";
import {
  APPROACH_LABELS as IMPLANT_APPROACH_LABELS,
  FIXATION_LABELS as IMPLANT_FIXATION_LABELS,
  BEARING_LABELS as IMPLANT_BEARING_LABELS,
  JOINT_TYPE_LABELS,
  INDICATION_LABELS as IMPLANT_INDICATION_LABELS,
  REVISION_REASON_LABELS,
} from "@/types/jointImplant";
import { buildMediaContextFromCase } from "@/lib/mediaContext";
import { resolveMediaTag } from "@/lib/mediaTagMigration";
import {
  IMPLANT_DIGIT_LABELS,
  IMPLANT_LATERALITY_LABELS,
  formatImplantSize,
} from "@/lib/jointImplant";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type RouteParams = RouteProp<RootStackParamList, "CaseDetail">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface DetailRowProps {
  label: string;
  value: string | number | undefined | null;
  unit?: string;
}

function DetailRow({ label, value, unit }: DetailRowProps) {
  const { theme } = useTheme();

  if (value === undefined || value === null || value === "") return null;

  return (
    <View style={styles.detailRow}>
      <ThemedText style={[styles.detailLabel, { color: theme.textSecondary }]}>
        {label}
      </ThemedText>
      <ThemedText style={styles.detailValue}>
        {value}
        {unit ? ` ${unit}` : ""}
      </ThemedText>
    </View>
  );
}

function formatDefectDimensions(
  dimensions:
    | {
        length?: number;
        width?: number;
        depth?: number;
      }
    | undefined,
): string | undefined {
  if (!dimensions) return undefined;

  const parts = [
    dimensions.length != null ? `L ${dimensions.length}` : undefined,
    dimensions.width != null ? `W ${dimensions.width}` : undefined,
    dimensions.depth != null ? `D ${dimensions.depth}` : undefined,
  ].filter(Boolean);

  return parts.length > 0 ? `${parts.join(" × ")} mm` : undefined;
}

function formatStructuresResected(
  values: (keyof typeof JOINT_CASE_STRUCTURE_RESECTED_LABELS)[] | undefined,
): string | undefined {
  if (!values || values.length === 0) return undefined;
  return values
    .map((value) => JOINT_CASE_STRUCTURE_RESECTED_LABELS[value] ?? value)
    .join(", ");
}

function getRecipientVesselQualityLabel(
  details: FreeFlapDetails,
): string | undefined {
  if (details.recipientVesselQuality) {
    return RECIPIENT_VESSEL_QUALITY_LABELS[details.recipientVesselQuality];
  }
  if (details.irradiatedVesselPreference === "vein_graft_required") {
    return RECIPIENT_VESSEL_QUALITY_LABELS.irradiated_vein_graft_required;
  }
  if (details.irradiatedNeckDissectionPerformed) {
    return RECIPIENT_VESSEL_QUALITY_LABELS.previously_operated;
  }
  if (
    details.irradiatedVesselPreference === "ipsilateral_viable" ||
    (details.irradiatedVesselStatus &&
      details.irradiatedVesselStatus !== "normal")
  ) {
    return RECIPIENT_VESSEL_QUALITY_LABELS.irradiated_usable;
  }
  if (
    details.irradiatedVesselStatus === "normal" ||
    details.irradiatedVesselPreference === "contralateral"
  ) {
    return RECIPIENT_VESSEL_QUALITY_LABELS.normal;
  }

  return undefined;
}

function getEventTypeIcon(
  eventType: TimelineEventType,
): keyof typeof Feather.glyphMap {
  switch (eventType) {
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
}

function getEventTypeColor(
  eventType: TimelineEventType,
  theme: typeof import("@/constants/theme").Colors.light,
): string {
  switch (eventType) {
    case "photo":
      return theme.link;
    case "imaging":
      return theme.info;
    case "prom":
      return theme.success;
    case "complication":
      return theme.error;
    case "follow_up_visit":
      return theme.warning;
    case "note":
      return theme.textSecondary;
    case "wound_assessment":
      return theme.info;
    case "discharge_photo":
      return theme.success;
    default:
      return theme.link;
  }
}

export default function CaseDetailScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParams>();
  const insets = useSafeAreaInsets();

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const [showComplicationForm, setShowComplicationForm] = useState(false);
  const [complicationDescription, setComplicationDescription] = useState("");
  const [complicationGrade, setComplicationGrade] =
    useState<ClavienDindoGrade>("I");
  const [complicationNotes, setComplicationNotes] = useState("");
  const [savingComplication, setSavingComplication] = useState(false);

  // 30-day audit fields (RACS MALT)
  const [auditReadmission, setAuditReadmission] = useState(false);
  const [auditReadmissionReason, setAuditReadmissionReason] = useState("no");
  const [auditICU, setAuditICU] = useState("no");
  const [auditReturnToTheatre, setAuditReturnToTheatre] = useState(false);
  const [auditReturnReason, setAuditReturnReason] = useState("");

  // Pre-populate audit fields from existing case data
  useEffect(() => {
    if (caseData) {
      setAuditReadmission(
        !!caseData.unplannedReadmission &&
          caseData.unplannedReadmission !== "no",
      );
      setAuditReadmissionReason(caseData.unplannedReadmission ?? "no");
      setAuditICU(caseData.unplannedICU ?? "no");
      setAuditReturnToTheatre(!!caseData.returnToTheatre);
      setAuditReturnReason(caseData.returnToTheatreReason ?? "");
    }
  }, [caseData]);

  useEffect(() => {
    if (route.params.showComplicationForm) {
      setShowComplicationForm(true);
    }
  }, [route.params.showComplicationForm]);

  const loadData = useCallback(async () => {
    try {
      const data = await getCase(route.params.caseId);
      setCaseData(data);
      if (data) {
        const events = await getTimelineEvents(data.id);
        setTimelineEvents(events);
      }
    } catch (error) {
      console.error("Error loading case:", error);
    } finally {
      setLoading(false);
    }
  }, [route.params.caseId]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const showHeaderMenu = useCallback(() => {
    if (!caseData) return;

    const options = ["Edit Case", "Duplicate Case", "Cancel"];
    const cancelIndex = 2;

    const handleSelection = (index: number) => {
      if (index === 0) {
        navigation.navigate("CaseForm", { caseId: caseData.id });
      } else if (index === 1) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        navigation.navigate("CaseForm", {
          specialty: caseData.specialty,
          duplicateFrom: caseData,
        });
      }
    };

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIndex },
        handleSelection,
      );
    } else {
      Alert.alert("Case Actions", undefined, [
        { text: "Edit Case", onPress: () => handleSelection(0) },
        { text: "Duplicate Case", onPress: () => handleSelection(1) },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  }, [caseData, navigation]);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <HeaderTitleText
          title={
            [caseData?.patientFirstName, caseData?.patientLastName]
              .filter(Boolean)
              .join(" ") ||
            caseData?.patientIdentifier ||
            "Case Details"
          }
          reserveWidth={164}
          fontSize={15}
        />
      ),
      headerRight: () =>
        caseData ? (
          <Pressable
            onPress={showHeaderMenu}
            style={styles.headerMenuButton}
            accessibilityRole="button"
            accessibilityLabel="Case actions"
          >
            <Feather
              name="more-horizontal"
              size={22}
              color={theme.textSecondary}
            />
          </Pressable>
        ) : null,
    });
  }, [caseData, navigation, theme, showHeaderMenu]);

  const handleDelete = () => {
    Alert.alert(
      "Delete Case",
      "Are you sure you want to delete this case? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (caseData) {
              await deleteCase(caseData.id);
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              navigation.goBack();
            }
          },
        },
      ],
    );
  };

  const isSkinLesionCase = useCallback(() => {
    if (!caseData) return false;

    const skinLesionKeywords = [
      "skin lesion excision",
      "lesion excision",
      "excision of skin lesion",
      "excision biopsy",
      "excisional biopsy",
      "wide local excision",
      "skin cancer",
      "bcc",
      "scc",
      "melanoma",
      "basal cell",
      "squamous cell",
    ];

    const allProcs = getAllProcedures(caseData);
    const procedureName = allProcs[0]?.procedureName?.toLowerCase() || "";
    const diagnosisName = getCasePrimaryTitle(caseData)?.toLowerCase() || "";

    return skinLesionKeywords.some(
      (keyword) =>
        procedureName.includes(keyword) || diagnosisName.includes(keyword),
    );
  }, [caseData]);

  const caseMediaContext = useMemo(() => {
    if (!caseData) return {};
    return buildMediaContextFromCase(caseData);
  }, [caseData]);

  const handleAddEvent = () => {
    if (caseData) {
      navigation.navigate("AddTimelineEvent", {
        caseId: caseData.id,
        isSkinLesion: isSkinLesionCase(),
        caseDischargeDate: caseData.dischargeDate,
        mediaContext: caseMediaContext,
      });
    }
  };

  const handleEditEvent = (event: TimelineEvent) => {
    if (caseData) {
      navigation.navigate("AddTimelineEvent", {
        caseId: caseData.id,
        initialEventType: event.eventType,
        isSkinLesion: isSkinLesionCase(),
        caseDischargeDate: caseData.dischargeDate,
        editEventId: event.id,
        mediaContext: caseMediaContext,
      });
    }
  };

  const handleDeleteEvent = (event: TimelineEvent) => {
    Alert.alert(
      "Delete Event",
      "Are you sure you want to delete this timeline event? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              if (event.mediaAttachments && event.mediaAttachments.length > 0) {
                const uris = event.mediaAttachments
                  .map((m) => m.localUri)
                  .filter((uri): uri is string => !!uri);
                if (uris.length > 0) {
                  await deleteMultipleEncryptedMedia(uris);
                }
              }
              await deleteTimelineEvent(event.id);
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              await loadData();
            } catch (error) {
              console.error("Error deleting timeline event:", error);
              Alert.alert("Error", "Failed to delete the timeline event.");
            }
          },
        },
      ],
    );
  };

  const collectAuditFields = () => ({
    unplannedReadmission: (auditReadmission
      ? auditReadmissionReason
      : "no") as UnplannedReadmissionReason,
    unplannedICU: auditICU as UnplannedICUReason,
    returnToTheatre: auditReturnToTheatre,
    returnToTheatreReason: auditReturnToTheatre ? auditReturnReason : "",
  });

  const handleMarkNoComplications = async () => {
    if (!caseData) return;
    try {
      await markNoComplications(caseData.id, collectAuditFields());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await loadData();
    } catch (error) {
      console.error("Error marking no complications:", error);
      Alert.alert("Error", "Failed to save. Please try again.");
    }
  };

  const handleSaveComplication = async () => {
    if (!caseData || !complicationDescription.trim()) {
      Alert.alert("Required", "Please enter a complication description.");
      return;
    }

    setSavingComplication(true);
    try {
      const newComplication: ComplicationEntry = {
        id: uuidv4(),
        description: complicationDescription.trim(),
        clavienDindoGrade: complicationGrade,
        dateIdentified: new Date().toISOString(),
        managementNotes: complicationNotes.trim() || undefined,
        resolved: false,
      };

      const existingComplications = caseData.complications || [];
      await updateCase(caseData.id, {
        complicationsReviewed: true,
        complicationsReviewedAt: new Date().toISOString(),
        hasComplications: true,
        complications: [...existingComplications, newComplication],
        ...collectAuditFields(),
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowComplicationForm(false);
      setComplicationDescription("");
      setComplicationGrade("I");
      setComplicationNotes("");
      await loadData();
    } catch (error) {
      console.error("Error saving complication:", error);
      Alert.alert("Error", "Failed to save complication. Please try again.");
    } finally {
      setSavingComplication(false);
    }
  };

  const daysSinceProcedure = caseData
    ? Math.floor(
        (Date.now() - new Date(caseData.procedureDate).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : 0;

  const isPending30DayReview =
    caseData && daysSinceProcedure >= 30 && !caseData.complicationsReviewed;

  if (loading) {
    return <LoadingState message="Loading case..." />;
  }

  if (!caseData) {
    return (
      <ThemedView style={styles.container}>
        <EmptyState
          image={require("../../client/assets/images/empty-cases.png")}
          title="Case Not Found"
          message="This case may have been deleted"
          actionLabel="Go Back"
          onAction={() => navigation.goBack()}
        />
      </ThemedView>
    );
  }

  const formattedDate = new Date(caseData.procedureDate).toLocaleDateString(
    "en-NZ",
    { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  );

  const userMember = caseData.teamMembers.find(
    (m) => m.id === caseData.ownerId || m.userId === caseData.ownerId,
  );

  // Resolve case-level operative role from new model or legacy migration
  const caseDefaultRole: OperativeRole | undefined = (() => {
    if (caseData.defaultOperativeRole) return caseData.defaultOperativeRole;
    const legacyRole = userMember?.role;
    if (legacyRole && isLegacyRole(legacyRole)) {
      return migrateLegacyRole(legacyRole).role;
    }
    return undefined;
  })();

  const formatDuration = (minutes: number | undefined): string | undefined => {
    if (!minutes) return undefined;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDateDisplay = (
    dateStr: string | undefined,
  ): string | undefined => {
    if (!dateStr) return undefined;
    try {
      return new Date(dateStr).toLocaleDateString("en-NZ", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const hasHistologyPending = caseData.diagnosisGroups?.some(
    (g) =>
      g.diagnosisCertainty === "clinical" ||
      isExcisionBiopsyDiagnosis(g.diagnosisPicklistId),
  );

  const hasProcedures = caseData.diagnosisGroups?.some(
    (g) => g.procedures.length > 0,
  );
  const hasPatientDemographics =
    caseData.gender ||
    caseData.age ||
    caseData.ethnicity ||
    caseData.patientFirstName ||
    caseData.patientLastName ||
    caseData.patientDateOfBirth;
  const hasAdmissionDetails =
    caseData.admissionDate ||
    caseData.dischargeDate ||
    caseData.admissionUrgency ||
    (caseData.unplannedReadmission && caseData.unplannedReadmission !== "no");
  const hasDiagnoses = caseData.diagnosisGroups?.some((g) => g.diagnosis);
  const hasComorbidities =
    caseData.comorbidities && caseData.comorbidities.length > 0;
  const hasOperativeFactors =
    caseData.woundInfectionRisk ||
    caseData.anaestheticType ||
    caseData.prophylaxis;
  const hasOutcomes =
    caseData.unplannedICU ||
    caseData.returnToTheatre ||
    caseData.outcome ||
    caseData.mortalityClassification ||
    caseData.discussedAtMDM;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Spacing.lg,
            paddingBottom: insets.bottom + Spacing["3xl"] + 80,
          },
        ]}
      >
        <View
          style={[
            styles.heroCard,
            { backgroundColor: theme.backgroundDefault },
          ]}
        >
          <View style={styles.heroBadges}>
            <SpecialtyBadge specialty={caseData.specialty} size="medium" />
            {caseDefaultRole ? (
              <RoleBadge role={caseDefaultRole} />
            ) : userMember ? (
              <RoleBadge role={userMember.role} />
            ) : null}
          </View>
          <ThemedText type="h2" style={styles.procedureType}>
            {getCasePrimaryTitle(caseData) || caseData.procedureType}
          </ThemedText>

          {caseData.procedureCode ? (
            <View
              style={[
                styles.codeCard,
                { backgroundColor: theme.backgroundRoot },
              ]}
            >
              <ThemedText
                style={[styles.codeLabel, { color: theme.textSecondary }]}
              >
                SNOMED CT
              </ThemedText>
              <ThemedText style={styles.codeValue}>
                {caseData.procedureCode.snomedCtCode}
              </ThemedText>
              {caseData.procedureCode.localCode ? (
                <>
                  <ThemedText
                    style={[
                      styles.codeLabel,
                      { color: theme.textSecondary, marginTop: Spacing.xs },
                    ]}
                  >
                    {caseData.procedureCode.localSystem}
                  </ThemedText>
                  <ThemedText style={styles.codeValue}>
                    {caseData.procedureCode.localCode}
                  </ThemedText>
                </>
              ) : null}
            </View>
          ) : null}

          <View style={styles.heroMeta}>
            <View style={styles.metaItem}>
              <Feather name="calendar" size={16} color={theme.textSecondary} />
              <ThemedText
                style={[styles.metaText, { color: theme.textSecondary }]}
              >
                {formattedDate}
              </ThemedText>
            </View>
            <View style={styles.metaItem}>
              <Feather name="map-pin" size={16} color={theme.textSecondary} />
              <ThemedText
                style={[styles.metaText, { color: theme.textSecondary }]}
              >
                {caseData.facility}
              </ThemedText>
            </View>
          </View>
        </View>

        {hasHistologyPending ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              backgroundColor: "#FEF3C7",
              padding: 12,
              borderRadius: 10,
              marginBottom: 16,
            }}
          >
            <Feather name="clock" size={18} color="#E5A00D" />
            <View style={{ flex: 1 }}>
              <ThemedText
                style={{ fontWeight: "600", color: "#92400E", fontSize: 14 }}
              >
                Histology pending
              </ThemedText>
              <ThemedText
                style={{ color: "#92400E", fontSize: 12, marginTop: 2 }}
              >
                Edit this case to update diagnosis when results arrive
              </ThemedText>
            </View>
          </View>
        ) : null}

        {hasProcedures ? (
          <>
            <SectionHeader title="Procedures Performed" />
            {caseData.diagnosisGroups?.map((group, gIdx) => {
              if (group.procedures.length === 0) return null;
              const showGroupHeader = caseData.diagnosisGroups.length > 1;
              return (
                <View key={group.id}>
                  {showGroupHeader ? (
                    <View style={styles.groupHeader}>
                      <SpecialtyBadge
                        specialty={group.specialty}
                        size="small"
                      />
                      {group.diagnosis ? (
                        <ThemedText
                          style={[
                            styles.groupDiagnosisLabel,
                            { color: theme.textSecondary },
                          ]}
                        >
                          {group.diagnosis.displayName}
                        </ThemedText>
                      ) : null}
                    </View>
                  ) : null}
                  {group.procedures.map((proc, idx) => (
                    <View
                      key={proc.id}
                      style={[
                        styles.procedureCard,
                        { backgroundColor: theme.backgroundDefault },
                      ]}
                    >
                      <View style={styles.procedureHeader}>
                        <View
                          style={[
                            styles.procedureNumber,
                            { backgroundColor: theme.link + "20" },
                          ]}
                        >
                          <ThemedText
                            style={[
                              styles.procedureNumberText,
                              { color: theme.link },
                            ]}
                          >
                            {idx + 1}
                          </ThemedText>
                        </View>
                        <View style={styles.procedureInfo}>
                          <ThemedText style={styles.procedureName}>
                            {proc.procedureName || "Unnamed Procedure"}
                          </ThemedText>
                          {proc.specialty ? (
                            <ThemedText
                              style={[
                                styles.procedureSpecialty,
                                { color: theme.textSecondary },
                              ]}
                            >
                              {SPECIALTY_LABELS[proc.specialty]}
                            </ThemedText>
                          ) : null}
                        </View>
                        <RoleBadge
                          role={resolveOperativeRole(
                            proc.operativeRoleOverride,
                            caseDefaultRole,
                          )}
                        />
                      </View>
                      {proc.snomedCtCode ? (
                        <View
                          style={[
                            styles.procedureSnomedRow,
                            { borderTopColor: theme.border },
                          ]}
                        >
                          <ThemedText
                            style={[
                              styles.procedureSnomedLabel,
                              { color: theme.textTertiary },
                            ]}
                          >
                            SNOMED CT: {proc.snomedCtCode}
                          </ThemedText>
                          {proc.snomedCtDisplay ? (
                            <ThemedText
                              style={[
                                styles.procedureSnomedDisplay,
                                { color: theme.textSecondary },
                              ]}
                            >
                              {proc.snomedCtDisplay}
                            </ThemedText>
                          ) : null}
                        </View>
                      ) : null}
                      {proc.notes ? (
                        <ThemedText
                          style={[
                            styles.procedureNotes,
                            { color: theme.textSecondary },
                          ]}
                        >
                          {proc.notes}
                        </ThemedText>
                      ) : null}
                      {proc.clinicalDetails ? (
                        <View
                          style={[
                            styles.procedureClinicalDetails,
                            { borderTopColor: theme.border },
                          ]}
                        >
                          {proc.tags?.includes("free_flap") &&
                          (proc.clinicalDetails as FreeFlapDetails) ? (
                            <>
                              {(proc.clinicalDetails as FreeFlapDetails)
                                .harvestSide ? (
                                <DetailRow
                                  label="Harvest Side"
                                  value={
                                    (proc.clinicalDetails as FreeFlapDetails)
                                      .harvestSide === "left"
                                      ? "Left"
                                      : "Right"
                                  }
                                />
                              ) : null}
                              {(proc.clinicalDetails as FreeFlapDetails)
                                .indication ? (
                                <DetailRow
                                  label="Indication"
                                  value={
                                    INDICATION_LABELS[
                                      (proc.clinicalDetails as FreeFlapDetails)
                                        .indication!
                                    ]
                                  }
                                />
                              ) : null}
                              {(proc.clinicalDetails as FreeFlapDetails)
                                .recipientSiteRegion ? (
                                <DetailRow
                                  label="Recipient Site"
                                  value={(
                                    proc.clinicalDetails as FreeFlapDetails
                                  ).recipientSiteRegion?.replace(/_/g, " ")}
                                />
                              ) : null}
                              {getRecipientVesselQualityLabel(
                                proc.clinicalDetails as FreeFlapDetails,
                              ) ? (
                                <DetailRow
                                  label="Recipient Vessels"
                                  value={getRecipientVesselQualityLabel(
                                    proc.clinicalDetails as FreeFlapDetails,
                                  )}
                                />
                              ) : null}
                              {(proc.clinicalDetails as FreeFlapDetails)
                                .ischemiaTimeMinutes ? (
                                <DetailRow
                                  label="Ischemia Time"
                                  value={
                                    (proc.clinicalDetails as FreeFlapDetails)
                                      .ischemiaTimeMinutes
                                  }
                                  unit="min"
                                />
                              ) : null}
                              {(proc.clinicalDetails as FreeFlapDetails)
                                .flapWidthCm ||
                              (proc.clinicalDetails as FreeFlapDetails)
                                .flapLengthCm ? (
                                <DetailRow
                                  label="Flap Dimensions"
                                  value={`${(proc.clinicalDetails as FreeFlapDetails).flapWidthCm || "?"} x ${(proc.clinicalDetails as FreeFlapDetails).flapLengthCm || "?"} cm`}
                                />
                              ) : null}
                              {(proc.clinicalDetails as FreeFlapDetails)
                                .anastomoses &&
                              (proc.clinicalDetails as FreeFlapDetails)
                                .anastomoses!.length > 0 ? (
                                <View style={styles.anastomosesList}>
                                  <ThemedText
                                    style={[
                                      styles.anastomosesTitle,
                                      { color: theme.textSecondary },
                                    ]}
                                  >
                                    Anastomoses:
                                  </ThemedText>
                                  {(
                                    proc.clinicalDetails as FreeFlapDetails
                                  ).anastomoses!.map((a, aIdx) => (
                                    <ThemedText
                                      key={a.id || aIdx}
                                      style={styles.anastomosisItem}
                                    >
                                      {a.vesselType === "artery"
                                        ? "\u2764\uFE0F "
                                        : "\uD83D\uDCA7 "}
                                      {a.recipientVesselName ||
                                        "Unknown vessel"}
                                      {a.couplingMethod
                                        ? ` (${ANASTOMOSIS_LABELS[a.couplingMethod as keyof typeof ANASTOMOSIS_LABELS] || a.couplingMethod})`
                                        : ""}
                                    </ThemedText>
                                  ))}
                                </View>
                              ) : null}
                              {(proc.clinicalDetails as FreeFlapDetails)
                                .perforatorCount ? (
                                <DetailRow
                                  label="Perforator Count"
                                  value={
                                    (proc.clinicalDetails as FreeFlapDetails)
                                      .perforatorCount
                                  }
                                />
                              ) : null}
                              {(proc.clinicalDetails as FreeFlapDetails)
                                .elevationPlane ? (
                                <DetailRow
                                  label="Elevation Plane"
                                  value={
                                    (proc.clinicalDetails as FreeFlapDetails)
                                      .elevationPlane === "subfascial"
                                      ? "Subfascial"
                                      : (
                                            proc.clinicalDetails as FreeFlapDetails
                                          ).elevationPlane === "suprafascial"
                                        ? "Suprafascial"
                                        : (
                                            proc.clinicalDetails as FreeFlapDetails
                                          ).elevationPlane
                                  }
                                />
                              ) : null}
                              {(proc.clinicalDetails as FreeFlapDetails)
                                .composition ? (
                                <DetailRow
                                  label="Composition"
                                  value={
                                    (proc.clinicalDetails as FreeFlapDetails)
                                      .composition
                                  }
                                />
                              ) : null}
                              {(proc.clinicalDetails as FreeFlapDetails)
                                .isFlowThrough ? (
                                <DetailRow label="Flow-Through" value="Yes" />
                              ) : null}
                              {(proc.clinicalDetails as FreeFlapDetails)
                                .skinIsland !== undefined ? (
                                <DetailRow
                                  label="Skin Island"
                                  value={
                                    (proc.clinicalDetails as FreeFlapDetails)
                                      .skinIsland
                                      ? "Yes"
                                      : "No"
                                  }
                                />
                              ) : null}
                              {((proc.clinicalDetails as FreeFlapDetails)
                                .veinGraftUsed ??
                                (proc.clinicalDetails as FreeFlapDetails)
                                  .irradiatedVesselPreference ===
                                  "vein_graft_required") !== undefined ? (
                                <DetailRow
                                  label="Vein Graft"
                                  value={
                                    ((proc.clinicalDetails as FreeFlapDetails)
                                      .veinGraftUsed ??
                                    (proc.clinicalDetails as FreeFlapDetails)
                                      .irradiatedVesselPreference ===
                                      "vein_graft_required")
                                      ? "Yes"
                                      : "No"
                                  }
                                />
                              ) : null}
                              {(proc.clinicalDetails as FreeFlapDetails)
                                .veinGraftSource ? (
                                <DetailRow
                                  label="Vein Graft Source"
                                  value={
                                    VEIN_GRAFT_SOURCE_LABELS[
                                      (proc.clinicalDetails as FreeFlapDetails)
                                        .veinGraftSource!
                                    ]
                                  }
                                />
                              ) : null}
                              {(proc.clinicalDetails as FreeFlapDetails)
                                .veinGraftLength ? (
                                <DetailRow
                                  label="Vein Graft Length"
                                  value={
                                    (proc.clinicalDetails as FreeFlapDetails)
                                      .veinGraftLength
                                  }
                                  unit="cm"
                                />
                              ) : null}
                              {(proc.clinicalDetails as FreeFlapDetails)
                                .flapSpecificDetails?.fibulaBrownClass ? (
                                <DetailRow
                                  label="Brown Class"
                                  value={
                                    BROWN_MANDIBLE_CLASS_LABELS[
                                      (proc.clinicalDetails as FreeFlapDetails)
                                        .flapSpecificDetails!.fibulaBrownClass!
                                    ]
                                  }
                                />
                              ) : null}
                              {(proc.clinicalDetails as FreeFlapDetails)
                                .flapSpecificDetails?.fibulaMandibleSegments
                                ?.length ? (
                                <DetailRow
                                  label="Mandible Segments"
                                  value={(
                                    proc.clinicalDetails as FreeFlapDetails
                                  )
                                    .flapSpecificDetails!.fibulaMandibleSegments!.map(
                                      (segment) =>
                                        MANDIBLE_SEGMENT_LABELS[segment] ??
                                        segment,
                                    )
                                    .join(", ")}
                                />
                              ) : null}
                            </>
                          ) : null}
                          {proc.specialty === "hand_wrist" &&
                          proc.clinicalDetails ? (
                            <>
                              <DetailRow
                                label="Injury Mechanism"
                                value={
                                  (proc.clinicalDetails as any).injuryMechanism
                                }
                              />
                              <DetailRow
                                label="Fixation Material"
                                value={(
                                  proc.clinicalDetails as any
                                ).fixationMaterial?.replace(/_/g, " ")}
                              />
                              <DetailRow
                                label="Fracture Site"
                                value={
                                  (proc.clinicalDetails as any).fractureSite
                                }
                              />
                            </>
                          ) : null}
                          {proc.specialty === "body_contouring" &&
                          proc.clinicalDetails ? (
                            <>
                              <DetailRow
                                label="Resection Weight"
                                value={
                                  (proc.clinicalDetails as any)
                                    .resectionWeightGrams
                                }
                                unit="g"
                              />
                              <DetailRow
                                label="Drain Output"
                                value={
                                  (proc.clinicalDetails as any).drainOutputMl
                                }
                                unit="ml"
                              />
                            </>
                          ) : null}
                        </View>
                      ) : null}
                      {proc.implantDetails ? (
                        <View
                          style={[
                            styles.procedureClinicalDetails,
                            { borderTopColor: theme.border },
                          ]}
                        >
                          <DetailRow
                            label="Implant"
                            value={
                              proc.implantDetails.implantSystemId
                                ? (IMPLANT_CATALOGUE[
                                    proc.implantDetails.implantSystemId
                                  ]?.displayName ??
                                  proc.implantDetails.implantSystemOther ??
                                  "Unknown")
                                : "Incomplete implant details"
                            }
                          />
                          <DetailRow
                            label="Joint"
                            value={
                              JOINT_TYPE_LABELS[proc.implantDetails.jointType]
                            }
                          />
                          {proc.implantDetails.laterality ? (
                            <DetailRow
                              label="Laterality"
                              value={
                                IMPLANT_LATERALITY_LABELS[
                                  proc.implantDetails.laterality
                                ]
                              }
                            />
                          ) : null}
                          {proc.implantDetails.digit ? (
                            <DetailRow
                              label="Digit"
                              value={
                                IMPLANT_DIGIT_LABELS[proc.implantDetails.digit]
                              }
                            />
                          ) : null}
                          <DetailRow
                            label="Indication"
                            value={
                              IMPLANT_INDICATION_LABELS[
                                proc.implantDetails.indication
                              ]
                            }
                          />
                          {formatImplantSize(proc.implantDetails) ? (
                            <DetailRow
                              label="Size"
                              value={formatImplantSize(proc.implantDetails)}
                            />
                          ) : null}
                          {proc.implantDetails.approach ? (
                            <DetailRow
                              label="Approach"
                              value={
                                IMPLANT_APPROACH_LABELS[
                                  proc.implantDetails.approach
                                ]
                              }
                            />
                          ) : null}
                          {proc.implantDetails.fixation ? (
                            <DetailRow
                              label="Fixation"
                              value={
                                IMPLANT_FIXATION_LABELS[
                                  proc.implantDetails.fixation
                                ]
                              }
                            />
                          ) : null}
                          {proc.implantDetails.bearingSurface ? (
                            <DetailRow
                              label="Bearing"
                              value={
                                IMPLANT_BEARING_LABELS[
                                  proc.implantDetails.bearingSurface
                                ]
                              }
                            />
                          ) : null}
                          {proc.implantDetails.procedureType === "revision" ? (
                            <>
                              <DetailRow label="Type" value="Revision" />
                              {proc.implantDetails.revisionReason ? (
                                <DetailRow
                                  label="Revision Reason"
                                  value={
                                    REVISION_REASON_LABELS[
                                      proc.implantDetails.revisionReason
                                    ]
                                  }
                                />
                              ) : null}
                              {proc.implantDetails.componentsRevised?.length ? (
                                <DetailRow
                                  label="Components Revised"
                                  value={proc.implantDetails.componentsRevised
                                    .map((component) =>
                                      component === "all"
                                        ? "All"
                                        : component.charAt(0).toUpperCase() +
                                          component.slice(1),
                                    )
                                    .join(", ")}
                                />
                              ) : null}
                            </>
                          ) : null}
                          {proc.implantDetails.cementBrand ? (
                            <DetailRow
                              label="Cement Brand"
                              value={proc.implantDetails.cementBrand}
                            />
                          ) : null}
                          {proc.implantDetails.grommetsUsed !== undefined ? (
                            <DetailRow
                              label="Grommets"
                              value={
                                proc.implantDetails.grommetsUsed ? "Yes" : "No"
                              }
                            />
                          ) : null}
                          {proc.implantDetails.catalogueNumber ? (
                            <DetailRow
                              label="Catalogue #"
                              value={proc.implantDetails.catalogueNumber}
                            />
                          ) : null}
                          {proc.implantDetails.lotBatchNumber ? (
                            <DetailRow
                              label="Lot/Batch #"
                              value={proc.implantDetails.lotBatchNumber}
                            />
                          ) : null}
                          {proc.implantDetails.udi ? (
                            <DetailRow
                              label="UDI"
                              value={proc.implantDetails.udi}
                            />
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>
              );
            })}
          </>
        ) : null}

        {caseData.operativeMedia && caseData.operativeMedia.length > 0 ? (
          <>
            <SectionHeader title="Operative Media" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.mediaGalleryContainer}
            >
              {caseData.operativeMedia.map((media) => (
                <View
                  key={media.id}
                  style={[
                    styles.mediaItem,
                    { backgroundColor: theme.backgroundDefault },
                  ]}
                >
                  <EncryptedImage
                    uri={media.localUri}
                    style={styles.mediaImage}
                    resizeMode="cover"
                    onError={() =>
                      console.warn("Media file missing:", media.localUri)
                    }
                  />
                  <View style={styles.mediaTypeBadge}>
                    <MediaTagBadge tag={resolveMediaTag(media)} size="small" />
                  </View>
                  {media.caption ? (
                    <View
                      style={[
                        styles.mediaCaptionOverlay,
                        { backgroundColor: "rgba(0,0,0,0.6)" },
                      ]}
                    >
                      <ThemedText
                        style={styles.mediaCaptionText}
                        numberOfLines={2}
                      >
                        {media.caption}
                      </ThemedText>
                    </View>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          </>
        ) : null}

        {hasPatientDemographics ? (
          <>
            <SectionHeader title="Patient Demographics" />
            <View
              style={[
                styles.card,
                { backgroundColor: theme.backgroundDefault },
              ]}
            >
              {(caseData.patientFirstName || caseData.patientLastName) && (
                <DetailRow
                  label="Patient"
                  value={[caseData.patientFirstName, caseData.patientLastName]
                    .filter(Boolean)
                    .join(" ")}
                />
              )}
              {caseData.patientNhi && (
                <DetailRow label="NHI" value={caseData.patientNhi} />
              )}
              {caseData.patientDateOfBirth && (
                <DetailRow
                  label="Date of Birth"
                  value={
                    caseData.age
                      ? `${caseData.patientDateOfBirth} (age ${caseData.age})`
                      : caseData.patientDateOfBirth
                  }
                />
              )}
              {!caseData.patientDateOfBirth && caseData.age && (
                <DetailRow label="Age" value={String(caseData.age)} />
              )}
              <DetailRow
                label="Gender"
                value={
                  caseData.gender ? GENDER_LABELS[caseData.gender] : undefined
                }
              />
              <DetailRow label="Ethnicity" value={caseData.ethnicity} />
            </View>
          </>
        ) : null}

        {hasAdmissionDetails ? (
          <>
            <SectionHeader title="Admission Details" />
            <View
              style={[
                styles.card,
                { backgroundColor: theme.backgroundDefault },
              ]}
            >
              <DetailRow
                label="Admission Date"
                value={formatDateDisplay(caseData.admissionDate)}
              />
              <DetailRow
                label="Discharge Date"
                value={formatDateDisplay(caseData.dischargeDate)}
              />
              <DetailRow
                label="Admission Urgency"
                value={
                  caseData.admissionUrgency
                    ? ADMISSION_URGENCY_LABELS[caseData.admissionUrgency]
                    : undefined
                }
              />
              {caseData.unplannedReadmission &&
              caseData.unplannedReadmission !== "no" ? (
                <DetailRow
                  label="Unplanned Readmission"
                  value={
                    UNPLANNED_READMISSION_LABELS[caseData.unplannedReadmission]
                  }
                />
              ) : null}
            </View>
          </>
        ) : null}

        {hasDiagnoses ? (
          <>
            <SectionHeader title="Diagnoses" />
            {caseData.diagnosisGroups?.map((group, gIdx) => {
              if (
                !group.diagnosis &&
                !group.pathologicalDiagnosis &&
                (!group.fractures || group.fractures.length === 0)
              )
                return null;
              const showGroupLabel = caseData.diagnosisGroups.length > 1;
              return (
                <View
                  key={group.id}
                  style={[
                    styles.card,
                    {
                      backgroundColor: theme.backgroundDefault,
                      marginBottom: Spacing.sm,
                    },
                  ]}
                >
                  {showGroupLabel ? (
                    <View style={styles.groupHeader}>
                      <SpecialtyBadge
                        specialty={group.specialty}
                        size="small"
                      />
                    </View>
                  ) : null}
                  {group.diagnosis ? (
                    <View style={styles.diagnosisItem}>
                      <ThemedText
                        style={[
                          styles.diagnosisLabel,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Diagnosis
                      </ThemedText>
                      <ThemedText style={styles.diagnosisValue}>
                        {group.diagnosis.displayName}
                      </ThemedText>
                      {group.diagnosis.snomedCtCode ? (
                        <ThemedText
                          style={[
                            styles.snomedCode,
                            { color: theme.textTertiary },
                          ]}
                        >
                          SNOMED CT: {group.diagnosis.snomedCtCode}
                        </ThemedText>
                      ) : null}
                      {group.clinicalSuspicion ? (
                        <ThemedText
                          style={[
                            styles.snomedCode,
                            { color: theme.textSecondary, marginTop: 4 },
                          ]}
                        >
                          Clinical suspicion:{" "}
                          {CLINICAL_SUSPICION_LABELS[group.clinicalSuspicion]}
                        </ThemedText>
                      ) : null}
                    </View>
                  ) : null}
                  {group.diagnosisStagingSelections &&
                  Object.keys(group.diagnosisStagingSelections).length > 0 ? (
                    <View style={styles.diagnosisItem}>
                      <ThemedText
                        style={[
                          styles.diagnosisLabel,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Staging
                      </ThemedText>
                      {Object.entries(group.diagnosisStagingSelections).map(
                        ([key, val]) => (
                          <DetailRow key={key} label={key} value={val} />
                        ),
                      )}
                    </View>
                  ) : null}
                  {group.fractures && group.fractures.length > 0 ? (
                    <View style={styles.diagnosisItem}>
                      <ThemedText
                        style={[
                          styles.diagnosisLabel,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Fractures
                      </ThemedText>
                      {group.fractures.map((f) => (
                        <ThemedText key={f.id} style={styles.diagnosisValue}>
                          {f.boneName} - {f.aoCode}
                        </ThemedText>
                      ))}
                    </View>
                  ) : null}
                  {group.diagnosisClinicalDetails?.handTrauma
                    ?.injuredStructures &&
                  group.diagnosisClinicalDetails.handTrauma.injuredStructures
                    .length > 0 ? (
                    <View style={styles.diagnosisItem}>
                      <ThemedText
                        style={[
                          styles.diagnosisLabel,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Injured Structures
                      </ThemedText>
                      {group.diagnosisClinicalDetails.handTrauma
                        .affectedDigits &&
                      group.diagnosisClinicalDetails.handTrauma.affectedDigits
                        .length > 0 ? (
                        <ThemedText
                          style={[
                            styles.snomedCode,
                            { color: theme.textTertiary, marginBottom: 4 },
                          ]}
                        >
                          Digits:{" "}
                          {group.diagnosisClinicalDetails.handTrauma.affectedDigits.join(
                            ", ",
                          )}
                        </ThemedText>
                      ) : null}
                      {group.diagnosisClinicalDetails.handTrauma.injuredStructures.map(
                        (s, sIdx) => (
                          <ThemedText
                            key={`${s.structureId}-${sIdx}`}
                            style={styles.diagnosisValue}
                          >
                            {s.displayName}
                            {s.zone ? ` (Zone ${s.zone})` : ""}
                          </ThemedText>
                        ),
                      )}
                    </View>
                  ) : null}
                  {group.pathologicalDiagnosis ? (
                    <View style={styles.diagnosisItem}>
                      <ThemedText
                        style={[
                          styles.diagnosisLabel,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Pathological Diagnosis
                      </ThemedText>
                      <ThemedText style={styles.diagnosisValue}>
                        {group.pathologicalDiagnosis.displayName}
                      </ThemedText>
                      {group.pathologicalDiagnosis.snomedCtCode ? (
                        <ThemedText
                          style={[
                            styles.snomedCode,
                            { color: theme.textTertiary },
                          ]}
                        >
                          SNOMED CT: {group.pathologicalDiagnosis.snomedCtCode}
                        </ThemedText>
                      ) : null}
                    </View>
                  ) : null}

                  {/* Skin cancer assessment — single-lesion */}
                  {group.skinCancerAssessment ? (
                    <SkinCancerDetailSummary
                      assessment={group.skinCancerAssessment}
                    />
                  ) : null}

                  {/* Skin cancer assessment — multi-lesion */}
                  {group.lesionInstances?.some(
                    (l) => l.skinCancerAssessment,
                  ) ? (
                    <>
                      {group.lesionInstances
                        ?.filter((l) => l.skinCancerAssessment)
                        .map((l, idx) => (
                          <SkinCancerDetailSummary
                            key={l.id}
                            assessment={l.skinCancerAssessment!}
                            lesionLabel={`Lesion ${idx + 1}`}
                          />
                        ))}
                    </>
                  ) : null}

                  {/* Hand infection details */}
                  {group.handInfectionDetails ? (
                    <View
                      style={[
                        styles.handInfectionSummary,
                        {
                          backgroundColor: theme.warning + "10",
                          borderColor: theme.warning + "30",
                        },
                      ]}
                    >
                      <View style={styles.handInfectionHeader}>
                        <Feather
                          name="alert-triangle"
                          size={14}
                          color={theme.warning}
                        />
                        <ThemedText
                          style={[
                            styles.handInfectionTitle,
                            { color: theme.text },
                          ]}
                        >
                          {generateHandInfectionSummary(
                            group.handInfectionDetails,
                          ) ?? "Hand Infection"}
                        </ThemedText>
                      </View>
                      <View style={styles.handInfectionFields}>
                        {group.handInfectionDetails.severity !== "local" ? (
                          <ThemedText
                            style={[
                              styles.handInfectionField,
                              {
                                color:
                                  group.handInfectionDetails.severity ===
                                  "systemic"
                                    ? theme.error
                                    : theme.warning,
                              },
                            ]}
                          >
                            {
                              HAND_INFECTION_SEVERITY_LABELS[
                                group.handInfectionDetails.severity
                              ]
                            }
                          </ThemedText>
                        ) : null}
                        {group.handInfectionDetails.kanavelSigns ? (
                          <ThemedText
                            style={[
                              styles.handInfectionField,
                              { color: theme.textSecondary },
                            ]}
                          >
                            Kanavel{" "}
                            {countKanavelSigns(
                              group.handInfectionDetails.kanavelSigns,
                            )}
                            /4
                          </ThemedText>
                        ) : null}
                        {group.handInfectionDetails.empiricalAntibiotic ? (
                          <ThemedText
                            style={[
                              styles.handInfectionField,
                              { color: theme.textSecondary },
                            ]}
                          >
                            {
                              HAND_ANTIBIOTIC_LABELS[
                                group.handInfectionDetails.empiricalAntibiotic
                              ]
                            }
                            {group.handInfectionDetails.antibioticRoute
                              ? ` (${ANTIBIOTIC_ROUTE_LABELS[group.handInfectionDetails.antibioticRoute]})`
                              : ""}
                          </ThemedText>
                        ) : null}
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </>
        ) : null}

        {caseCanAddHistology(caseData) ? (
          <Pressable
            onPress={() => {
              const target = getFirstHistologyTarget(caseData);
              if (target) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate("AddHistology", {
                  caseId: caseData.id,
                  diagnosisGroupIndex: target.groupIndex,
                  lesionIndex: target.lesionIndex,
                });
              }
            }}
            style={[
              styles.histologyButton,
              {
                backgroundColor: theme.warning + "15",
                borderColor: theme.warning + "40",
              },
            ]}
          >
            <Feather name="file-text" size={18} color={theme.warning} />
            <View style={styles.histologyButtonText}>
              <ThemedText
                style={[styles.histologyButtonTitle, { color: theme.warning }]}
              >
                {caseNeedsHistology(caseData)
                  ? "Add Histology Results"
                  : "Update Histology"}
              </ThemedText>
              <ThemedText
                style={[
                  styles.histologyButtonSubtitle,
                  { color: theme.textSecondary },
                ]}
              >
                {caseNeedsHistology(caseData)
                  ? "Pathology results are pending for this case"
                  : "Add or update histology for this case"}
              </ThemedText>
            </View>
            <Feather
              name="chevron-right"
              size={18}
              color={theme.textTertiary}
            />
          </Pressable>
        ) : null}

        {hasComorbidities ? (
          <>
            <SectionHeader title="Co-morbidities" />
            <View
              style={[
                styles.card,
                { backgroundColor: theme.backgroundDefault },
              ]}
            >
              <View style={styles.comorbidityList}>
                {caseData.comorbidities?.map((comorbidity, index) => (
                  <View
                    key={comorbidity.snomedCtCode || index}
                    style={[
                      styles.comorbidityChip,
                      {
                        backgroundColor: theme.warning + "20",
                        borderColor: theme.warning,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[styles.comorbidityText, { color: theme.warning }]}
                    >
                      {comorbidity.commonName || comorbidity.displayName}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : null}

        {caseData.surgeryTiming ? (
          <>
            <SectionHeader title="Surgery Timing" />
            <View
              style={[
                styles.card,
                { backgroundColor: theme.backgroundDefault },
              ]}
            >
              <View style={styles.timingRow}>
                {caseData.surgeryTiming.startTime ? (
                  <View style={styles.timingItem}>
                    <Feather
                      name="play-circle"
                      size={20}
                      color={theme.success}
                    />
                    <View>
                      <ThemedText
                        style={[
                          styles.timingLabel,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Start
                      </ThemedText>
                      <ThemedText style={styles.timingValue}>
                        {caseData.surgeryTiming.startTime}
                      </ThemedText>
                    </View>
                  </View>
                ) : null}
                {caseData.surgeryTiming.endTime ? (
                  <View style={styles.timingItem}>
                    <Feather name="stop-circle" size={20} color={theme.error} />
                    <View>
                      <ThemedText
                        style={[
                          styles.timingLabel,
                          { color: theme.textSecondary },
                        ]}
                      >
                        End
                      </ThemedText>
                      <ThemedText style={styles.timingValue}>
                        {caseData.surgeryTiming.endTime}
                      </ThemedText>
                    </View>
                  </View>
                ) : null}
                {caseData.surgeryTiming.durationMinutes ? (
                  <View style={styles.timingItem}>
                    <Feather name="clock" size={20} color={theme.link} />
                    <View>
                      <ThemedText
                        style={[
                          styles.timingLabel,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Duration
                      </ThemedText>
                      <ThemedText style={styles.timingValue}>
                        {formatDuration(caseData.surgeryTiming.durationMinutes)}
                      </ThemedText>
                    </View>
                  </View>
                ) : null}
              </View>
            </View>
          </>
        ) : null}

        <SectionHeader title="Surgical Team" />
        <View
          style={[styles.card, { backgroundColor: theme.backgroundDefault }]}
        >
          {caseData.teamMembers.map((member) => (
            <View key={member.id} style={styles.teamMember}>
              <View
                style={[styles.avatar, { backgroundColor: theme.link + "20" }]}
              >
                <Feather name="user" size={18} color={theme.link} />
              </View>
              <View style={styles.memberInfo}>
                <ThemedText style={styles.memberName}>{member.name}</ThemedText>
                <RoleBadge role={member.role} size="small" />
              </View>
              {member.confirmed ? (
                <Feather name="check-circle" size={18} color={theme.success} />
              ) : (
                <Feather name="clock" size={18} color={theme.warning} />
              )}
            </View>
          ))}
        </View>

        {/* Responsible Consultant */}
        {caseData.responsibleConsultantName ? (
          <>
            <SectionHeader title="Responsible Consultant" />
            <View
              style={[
                styles.card,
                { backgroundColor: theme.backgroundDefault },
              ]}
            >
              <ThemedText style={styles.consultantName}>
                {caseData.responsibleConsultantName}
              </ThemedText>
            </View>
          </>
        ) : null}

        {/* Joint Case Context */}
        {caseData.jointCaseContext?.isJointCase ? (
          <>
            <SectionHeader title="Joint Case" />
            <View
              style={[
                styles.card,
                { backgroundColor: theme.backgroundDefault },
              ]}
            >
              {caseData.jointCaseContext.partnerSpecialty ? (
                <DetailRow
                  label="Partner Specialty"
                  value={
                    JOINT_CASE_PARTNER_SPECIALTY_LABELS[
                      caseData.jointCaseContext.partnerSpecialty
                    ]
                  }
                />
              ) : null}
              {caseData.jointCaseContext.partnerConsultantName ? (
                <DetailRow
                  label="Partner Consultant"
                  value={caseData.jointCaseContext.partnerConsultantName}
                />
              ) : null}
              {caseData.jointCaseContext.ablativeSurgeon ? (
                <DetailRow
                  label="Ablative Surgeon"
                  value={
                    JOINT_CASE_ABLATIVE_SURGEON_LABELS[
                      caseData.jointCaseContext.ablativeSurgeon
                    ]
                  }
                />
              ) : null}
              {caseData.jointCaseContext.reconstructionSequence ? (
                <DetailRow
                  label="Reconstruction"
                  value={
                    JOINT_CASE_RECONSTRUCTION_SEQUENCE_LABELS[
                      caseData.jointCaseContext.reconstructionSequence
                    ]
                  }
                />
              ) : null}
              {caseData.jointCaseContext.ablativeProcedureDescription ? (
                <DetailRow
                  label="Ablative Procedure"
                  value={caseData.jointCaseContext.ablativeProcedureDescription}
                />
              ) : null}
              {formatDefectDimensions(
                caseData.jointCaseContext.defectDimensions,
              ) ? (
                <DetailRow
                  label="Defect Dimensions"
                  value={formatDefectDimensions(
                    caseData.jointCaseContext.defectDimensions,
                  )}
                />
              ) : null}
              {formatStructuresResected(
                caseData.jointCaseContext.structuresResected,
              ) ? (
                <DetailRow
                  label="Structures Resected"
                  value={formatStructuresResected(
                    caseData.jointCaseContext.structuresResected,
                  )}
                />
              ) : null}
            </View>
          </>
        ) : null}

        {caseData.asaScore ||
        caseData.bmi ||
        caseData.smoker ||
        caseData.diabetes !== undefined ? (
          <>
            <SectionHeader title="Risk Factors" />
            <View
              style={[
                styles.card,
                { backgroundColor: theme.backgroundDefault },
              ]}
            >
              <DetailRow label="ASA Score" value={caseData.asaScore} />
              <DetailRow label="BMI" value={caseData.bmi} />
              <DetailRow
                label="Smoking Status"
                value={
                  caseData.smoker === "yes"
                    ? "Current Smoker"
                    : caseData.smoker === "ex"
                      ? "Ex-Smoker"
                      : caseData.smoker === "no"
                        ? "Non-Smoker"
                        : undefined
                }
              />
              <DetailRow
                label="Diabetes"
                value={
                  caseData.diabetes === true
                    ? "Yes"
                    : caseData.diabetes === false
                      ? "No"
                      : undefined
                }
              />
            </View>
          </>
        ) : null}

        {hasOperativeFactors ? (
          <>
            <SectionHeader title="Operative Factors" />
            <View
              style={[
                styles.card,
                { backgroundColor: theme.backgroundDefault },
              ]}
            >
              <DetailRow
                label="Wound Infection Risk"
                value={
                  caseData.woundInfectionRisk
                    ? WOUND_INFECTION_RISK_LABELS[caseData.woundInfectionRisk]
                    : undefined
                }
              />
              <DetailRow
                label="Anaesthetic Type"
                value={
                  caseData.anaestheticType
                    ? ANAESTHETIC_TYPE_LABELS[caseData.anaestheticType]
                    : undefined
                }
              />
              {caseData.prophylaxis ? (
                <>
                  <DetailRow
                    label="Antibiotic Prophylaxis"
                    value={
                      caseData.prophylaxis.antibiotics ? "Given" : "Not Given"
                    }
                  />
                  <DetailRow
                    label="DVT Prophylaxis"
                    value={
                      caseData.prophylaxis.dvtPrevention ? "Given" : "Not Given"
                    }
                  />
                </>
              ) : null}
            </View>
          </>
        ) : null}

        {hasOutcomes ? (
          <>
            <SectionHeader title="Outcomes" />
            <View
              style={[
                styles.card,
                { backgroundColor: theme.backgroundDefault },
              ]}
            >
              {caseData.unplannedICU && caseData.unplannedICU !== "no" ? (
                <DetailRow
                  label="Unplanned ICU Admission"
                  value={UNPLANNED_ICU_LABELS[caseData.unplannedICU]}
                />
              ) : null}
              {caseData.returnToTheatre ? (
                <>
                  <DetailRow label="Return to Theatre" value="Yes" />
                  <DetailRow
                    label="Reason"
                    value={caseData.returnToTheatreReason}
                  />
                </>
              ) : null}
              <DetailRow
                label="Discharge Outcome"
                value={
                  caseData.outcome
                    ? DISCHARGE_OUTCOME_LABELS[caseData.outcome]
                    : undefined
                }
              />
              {caseData.mortalityClassification ? (
                <DetailRow
                  label="Mortality Classification"
                  value={
                    MORTALITY_CLASSIFICATION_LABELS[
                      caseData.mortalityClassification
                    ]
                  }
                />
              ) : null}
              <DetailRow
                label="Discussed at MDM"
                value={caseData.discussedAtMDM ? "Yes" : undefined}
              />
              <DetailRow
                label="Recurrence Date"
                value={formatDateDisplay(caseData.recurrenceDate)}
              />
            </View>
          </>
        ) : null}

        <SectionHeader title="30-Day Complication Review" />
        {isPending30DayReview ? (
          <View
            style={[
              styles.reviewCard,
              {
                backgroundColor: theme.warning + "15",
                borderColor: theme.warning,
              },
            ]}
          >
            <View style={styles.reviewHeader}>
              <Feather name="clock" size={20} color={theme.warning} />
              <ThemedText
                style={[styles.reviewTitle, { color: theme.warning }]}
              >
                Review Due ({daysSinceProcedure} days post-op)
              </ThemedText>
            </View>
            <ThemedText
              style={[styles.reviewSubtext, { color: theme.textSecondary }]}
            >
              Document any complications within 30 days of surgery for audit
              compliance.
            </ThemedText>

            {showComplicationForm ? (
              <View style={styles.complicationForm}>
                <ThemedText style={styles.formLabel}>
                  Complication Description
                </ThemedText>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: theme.backgroundDefault,
                      borderColor: theme.border,
                      color: theme.text,
                    },
                  ]}
                  value={complicationDescription}
                  onChangeText={setComplicationDescription}
                  placeholder="Describe the complication..."
                  placeholderTextColor={theme.textTertiary}
                  multiline
                  numberOfLines={3}
                />

                <ThemedText style={styles.formLabel}>
                  Clavien-Dindo Grade
                </ThemedText>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.gradeScroll}
                >
                  {(Object.keys(CLAVIEN_DINDO_LABELS) as ClavienDindoGrade[])
                    .filter((g) => g !== "none")
                    .map((grade) => (
                      <Pressable
                        key={grade}
                        onPress={() => setComplicationGrade(grade)}
                        style={[
                          styles.gradeChip,
                          {
                            backgroundColor:
                              complicationGrade === grade
                                ? theme.link
                                : theme.backgroundDefault,
                            borderColor:
                              complicationGrade === grade
                                ? theme.link
                                : theme.border,
                          },
                        ]}
                      >
                        <ThemedText
                          style={[
                            styles.gradeChipText,
                            {
                              color:
                                complicationGrade === grade
                                  ? theme.buttonText
                                  : theme.text,
                            },
                          ]}
                        >
                          {grade}
                        </ThemedText>
                      </Pressable>
                    ))}
                </ScrollView>
                <ThemedText
                  style={[
                    styles.gradeDescription,
                    { color: theme.textSecondary },
                  ]}
                >
                  {CLAVIEN_DINDO_LABELS[complicationGrade]}
                </ThemedText>

                <ThemedText style={styles.formLabel}>
                  Management Notes (optional)
                </ThemedText>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: theme.backgroundDefault,
                      borderColor: theme.border,
                      color: theme.text,
                    },
                  ]}
                  value={complicationNotes}
                  onChangeText={setComplicationNotes}
                  placeholder="How was this managed?"
                  placeholderTextColor={theme.textTertiary}
                  multiline
                  numberOfLines={2}
                />

                <View style={styles.formActions}>
                  <Pressable
                    onPress={() => setShowComplicationForm(false)}
                    style={[styles.cancelButton, { borderColor: theme.border }]}
                  >
                    <ThemedText>Cancel</ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={handleSaveComplication}
                    disabled={savingComplication}
                    style={[styles.saveButton, { backgroundColor: theme.link }]}
                  >
                    <ThemedText style={{ color: theme.buttonText }}>
                      {savingComplication ? "Saving..." : "Save Complication"}
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.reviewActions}>
                <Pressable
                  onPress={() => setShowComplicationForm(true)}
                  style={[
                    styles.addComplicationButton,
                    { borderColor: theme.warning },
                  ]}
                >
                  <Feather
                    name="alert-triangle"
                    size={16}
                    color={theme.warning}
                  />
                  <ThemedText
                    style={{ color: theme.warning, fontWeight: "600" }}
                  >
                    Add Complication
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={handleMarkNoComplications}
                  style={[
                    styles.noComplicationsButton,
                    { backgroundColor: theme.success },
                  ]}
                >
                  <Feather name="check" size={16} color={theme.buttonText} />
                  <ThemedText
                    style={{ color: theme.buttonText, fontWeight: "600" }}
                  >
                    No Complications
                  </ThemedText>
                </Pressable>
              </View>
            )}

            {/* ── 30-Day Outcomes (RACS MALT audit) ─────────────── */}
            <View style={styles.auditSection}>
              <ThemedText
                style={[styles.auditSectionTitle, { color: theme.text }]}
              >
                30-Day Outcomes
              </ThemedText>

              <Pressable
                style={styles.auditCheckboxRow}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  const next = !auditReadmission;
                  setAuditReadmission(next);
                  if (!next) setAuditReadmissionReason("no");
                }}
              >
                <View
                  style={[
                    styles.auditCheckbox,
                    {
                      backgroundColor: auditReadmission
                        ? theme.warning + "20"
                        : theme.backgroundDefault,
                      borderColor: auditReadmission
                        ? theme.warning
                        : theme.border,
                    },
                  ]}
                >
                  {auditReadmission ? (
                    <Feather name="check" size={14} color={theme.warning} />
                  ) : null}
                </View>
                <ThemedText style={styles.auditCheckboxLabel}>
                  Unplanned Readmission (within 28 days)
                </ThemedText>
              </Pressable>

              {auditReadmission ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.auditChipScroll}
                >
                  {Object.entries(UNPLANNED_READMISSION_LABELS)
                    .filter(([v]) => v !== "no")
                    .map(([value, label]) => (
                      <Pressable
                        key={value}
                        onPress={() => setAuditReadmissionReason(value)}
                        style={[
                          styles.gradeChip,
                          {
                            backgroundColor:
                              auditReadmissionReason === value
                                ? theme.link
                                : theme.backgroundDefault,
                            borderColor:
                              auditReadmissionReason === value
                                ? theme.link
                                : theme.border,
                          },
                        ]}
                      >
                        <ThemedText
                          style={[
                            styles.gradeChipText,
                            {
                              color:
                                auditReadmissionReason === value
                                  ? theme.buttonText
                                  : theme.text,
                            },
                          ]}
                        >
                          {label.replace("Yes - ", "")}
                        </ThemedText>
                      </Pressable>
                    ))}
                </ScrollView>
              ) : null}

              <View style={styles.auditPickerRow}>
                <ThemedText style={styles.auditPickerLabel}>
                  Unplanned ICU:
                </ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {Object.entries(UNPLANNED_ICU_LABELS).map(
                    ([value, label]) => (
                      <Pressable
                        key={value}
                        onPress={() => setAuditICU(value)}
                        style={[
                          styles.gradeChip,
                          {
                            backgroundColor:
                              auditICU === value
                                ? theme.link
                                : theme.backgroundDefault,
                            borderColor:
                              auditICU === value ? theme.link : theme.border,
                          },
                        ]}
                      >
                        <ThemedText
                          style={[
                            styles.gradeChipText,
                            {
                              color:
                                auditICU === value
                                  ? theme.buttonText
                                  : theme.text,
                            },
                          ]}
                        >
                          {label}
                        </ThemedText>
                      </Pressable>
                    ),
                  )}
                </ScrollView>
              </View>

              <Pressable
                style={styles.auditCheckboxRow}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  const next = !auditReturnToTheatre;
                  setAuditReturnToTheatre(next);
                  if (!next) setAuditReturnReason("");
                }}
              >
                <View
                  style={[
                    styles.auditCheckbox,
                    {
                      backgroundColor: auditReturnToTheatre
                        ? theme.error + "20"
                        : theme.backgroundDefault,
                      borderColor: auditReturnToTheatre
                        ? theme.error
                        : theme.border,
                    },
                  ]}
                >
                  {auditReturnToTheatre ? (
                    <Feather name="check" size={14} color={theme.error} />
                  ) : null}
                </View>
                <ThemedText style={styles.auditCheckboxLabel}>
                  Unplanned Return to Theatre
                </ThemedText>
              </Pressable>

              {auditReturnToTheatre ? (
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: theme.backgroundDefault,
                      borderColor: theme.border,
                      color: theme.text,
                      marginTop: Spacing.xs,
                    },
                  ]}
                  value={auditReturnReason}
                  onChangeText={setAuditReturnReason}
                  placeholder="Reason for return..."
                  placeholderTextColor={theme.textTertiary}
                />
              ) : null}
            </View>
          </View>
        ) : caseData.complicationsReviewed ? (
          <View
            style={[styles.card, { backgroundColor: theme.backgroundDefault }]}
          >
            <View style={styles.reviewedRow}>
              <Feather
                name={
                  caseData.hasComplications ? "alert-circle" : "check-circle"
                }
                size={20}
                color={
                  caseData.hasComplications ? theme.warning : theme.success
                }
              />
              <ThemedText style={styles.reviewedText}>
                {caseData.hasComplications
                  ? `${caseData.complications?.length || 0} complication(s) documented`
                  : "No complications"}
              </ThemedText>
            </View>
            {caseData.complicationsReviewedAt ? (
              <ThemedText
                style={[styles.reviewedDate, { color: theme.textSecondary }]}
              >
                Reviewed {formatDateDisplay(caseData.complicationsReviewedAt)}
              </ThemedText>
            ) : null}

            {caseData.complications && caseData.complications.length > 0 ? (
              <View style={styles.complicationsList}>
                {caseData.complications.map((comp) => (
                  <View
                    key={comp.id}
                    style={[
                      styles.complicationItem,
                      { borderColor: theme.border },
                    ]}
                  >
                    <View style={styles.complicationHeader}>
                      <ThemedText style={styles.complicationDescription}>
                        {comp.description}
                      </ThemedText>
                      {comp.clavienDindoGrade ? (
                        <View
                          style={[
                            styles.gradeBadge,
                            { backgroundColor: theme.warning + "20" },
                          ]}
                        >
                          <ThemedText
                            style={[
                              styles.gradeBadgeText,
                              { color: theme.warning },
                            ]}
                          >
                            {comp.clavienDindoGrade}
                          </ThemedText>
                        </View>
                      ) : null}
                    </View>
                    {comp.managementNotes ? (
                      <ThemedText
                        style={[
                          styles.complicationNotes,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {comp.managementNotes}
                      </ThemedText>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}

            {!caseData.hasComplications ? (
              <Pressable
                onPress={() => setShowComplicationForm(true)}
                style={styles.addLaterButton}
              >
                <Feather name="plus" size={14} color={theme.link} />
                <ThemedText
                  style={[styles.addLaterText, { color: theme.link }]}
                >
                  Add a complication
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View
            style={[styles.card, { backgroundColor: theme.backgroundDefault }]}
          >
            <ThemedText
              style={[styles.pendingText, { color: theme.textSecondary }]}
            >
              {daysSinceProcedure < 30
                ? `Review available in ${30 - daysSinceProcedure} days`
                : "Review status unknown"}
            </ThemedText>
          </View>
        )}

        <SectionHeader title="Timeline" />
        <WoundDimensionChart events={timelineEvents} />
        {timelineEvents.length === 0 ? (
          <View
            style={[
              styles.emptyTimeline,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <Feather name="calendar" size={32} color={theme.textTertiary} />
            <ThemedText
              style={[styles.emptyTimelineText, { color: theme.textSecondary }]}
            >
              No timeline events yet
            </ThemedText>
          </View>
        ) : (
          <View
            style={[styles.card, { backgroundColor: theme.backgroundDefault }]}
          >
            {timelineEvents.map((event) => {
              if (
                event.eventType === "wound_assessment" &&
                event.woundAssessmentData
              ) {
                return (
                  <View key={event.id}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "flex-end",
                        gap: 8,
                        paddingRight: Spacing.md,
                        paddingTop: Spacing.sm,
                      }}
                    >
                      <Pressable
                        onPress={() => handleEditEvent(event)}
                        hitSlop={8}
                        style={{ padding: 4 }}
                      >
                        <Feather
                          name="edit-2"
                          size={14}
                          color={theme.textTertiary}
                        />
                      </Pressable>
                      <Pressable
                        onPress={() => handleDeleteEvent(event)}
                        hitSlop={8}
                        style={{ padding: 4 }}
                      >
                        <Feather name="trash-2" size={14} color={theme.error} />
                      </Pressable>
                    </View>
                    <WoundAssessmentCard
                      data={event.woundAssessmentData}
                      createdAt={event.createdAt}
                    />
                  </View>
                );
              }
              return (
                <View key={event.id} style={styles.timelineEvent}>
                  <View
                    style={[
                      styles.timelineDot,
                      {
                        backgroundColor: getEventTypeColor(
                          event.eventType,
                          theme,
                        ),
                      },
                    ]}
                  />
                  <View style={styles.timelineContent}>
                    <View style={styles.eventHeader}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          flex: 1,
                          flexWrap: "wrap",
                        }}
                      >
                        <View
                          style={[
                            styles.eventTypeBadge,
                            {
                              backgroundColor:
                                getEventTypeColor(event.eventType, theme) +
                                "20",
                            },
                          ]}
                        >
                          <Feather
                            name={getEventTypeIcon(event.eventType)}
                            size={12}
                            color={getEventTypeColor(event.eventType, theme)}
                          />
                          <ThemedText
                            style={[
                              styles.eventTypeBadgeText,
                              {
                                color: getEventTypeColor(
                                  event.eventType,
                                  theme,
                                ),
                              },
                            ]}
                          >
                            {TIMELINE_EVENT_TYPE_LABELS[event.eventType] ||
                              event.eventType}
                          </ThemedText>
                        </View>
                        {event.followUpInterval ? (
                          <ThemedText
                            style={[
                              styles.intervalBadge,
                              { color: theme.textSecondary },
                            ]}
                          >
                            {FOLLOW_UP_INTERVAL_LABELS[event.followUpInterval]}
                          </ThemedText>
                        ) : null}
                        {event.clinicalContext === "discharge" ? (
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 4,
                              backgroundColor: theme.success + "20",
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 10,
                            }}
                          >
                            <Feather
                              name="log-out"
                              size={10}
                              color={theme.success}
                            />
                            <ThemedText
                              style={{
                                fontSize: 11,
                                color: theme.success,
                                fontWeight: "500",
                              }}
                            >
                              Discharge
                            </ThemedText>
                          </View>
                        ) : null}
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Pressable
                          onPress={() => handleEditEvent(event)}
                          hitSlop={8}
                          style={{ padding: 4 }}
                        >
                          <Feather
                            name="edit-2"
                            size={14}
                            color={theme.textTertiary}
                          />
                        </Pressable>
                        <Pressable
                          onPress={() => handleDeleteEvent(event)}
                          hitSlop={8}
                          style={{ padding: 4 }}
                        >
                          <Feather
                            name="trash-2"
                            size={14}
                            color={theme.error}
                          />
                        </Pressable>
                      </View>
                    </View>

                    {(event.mediaAttachments?.length ?? 0) > 0 ? (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.mediaThumbnails}
                        contentContainerStyle={styles.mediaThumbnailsContent}
                      >
                        {event.mediaAttachments?.map((media) => (
                          <EncryptedImage
                            key={media.id}
                            uri={media.localUri}
                            style={styles.mediaThumbnail}
                            resizeMode="cover"
                            onError={() =>
                              console.warn(
                                "Media file missing:",
                                media.localUri,
                              )
                            }
                          />
                        ))}
                      </ScrollView>
                    ) : null}

                    {event.promData ? (
                      <View
                        style={[
                          styles.promDataCard,
                          { backgroundColor: theme.backgroundRoot },
                        ]}
                      >
                        <ThemedText
                          style={[
                            styles.promQuestionnaire,
                            { color: theme.textSecondary },
                          ]}
                        >
                          {
                            PROM_QUESTIONNAIRE_LABELS[
                              event.promData.questionnaire
                            ]
                          }
                        </ThemedText>
                        <ThemedText
                          style={[styles.promScore, { color: theme.link }]}
                        >
                          Score: {event.promData.score}
                        </ThemedText>
                      </View>
                    ) : null}

                    {event.complicationData ? (
                      <View
                        style={[
                          styles.complicationDataCard,
                          { backgroundColor: theme.error + "10" },
                        ]}
                      >
                        <ThemedText style={styles.complicationDesc}>
                          {event.complicationData.description}
                        </ThemedText>
                        {event.complicationData.clavienDindoGrade &&
                        event.complicationData.clavienDindoGrade !== "none" ? (
                          <ThemedText
                            style={[
                              styles.complicationGrade,
                              { color: theme.error },
                            ]}
                          >
                            {
                              CLAVIEN_DINDO_LABELS[
                                event.complicationData.clavienDindoGrade
                              ]
                            }
                          </ThemedText>
                        ) : null}
                      </View>
                    ) : null}

                    {event.note ? (
                      <ThemedText
                        style={[
                          styles.eventNote,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {event.note}
                      </ThemedText>
                    ) : null}
                    <ThemedText
                      style={[styles.eventDate, { color: theme.textTertiary }]}
                    >
                      {new Date(event.createdAt).toLocaleDateString()}
                      {event.updatedAt ? " (edited)" : ""}
                    </ThemedText>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.dangerZone}>
          <Pressable
            onPress={handleDelete}
            style={[styles.deleteButton, { borderColor: theme.error }]}
          >
            <Feather name="trash-2" size={18} color={theme.error} />
            <ThemedText style={[styles.deleteText, { color: theme.error }]}>
              Delete Case
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>

      <Pressable
        onPress={handleAddEvent}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: theme.link,
            bottom: insets.bottom + Spacing.lg,
            transform: [{ scale: pressed ? 0.95 : 1 }],
          },
        ]}
      >
        <Feather name="plus" size={24} color={theme.buttonText} />
        <ThemedText style={[styles.fabText, { color: theme.buttonText }]}>
          Add Event
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  headerMenuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  heroCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    ...Shadows.card,
  },
  heroBadges: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    flexWrap: "wrap",
  },
  procedureType: {
    marginBottom: Spacing.md,
  },
  codeCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  codeLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  codeValue: {
    fontSize: 13,
    fontWeight: "500",
  },
  heroMeta: {
    gap: Spacing.sm,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  metaText: {
    fontSize: 14,
  },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    ...Shadows.card,
  },
  timingRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  timingItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  timingLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  timingValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  detailLabel: {
    fontSize: 14,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },
  diagnosisItem: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  diagnosisLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  diagnosisValue: {
    fontSize: 15,
    fontWeight: "500",
  },
  snomedCode: {
    fontSize: 11,
    marginTop: Spacing.xs,
  },
  comorbidityList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  comorbidityChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  comorbidityText: {
    fontSize: 12,
    fontWeight: "500",
  },
  teamMember: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  memberInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  memberName: {
    fontSize: 15,
    fontWeight: "500",
  },
  memberRole: {
    fontSize: 13,
  },
  consultantName: {
    fontSize: 15,
    fontWeight: "500",
    padding: Spacing.md,
  },
  emptyTimeline: {
    padding: Spacing["2xl"],
    borderRadius: BorderRadius.md,
    alignItems: "center",
    gap: Spacing.md,
  },
  emptyTimelineText: {
    fontSize: 14,
  },
  timelineEvent: {
    flexDirection: "row",
    paddingVertical: Spacing.md,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
    marginRight: Spacing.md,
  },
  timelineContent: {
    flex: 1,
  },
  eventType: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  eventNote: {
    fontSize: 14,
    marginBottom: Spacing.xs,
  },
  eventDate: {
    fontSize: 12,
  },
  dangerZone: {
    marginTop: Spacing["3xl"],
    paddingTop: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
  },
  deleteText: {
    fontSize: 15,
    fontWeight: "500",
  },
  fab: {
    position: "absolute",
    right: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    ...Shadows.floating,
  },
  fabText: {
    fontSize: 15,
    fontWeight: "600",
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  groupDiagnosisLabel: {
    fontSize: 14,
    flex: 1,
  },
  procedureCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  procedureHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  procedureNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  procedureNumberText: {
    fontSize: 14,
    fontWeight: "700",
  },
  procedureInfo: {
    flex: 1,
  },
  procedureName: {
    fontSize: 16,
    fontWeight: "600",
  },
  procedureSpecialty: {
    fontSize: 13,
    marginTop: 2,
  },
  procedureSnomedRow: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  procedureSnomedLabel: {
    fontSize: 11,
  },
  procedureSnomedDisplay: {
    fontSize: 13,
    marginTop: 2,
  },
  procedureNotes: {
    fontSize: 13,
    marginTop: Spacing.sm,
    fontStyle: "italic",
  },
  procedureClinicalDetails: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  anastomosesList: {
    marginTop: Spacing.xs,
  },
  anastomosesTitle: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: Spacing.xs,
  },
  anastomosisItem: {
    fontSize: 13,
    marginLeft: Spacing.sm,
    marginBottom: 2,
  },
  reviewCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  reviewSubtext: {
    fontSize: 13,
    marginBottom: Spacing.lg,
  },
  complicationForm: {
    marginTop: Spacing.md,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: "top",
  },
  gradeScroll: {
    marginVertical: Spacing.sm,
  },
  gradeChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginRight: Spacing.sm,
  },
  gradeChipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  gradeDescription: {
    fontSize: 12,
    marginBottom: Spacing.md,
  },
  formActions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
  },
  saveButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  reviewActions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  addComplicationButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  noComplicationsButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  reviewedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  reviewedText: {
    fontSize: 15,
    fontWeight: "500",
  },
  reviewedDate: {
    fontSize: 13,
    marginTop: Spacing.xs,
    marginLeft: 28,
  },
  auditSection: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(128,128,128,0.2)",
  },
  auditSectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  auditCheckboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  auditCheckbox: {
    width: 22,
    height: 22,
    borderRadius: BorderRadius.xs,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  auditCheckboxLabel: {
    fontSize: 14,
    flex: 1,
  },
  auditChipScroll: {
    marginVertical: Spacing.xs,
  },
  auditPickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  auditPickerLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  complicationsList: {
    marginTop: Spacing.md,
  },
  complicationItem: {
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    marginTop: Spacing.sm,
  },
  complicationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  complicationDescription: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  gradeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  gradeBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  complicationNotes: {
    fontSize: 13,
    marginTop: Spacing.xs,
    fontStyle: "italic",
  },
  addLaterButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  addLaterText: {
    fontSize: 13,
    fontWeight: "500",
  },
  pendingText: {
    fontSize: 14,
    textAlign: "center",
  },
  eventHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  eventTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  eventTypeBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  intervalBadge: {
    fontSize: 11,
    fontWeight: "500",
  },
  mediaThumbnails: {
    marginVertical: Spacing.sm,
  },
  mediaThumbnailsContent: {
    gap: Spacing.xs,
  },
  mediaThumbnail: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.sm,
  },
  promDataCard: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginVertical: Spacing.xs,
  },
  promQuestionnaire: {
    fontSize: 11,
    fontWeight: "500",
  },
  promScore: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 2,
  },
  complicationDataCard: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginVertical: Spacing.xs,
  },
  complicationDesc: {
    fontSize: 13,
    fontWeight: "500",
  },
  complicationGrade: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
  },
  mediaGalleryContainer: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  mediaItem: {
    width: 140,
    height: 140,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    position: "relative",
  },
  mediaImage: {
    width: "100%",
    height: "100%",
  },
  mediaTypeBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  mediaTypeBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
  },
  mediaCaptionOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  mediaCaptionText: {
    fontSize: 11,
    color: "#fff",
  },
  histologyButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  histologyButtonText: {
    flex: 1,
  },
  histologyButtonTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  histologyButtonSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  handInfectionSummary: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  handInfectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  handInfectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  handInfectionFields: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  handInfectionField: {
    fontSize: 13,
  },
});
