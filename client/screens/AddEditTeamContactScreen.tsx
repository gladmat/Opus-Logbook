import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import {
  getTeamContact,
  createTeamContact,
  updateTeamContact,
  deleteTeamContact,
  sendInvitation,
  unlinkContact,
} from "@/lib/teamContactsApi";
import { promptLinkContact } from "@/lib/linkingPrompts";
import { getDefaultPhoneRegion } from "@shared/phone";
import {
  PROFESSIONAL_REGISTRATION_OPTIONS,
  getRegistrationJurisdictionForCountry,
} from "@shared/professionalRegistrations";
import {
  markDiscoveryStale,
  removeDiscoveryMatch,
} from "@/lib/discoveryService";
import { hasLinkIdentifier } from "@/lib/contactIdentifiers";
import {
  buildContactSavePayload,
  contactIdentifierKey,
} from "@/lib/teamContactForm";
import { getCareerStagesForCountry } from "@shared/careerStages";
import {
  TEAM_MEMBER_ROLE_LABELS,
  type TeamMemberOperativeRole,
} from "@/types/teamContacts";
import * as Haptics from "expo-haptics";

const ROLES: TeamMemberOperativeRole[] = ["PS", "FA", "SS", "US", "SA"];

export default function AddEditTeamContactScreen() {
  const { theme } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "AddEditTeamContact">>();
  const contactId = route.params?.contactId;
  const isEdit = !!contactId;

  const { profile, facilities } = useAuth();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [careerStage, setCareerStage] = useState<string | null>(null);
  const [defaultRole, setDefaultRole] =
    useState<TeamMemberOperativeRole | null>(null);
  const [notes, setNotes] = useState("");
  const [selectedFacilityIds, setSelectedFacilityIds] = useState<string[]>([]);
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [registrationJurisdiction, setRegistrationJurisdiction] = useState<
    string | null
  >(null);
  const [linkedUserId, setLinkedUserId] = useState<string | null>(null);
  const [linkedDisplayName, setLinkedDisplayName] = useState<string | null>(
    null,
  );
  const [unlinking, setUnlinking] = useState(false);
  const [invitationSentAt, setInvitationSentAt] = useState<string | null>(null);
  const [sendingInvite, setSendingInvite] = useState(false);
  /**
   * Fingerprint of the identifiers as originally loaded — the link prompt
   * re-offers (and the discovery throttle resets) only when it changes.
   */
  const [initialIdentifierKey, setInitialIdentifierKey] = useState("||");

  const phoneRegion = getDefaultPhoneRegion(profile?.countryOfPractice);
  const isLinked = !!linkedUserId;

  const careerStages = useMemo(
    () => getCareerStagesForCountry(profile?.countryOfPractice ?? null),
    [profile?.countryOfPractice],
  );

  const selectedJurisdiction = useMemo(
    () =>
      PROFESSIONAL_REGISTRATION_OPTIONS.find(
        (o) => o.id === registrationJurisdiction,
      ),
    [registrationJurisdiction],
  );

  // Load existing contact in edit mode
  useEffect(() => {
    if (!contactId) return;
    let cancelled = false;
    (async () => {
      try {
        const contact = await getTeamContact(contactId);
        if (cancelled) return;
        setFirstName(contact.firstName);
        setLastName(contact.lastName);
        setEmail(contact.email ?? "");
        setPhone(contact.phone ?? "");
        setRegistrationNumber(contact.registrationNumber ?? "");
        setRegistrationJurisdiction(contact.registrationJurisdiction ?? null);
        setInitialIdentifierKey(contactIdentifierKey(contact));
        setLinkedDisplayName(contact.linkedDisplayName ?? null);
        setCareerStage(contact.careerStage ?? null);
        setDefaultRole(
          (contact.defaultRole as TeamMemberOperativeRole) ?? null,
        );
        setNotes(contact.notes ?? "");
        setSelectedFacilityIds((contact.facilityIds as string[]) ?? []);
        setLinkedUserId(contact.linkedUserId ?? null);
        setInvitationSentAt(contact.invitationSentAt ?? null);
      } catch {
        Alert.alert("Error", "Failed to load contact");
        navigation.goBack();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contactId, navigation]);

  const handleSave = useCallback(async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert("Required", "First name and last name are required.");
      return;
    }
    const plan = buildContactSavePayload(
      {
        firstName,
        lastName,
        email,
        phone,
        registrationNumber,
        registrationJurisdiction,
        careerStage,
        defaultRole,
        notes,
        facilityIds: selectedFacilityIds,
      },
      { linked: isLinked, region: phoneRegion },
    );
    if (!plan.ok) {
      if (plan.problem === "phone") {
        Alert.alert(
          "Check phone number",
          "Include the country code, e.g. +64 21 123 4567.",
        );
      } else {
        Alert.alert(
          "Registration jurisdiction",
          "Choose the jurisdiction that issued this registration number.",
        );
      }
      return;
    }

    setSaving(true);
    let saved;
    try {
      saved =
        isEdit && contactId
          ? await updateTeamContact(contactId, plan.data)
          : await createTeamContact(plan.data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to save contact",
      );
      setSaving(false);
      return;
    }
    // Spinner off BEFORE the prompt chain — the alerts used to sit on top
    // of a still-spinning Save button.
    setSaving(false);

    // The user just typed a colleague's identifiers — look them up on Opus
    // and offer a one-tap link. Only on create or when an identifier
    // changed, so a declined offer isn't re-nagged on unrelated edits.
    const identifiersChanged =
      contactIdentifierKey(saved, phoneRegion) !== initialIdentifierKey;
    if (!saved.linkedUserId && identifiersChanged) {
      // Backstop for the background discovery job: a new/changed identifier
      // on an unlinked contact resets the 24h throttle, and any cached match
      // for the OLD identifiers is void.
      void markDiscoveryStale();
      if (isEdit) void removeDiscoveryMatch(saved.id);
    }
    if (
      !saved.linkedUserId &&
      hasLinkIdentifier(saved) &&
      (identifiersChanged || !isEdit)
    ) {
      try {
        await promptLinkContact(saved, profile?.userId, phoneRegion);
      } catch {
        // The link prompt must never block leaving the screen.
      }
    }
    navigation.goBack();
  }, [
    firstName,
    lastName,
    email,
    phone,
    registrationNumber,
    registrationJurisdiction,
    careerStage,
    defaultRole,
    notes,
    selectedFacilityIds,
    isEdit,
    isLinked,
    contactId,
    navigation,
    initialIdentifierKey,
    phoneRegion,
    profile?.userId,
  ]);

  const handleUnlink = useCallback(() => {
    if (!contactId || !linkedUserId) return;
    const who = linkedDisplayName ?? "this Opus account";
    Alert.alert(
      `Unlink from ${who}?`,
      "They'll stop receiving cases you tag them on from your next save. Already-shared cases stay shared. You can link again later.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unlink",
          style: "destructive",
          onPress: async () => {
            setUnlinking(true);
            try {
              const updated = await unlinkContact(contactId);
              setLinkedUserId(null);
              setLinkedDisplayName(null);
              setInitialIdentifierKey(
                contactIdentifierKey(updated, phoneRegion),
              );
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
            } catch (err) {
              Alert.alert(
                "Unlink failed",
                err instanceof Error ? err.message : "Please try again.",
              );
            } finally {
              setUnlinking(false);
            }
          },
        },
      ],
    );
  }, [contactId, linkedUserId, linkedDisplayName, phoneRegion]);

  const handleRegistrationNumberChange = useCallback(
    (value: string) => {
      setRegistrationNumber(value);
      // First keystroke with no jurisdiction chosen → default to the
      // owner's own country (most colleagues share it), else "other".
      if (value.trim() && !registrationJurisdiction) {
        setRegistrationJurisdiction(
          getRegistrationJurisdictionForCountry(profile?.countryOfPractice) ??
            "other",
        );
      }
    },
    [registrationJurisdiction, profile?.countryOfPractice],
  );

  const handleDelete = useCallback(() => {
    if (!contactId) return;
    Alert.alert(
      "Delete Contact",
      "This will remove the contact from your operative team. Already-saved cases are not affected.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteTeamContact(contactId);
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              navigation.goBack();
            } catch {
              Alert.alert("Error", "Failed to delete contact");
            }
          },
        },
      ],
    );
  }, [contactId, navigation]);

  const toggleFacility = useCallback((facilityId: string) => {
    setSelectedFacilityIds((prev) =>
      prev.includes(facilityId)
        ? prev.filter((id) => id !== facilityId)
        : [...prev, facilityId],
    );
  }, []);

  if (loading) {
    return (
      <View
        style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}
      >
        <ActivityIndicator size="large" color={theme.link} />
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      testID="screen-addEditTeamContact"
    >
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={styles.scrollContent}
      >
        {/* Linked state — identifiers are locked while linked */}
        {isLinked && (
          <View
            style={[
              styles.linkedCard,
              {
                backgroundColor: theme.successSurface,
                borderColor: theme.successBorder,
              },
            ]}
            testID="teamContact.card-linked"
          >
            <View style={styles.linkedCardHeader}>
              <Feather name="link" size={16} color={theme.success} />
              <ThemedText
                style={[styles.linkedCardTitle, { color: theme.text }]}
                numberOfLines={1}
              >
                Linked to {linkedDisplayName ?? "an Opus account"}
              </ThemedText>
            </View>
            <ThemedText
              style={[styles.linkedCardBody, { color: theme.textSecondary }]}
            >
              Cases you tag them on are shared securely. Email, phone and
              registration are locked while linked.
            </ThemedText>
            <Pressable
              style={styles.unlinkButton}
              onPress={handleUnlink}
              disabled={unlinking}
              accessibilityRole="button"
              accessibilityLabel="Unlink contact"
              testID="teamContact.btn-unlink"
            >
              {unlinking ? (
                <ActivityIndicator size="small" color={theme.error} />
              ) : (
                <ThemedText
                  style={[styles.unlinkButtonText, { color: theme.error }]}
                >
                  Unlink
                </ThemedText>
              )}
            </Pressable>
          </View>
        )}

        {/* Name */}
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
          First Name *
        </ThemedText>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.backgroundElevated,
              borderColor: theme.border,
              color: theme.text,
            },
          ]}
          value={firstName}
          onChangeText={setFirstName}
          placeholder="First name"
          placeholderTextColor={theme.textTertiary}
          testID="teamContact.input-firstName"
        />

        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
          Last Name *
        </ThemedText>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.backgroundElevated,
              borderColor: theme.border,
              color: theme.text,
            },
          ]}
          value={lastName}
          onChangeText={setLastName}
          placeholder="Last name"
          placeholderTextColor={theme.textTertiary}
          testID="teamContact.input-lastName"
        />

        {/* Contact info — matched against Opus accounts */}
        <View style={styles.labelRow}>
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            Email
          </ThemedText>
          {isLinked && (
            <Feather name="lock" size={12} color={theme.textTertiary} />
          )}
        </View>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: isLinked
                ? theme.backgroundSecondary
                : theme.backgroundElevated,
              borderColor: theme.border,
              color: isLinked ? theme.textTertiary : theme.text,
            },
          ]}
          value={email}
          onChangeText={setEmail}
          editable={!isLinked}
          placeholder="email@example.com"
          placeholderTextColor={theme.textTertiary}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          testID="teamContact.input-email"
        />

        <View style={styles.labelRow}>
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            Phone
          </ThemedText>
          {isLinked && (
            <Feather name="lock" size={12} color={theme.textTertiary} />
          )}
        </View>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: isLinked
                ? theme.backgroundSecondary
                : theme.backgroundElevated,
              borderColor: theme.border,
              color: isLinked ? theme.textTertiary : theme.text,
            },
          ]}
          value={phone}
          onChangeText={setPhone}
          editable={!isLinked}
          placeholder="+64 21 123 4567"
          placeholderTextColor={theme.textTertiary}
          keyboardType="phone-pad"
          testID="teamContact.input-phone"
        />

        <View style={styles.labelRow}>
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            Registration
          </ThemedText>
          {isLinked && (
            <Feather name="lock" size={12} color={theme.textTertiary} />
          )}
        </View>
        <View style={styles.stageList}>
          {PROFESSIONAL_REGISTRATION_OPTIONS.map((option) => {
            const isSelected = registrationJurisdiction === option.id;
            return (
              <Pressable
                key={option.id}
                style={[
                  styles.stageChip,
                  {
                    backgroundColor: isSelected
                      ? theme.accentSurface
                      : theme.backgroundElevated,
                    borderColor: isSelected ? theme.link : theme.border,
                    opacity: isLinked ? 0.6 : 1,
                  },
                ]}
                disabled={isLinked}
                onPress={() => {
                  setRegistrationJurisdiction(isSelected ? null : option.id);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${option.label} registration`}
                testID={`teamContact.chip-jurisdiction-${option.id}`}
              >
                <ThemedText
                  style={[
                    styles.stageChipText,
                    { color: isSelected ? theme.link : theme.text },
                  ]}
                  numberOfLines={1}
                >
                  {option.id === "other" ? "Other" : option.authority}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
        <TextInput
          style={[
            styles.input,
            {
              marginTop: Spacing.sm,
              backgroundColor: isLinked
                ? theme.backgroundSecondary
                : theme.backgroundElevated,
              borderColor: theme.border,
              color: isLinked ? theme.textTertiary : theme.text,
            },
          ]}
          value={registrationNumber}
          onChangeText={handleRegistrationNumberChange}
          editable={!isLinked}
          placeholder={
            selectedJurisdiction?.placeholder ?? "Registration number"
          }
          placeholderTextColor={theme.textTertiary}
          autoCapitalize="characters"
          autoCorrect={false}
          testID="teamContact.input-registration"
        />
        {!isLinked && (
          <ThemedText style={[styles.hint, { color: theme.textTertiary }]}>
            Colleagues on Opus are matched by email, phone or registration.
          </ThemedText>
        )}

        {/* Default Role */}
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
          Default Role
        </ThemedText>
        <View style={styles.roleRow}>
          {ROLES.map((role) => {
            const isSelected = defaultRole === role;
            return (
              <Pressable
                key={role}
                style={[
                  styles.roleChip,
                  {
                    backgroundColor: isSelected
                      ? theme.accentSurface
                      : theme.backgroundElevated,
                    borderColor: isSelected ? theme.link : theme.border,
                  },
                ]}
                onPress={() => {
                  setDefaultRole(isSelected ? null : role);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                testID={`teamContact.chip-role-${role}`}
              >
                <ThemedText
                  style={[
                    styles.roleChipText,
                    { color: isSelected ? theme.link : theme.text },
                  ]}
                >
                  {role}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.roleChipLabel,
                    {
                      color: isSelected ? theme.link : theme.textSecondary,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {TEAM_MEMBER_ROLE_LABELS[role]}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {/* Career Stage */}
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
          Career Stage
        </ThemedText>
        <View style={styles.stageList}>
          {careerStages.map((stage) => {
            const isSelected = careerStage === stage.value;
            return (
              <Pressable
                key={stage.value}
                style={[
                  styles.stageChip,
                  {
                    backgroundColor: isSelected
                      ? theme.accentSurface
                      : theme.backgroundElevated,
                    borderColor: isSelected ? theme.link : theme.border,
                  },
                ]}
                onPress={() => {
                  setCareerStage(isSelected ? null : stage.value);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                testID={`teamContact.chip-stage-${stage.value}`}
              >
                <ThemedText
                  style={[
                    styles.stageChipText,
                    { color: isSelected ? theme.link : theme.text },
                  ]}
                  numberOfLines={1}
                >
                  {stage.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {/* Facilities */}
        {facilities.length > 0 && (
          <>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
              Facilities
            </ThemedText>
            <View style={styles.facilityList}>
              {facilities.map((f) => {
                const isSelected = selectedFacilityIds.includes(f.id);
                return (
                  <Pressable
                    key={f.id}
                    style={[
                      styles.facilityChip,
                      {
                        backgroundColor: isSelected
                          ? theme.accentSurface
                          : theme.backgroundElevated,
                        borderColor: isSelected ? theme.link : theme.border,
                      },
                    ]}
                    onPress={() => toggleFacility(f.id)}
                    testID={`teamContact.chip-facility-${f.id}`}
                  >
                    {isSelected && (
                      <Feather
                        name="check"
                        size={14}
                        color={theme.link}
                        style={{ marginRight: 4 }}
                      />
                    )}
                    <ThemedText
                      style={[
                        styles.facilityChipText,
                        { color: isSelected ? theme.link : theme.text },
                      ]}
                      numberOfLines={1}
                    >
                      {f.facilityName}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* Notes */}
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
          Notes
        </ThemedText>
        <TextInput
          style={[
            styles.input,
            styles.multilineInput,
            {
              backgroundColor: theme.backgroundElevated,
              borderColor: theme.border,
              color: theme.text,
            },
          ]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Optional notes"
          placeholderTextColor={theme.textTertiary}
          multiline
          numberOfLines={3}
          testID="teamContact.input-notes"
        />

        {/* Save */}
        <Pressable
          style={[
            styles.saveButton,
            { backgroundColor: theme.link, opacity: saving ? 0.6 : 1 },
          ]}
          onPress={handleSave}
          disabled={saving}
          testID="teamContact.btn-save"
        >
          {saving ? (
            <ActivityIndicator size="small" color={theme.buttonText} />
          ) : (
            <ThemedText
              style={[styles.saveButtonText, { color: theme.buttonText }]}
            >
              {isEdit ? "Save Changes" : "Add Contact"}
            </ThemedText>
          )}
        </Pressable>

        {/* Invite to Opus — unlinked contacts with email */}
        {isEdit && !linkedUserId && email.trim() && (
          <Pressable
            style={[
              styles.inviteButton,
              {
                borderColor: theme.link,
                opacity:
                  sendingInvite ||
                  (invitationSentAt &&
                    Date.now() - new Date(invitationSentAt).getTime() <
                      24 * 60 * 60 * 1000)
                    ? 0.5
                    : 1,
              },
            ]}
            disabled={
              sendingInvite ||
              (!!invitationSentAt &&
                Date.now() - new Date(invitationSentAt).getTime() <
                  24 * 60 * 60 * 1000)
            }
            onPress={async () => {
              if (!contactId) return;
              setSendingInvite(true);
              try {
                const result = await sendInvitation(contactId, email.trim());
                setInvitationSentAt(result.invitedAt);
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success,
                );
                Alert.alert("Invitation Sent", `Invitation sent to ${email}`);
              } catch (error) {
                Alert.alert(
                  "Error",
                  error instanceof Error
                    ? error.message
                    : "Failed to send invitation",
                );
              } finally {
                setSendingInvite(false);
              }
            }}
            testID="teamContact.btn-invite"
          >
            <Feather name="send" size={16} color={theme.link} />
            <ThemedText
              style={[styles.inviteButtonText, { color: theme.link }]}
            >
              {invitationSentAt ? "Invitation Sent" : "Invite to Opus"}
            </ThemedText>
          </Pressable>
        )}

        {/* Delete */}
        {isEdit && (
          <Pressable
            style={styles.deleteButton}
            onPress={handleDelete}
            testID="teamContact.btn-delete"
          >
            <ThemedText
              style={[styles.deleteButtonText, { color: theme.error }]}
            >
              Delete Contact
            </ThemedText>
          </Pressable>
        )}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 60,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  hint: {
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  linkedCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  linkedCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  linkedCardTitle: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  linkedCardBody: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: Spacing.xs,
  },
  unlinkButton: {
    alignSelf: "flex-start",
    minHeight: 44,
    justifyContent: "center",
    marginTop: Spacing.xs,
  },
  unlinkButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  multilineInput: {
    height: 80,
    paddingTop: Spacing.sm,
    textAlignVertical: "top",
  },
  roleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  roleChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
    minWidth: 60,
  },
  roleChipText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  roleChipLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  stageList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  stageChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  stageChipText: {
    fontSize: 14,
  },
  facilityList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  facilityChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  facilityChipText: {
    fontSize: 14,
  },
  saveButton: {
    height: 56,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.xl,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  inviteButton: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  inviteButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  deleteButton: {
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.md,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
});
