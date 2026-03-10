import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Alert, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { BorderRadius, Shadows, Spacing } from "@/constants/theme";
import { PROCEDURE_CATEGORIES } from "@/constants/procedureCategories";
import {
  ALL_SPECIALTIES,
  buildSurgicalPreferencesUpdate,
  getStoredSelectedSpecialties,
  normalizeSelectedSpecialties,
} from "@/lib/personalization";
import type { Specialty } from "@/types/case";
import {
  getAlwaysDeleteAfterImport,
  setAlwaysDeleteAfterImport,
} from "@/lib/smartImportPrefs";

function CategoryCard({
  label,
  selected,
  onPress,
  color,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  color: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: selected ? color : "transparent",
          backgroundColor: selected ? color + "12" : "transparent",
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <ThemedText
        style={[styles.cardLabel, selected && styles.cardLabelSelected]}
        numberOfLines={1}
      >
        {label}
      </ThemedText>
      {selected ? (
        <Feather name="check-circle" size={18} color={color} />
      ) : null}
    </Pressable>
  );
}

export default function PersonalisationScreen() {
  const { theme } = useTheme();
  const { profile, updateProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const initialSelection =
    getStoredSelectedSpecialties(profile) ?? ALL_SPECIALTIES;
  const [selected, setSelected] = useState<Set<Specialty>>(
    new Set(initialSelection),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [autoDeleteOriginals, setAutoDeleteOriginals] = useState(false);

  useEffect(() => {
    getAlwaysDeleteAfterImport().then(setAutoDeleteOriginals);
  }, []);

  const handleToggleAutoDelete = async (value: boolean) => {
    setAutoDeleteOriginals(value);
    await setAlwaysDeleteAfterImport(value);
    Haptics.selectionAsync();
  };

  const selectedCount = selected.size;
  const hasChanges =
    normalizeSelectedSpecialties(Array.from(selected)).join("|") !==
    initialSelection.join("|");

  const toggleSpecialty = (specialty: Specialty) => {
    Haptics.selectionAsync();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(specialty)) {
        if (next.size === 1) {
          return prev;
        }
        next.delete(specialty);
      } else {
        next.add(specialty);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    Haptics.selectionAsync();
    setSelected(new Set(ALL_SPECIALTIES));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        surgicalPreferences: buildSurgicalPreferencesUpdate(
          profile?.surgicalPreferences,
          {
            selectedSpecialties: normalizeSelectedSpecialties(
              Array.from(selected),
            ),
          },
        ),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert(
        "Unable to save",
        error?.message || "Please try again in a moment.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
    >
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.border,
          },
        ]}
      >
        <ThemedText style={styles.heroTitle}>Shown first in Opus</ThemedText>
        <ThemedText style={[styles.heroBody, { color: theme.textSecondary }]}>
          Your selected categories drive the Dashboard specialty filters and the
          Add Case specialty grid.
        </ThemedText>
        <View style={styles.heroMeta}>
          <ThemedText
            style={[styles.heroMetaText, { color: theme.textSecondary }]}
          >
            {selectedCount} categories selected
          </ThemedText>
          <Pressable onPress={handleSelectAll}>
            <ThemedText style={[styles.heroLink, { color: theme.link }]}>
              Select all
            </ThemedText>
          </Pressable>
        </View>
      </View>

      <View style={styles.grid}>
        {PROCEDURE_CATEGORIES.map((category) => (
          <CategoryCard
            key={category.id}
            label={category.label}
            selected={selected.has(category.id)}
            onPress={() => toggleSpecialty(category.id)}
            color={theme.link}
          />
        ))}
      </View>

      <Pressable
        onPress={handleSave}
        disabled={isSaving || !hasChanges}
        style={[
          styles.saveButton,
          {
            backgroundColor: theme.link,
            opacity: isSaving || !hasChanges ? 0.5 : 1,
          },
        ]}
      >
        <ThemedText
          style={[styles.saveButtonText, { color: theme.buttonText }]}
        >
          {isSaving ? "Saving..." : "Save Personalisation"}
        </ThemedText>
      </Pressable>

      {/* Privacy & Media section */}
      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.border,
          },
        ]}
      >
        <ThemedText style={styles.sectionTitle}>Privacy & Media</ThemedText>
        <View style={styles.toggleRow}>
          <View style={styles.toggleLabel}>
            <ThemedText style={styles.toggleTitle}>
              Auto-Delete Camera Roll Originals
            </ThemedText>
            <ThemedText
              style={[styles.toggleSubtitle, { color: theme.textSecondary }]}
            >
              Automatically delete imported photos from Camera Roll
            </ThemedText>
          </View>
          <Switch
            value={autoDeleteOriginals}
            onValueChange={handleToggleAutoDelete}
            trackColor={{ false: theme.border, true: theme.link }}
            thumbColor={theme.buttonText}
          />
        </View>
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
    ...Shadows.card,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  heroBody: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: Spacing.sm,
  },
  heroMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.md,
  },
  heroMetaText: {
    fontSize: 13,
  },
  heroLink: {
    fontSize: 13,
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  card: {
    width: "48%",
    minHeight: 56,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "transparent",
  },
  cardLabel: {
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
    marginRight: Spacing.sm,
  },
  cardLabelSelected: {
    fontWeight: "700",
  },
  saveButton: {
    marginTop: Spacing.xl,
    height: 56,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  sectionCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
    marginTop: Spacing.xl,
    ...Shadows.card,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: Spacing.md,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  toggleLabel: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: "500",
  },
  toggleSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
});
