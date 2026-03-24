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
} from "@/lib/teamContactsApi";
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
  const route =
    useRoute<RouteProp<RootStackParamList, "AddEditTeamContact">>();
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
  const [linkedUserId, setLinkedUserId] = useState<string | null>(null);
  const [invitationSentAt, setInvitationSentAt] = useState<string | null>(null);
  const [sendingInvite, setSendingInvite] = useState(false);

  const careerStages = useMemo(
    () => getCareerStagesForCountry(profile?.countryOfPractice ?? null),
    [profile?.countryOfPractice],
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
        setCareerStage(contact.careerStage ?? null);
        setDefaultRole(
          (contact.defaultRole as TeamMemberOperativeRole) ?? null,
        );
        setNotes(contact.notes ?? "");
        setSelectedFacilityIds(
          (contact.facilityIds as string[]) ?? [],
        );
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
    setSaving(true);
    try {
      const data = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        careerStage,
        defaultRole,
        notes: notes.trim() || null,
        facilityIds: selectedFacilityIds,
      };
      if (isEdit && contactId) {
        await updateTeamContact(contactId, data);
      } else {
        await createTeamContact(data);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to save contact",
      );
    } finally {
      setSaving(false);
    }
  }, [
    firstName,
    lastName,
    email,
    phone,
    careerStage,
    defaultRole,
    notes,
    selectedFacilityIds,
    isEdit,
    contactId,
    navigation,
  ]);

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
        style={[
          styles.centered,
          { backgroundColor: theme.backgroundRoot },
        ]}
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

        {/* Contact info */}
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
          Email
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
          value={email}
          onChangeText={setEmail}
          placeholder="email@example.com"
          placeholderTextColor={theme.textTertiary}
          keyboardType="email-address"
          autoCapitalize="none"
          testID="teamContact.input-email"
        />

        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
          Phone
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
          value={phone}
          onChangeText={setPhone}
          placeholder="+64 21 123 4567"
          placeholderTextColor={theme.textTertiary}
          keyboardType="phone-pad"
          testID="teamContact.input-phone"
        />

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
                      ? theme.link + "15"
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
                      color: isSelected
                        ? theme.link
                        : theme.textSecondary,
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
                      ? theme.link + "15"
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
            <ThemedText
              style={[styles.label, { color: theme.textSecondary }]}
            >
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
                          ? theme.link + "15"
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
            <ThemedText style={[styles.inviteButtonText, { color: theme.link }]}>
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
