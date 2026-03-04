import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, ScrollView, Modal } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AOFractureCascadingForm } from "./AOFractureCascadingForm";

interface FractureEntry {
  id: string;
  boneId: string;
  boneName: string;
  aoCode: string;
  details: {
    familyCode: string;
    type?: string;
    subBoneId?: string;
    finger?: string;
    phalanx?: string;
    segment?: string;
    qualifications?: string[];
  };
}

interface FractureClassificationWizardProps {
  visible: boolean;
  onClose: () => void;
  onSave: (fractures: FractureEntry[]) => void;
  initialFractures?: FractureEntry[];
}

export function FractureClassificationWizard({
  visible,
  onClose,
  onSave,
  initialFractures = [],
}: FractureClassificationWizardProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [fractures, setFractures] = useState<FractureEntry[]>(initialFractures);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (visible) {
      setFractures(initialFractures);
      setShowAddForm(initialFractures.length === 0);
    }
  }, [visible, initialFractures]);

  const handleAddFracture = (data: {
    boneId: string;
    boneName: string;
    aoCode: string;
    details: {
      familyCode: string;
      type?: string;
      subBoneId?: string;
      finger?: string;
      phalanx?: string;
      segment?: string;
      qualifications?: string[];
    };
  }) => {
    const newFracture: FractureEntry = {
      id: Date.now().toString(),
      ...data,
    };
    setFractures((prev) => [...prev, newFracture]);
    setShowAddForm(false);
  };

  const removeFracture = (id: string) => {
    setFractures((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSave = () => {
    onSave(fractures);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View
        style={[
          styles.container,
          { backgroundColor: theme.backgroundDefault, paddingTop: insets.top },
        ]}
      >
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Pressable onPress={onClose} style={styles.headerButton}>
            <Feather name="x" size={24} color={theme.text} />
          </Pressable>

          <View style={styles.headerCenter}>
            <ThemedText style={[styles.headerTitle, { color: theme.text }]}>
              AO Fracture Classification
            </ThemedText>
            <ThemedText
              style={[styles.headerSubtitle, { color: theme.textSecondary }]}
            >
              Hand & Carpus (Region 7)
            </ThemedText>
          </View>

          {fractures.length > 0 ? (
            <Pressable onPress={handleSave} style={styles.headerButton}>
              <ThemedText style={[styles.saveText, { color: theme.link }]}>
                Save
              </ThemedText>
            </Pressable>
          ) : (
            <View style={styles.headerButton} />
          )}
        </View>

        {showAddForm ? (
          <AOFractureCascadingForm
            onComplete={handleAddFracture}
            onCancel={() => {
              if (fractures.length > 0) {
                setShowAddForm(false);
              } else {
                onClose();
              }
            }}
          />
        ) : (
          <ScrollView
            style={styles.fracturesList}
            contentContainerStyle={[
              styles.fracturesListContent,
              { paddingBottom: insets.bottom + Spacing.xl },
            ]}
          >
            <ThemedText style={[styles.listTitle, { color: theme.text }]}>
              Classified Fractures ({fractures.length})
            </ThemedText>

            {fractures.map((f) => (
              <View
                key={f.id}
                style={[
                  styles.fractureCard,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                <View style={styles.fractureInfo}>
                  <ThemedText
                    style={[styles.fractureBone, { color: theme.text }]}
                  >
                    {f.boneName}
                  </ThemedText>
                  <View
                    style={[
                      styles.aoCodeBadge,
                      { backgroundColor: theme.link },
                    ]}
                  >
                    <ThemedText style={styles.aoCodeText}>
                      {f.aoCode}
                    </ThemedText>
                  </View>
                </View>
                <Pressable
                  onPress={() => removeFracture(f.id)}
                  hitSlop={8}
                  style={styles.removeButton}
                >
                  <Feather name="trash-2" size={18} color={theme.error} />
                </Pressable>
              </View>
            ))}

            <Pressable
              style={[styles.addButton, { borderColor: theme.link }]}
              onPress={() => setShowAddForm(true)}
            >
              <Feather name="plus" size={20} color={theme.link} />
              <ThemedText style={[styles.addButtonText, { color: theme.link }]}>
                Add Another Fracture
              </ThemedText>
            </Pressable>

            <Pressable
              style={[styles.saveButton, { backgroundColor: theme.link }]}
              onPress={handleSave}
            >
              <Feather name="check" size={20} color="#FFF" />
              <ThemedText style={styles.saveButtonText}>
                Save All Fractures
              </ThemedText>
            </Pressable>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

export type { FractureEntry };

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 50,
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  saveText: {
    fontSize: 16,
    fontWeight: "600",
  },
  fracturesList: {
    flex: 1,
  },
  fracturesListContent: {
    padding: Spacing.md,
  },
  listTitle: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  fractureCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  fractureInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  fractureBone: {
    fontSize: 15,
    fontWeight: "500",
  },
  aoCodeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  aoCodeText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "monospace",
  },
  removeButton: {
    padding: Spacing.sm,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderStyle: "dashed",
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  saveButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
