import React from "react";
import {
  View,
  FlatList,
  Pressable,
  Dimensions,
  StyleSheet,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { AttentionCard } from "@/components/dashboard/AttentionCard";
import { InfoButton } from "@/components/dashboard/InfoButton";
import type { AttentionItem } from "@/hooks/useAttentionItems";

const { width: screenWidth } = Dimensions.get("window");
const CARD_WIDTH = screenWidth - 48;
const CARD_GAP = 12;

interface NeedsAttentionCarouselProps {
  items: AttentionItem[];
  onLogCase: (item: AttentionItem) => void;
  onDischarge: (caseId: string) => void;
  onCardPress: (item: AttentionItem) => void;
  onViewAll: () => void;
  onAddEvent?: (caseId: string) => void;
  onAddHistology?: (caseId: string) => void;
}

const Separator = () => <View style={{ width: CARD_GAP }} />;

function NeedsAttentionCarouselInner({
  items,
  onLogCase,
  onDischarge,
  onCardPress,
  onViewAll,
  onAddEvent,
  onAddHistology,
}: NeedsAttentionCarouselProps) {
  const { theme } = useTheme();

  if (items.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* Section header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <ThemedText
            style={[styles.headerText, { color: theme.textSecondary }]}
          >
            Needs Attention
          </ThemedText>
          <InfoButton
            title="Needs Attention"
            content="Shows current inpatients (by post-operative day), active treatment episodes that need follow-up, and cases with active infections."
          />
        </View>
        <View style={styles.headerRight}>
          {items.length > 0 ? (
            <Pressable
              onPress={onViewAll}
              accessibilityRole="button"
              accessibilityLabel="View all attention items"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ThemedText style={[styles.viewAllText, { color: theme.accent }]}>
                View all
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Carousel */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + CARD_GAP}
        decelerationRate="fast"
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={Separator}
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AttentionCard
            item={item}
            cardWidth={CARD_WIDTH}
            onLogCase={onLogCase}
            onDischarge={onDischarge}
            onCardPress={onCardPress}
            onAddEvent={onAddEvent}
            onAddHistology={onAddHistology}
          />
        )}
      />
    </View>
  );
}

export const NeedsAttentionCarousel = React.memo(NeedsAttentionCarouselInner);

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerText: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: "500",
  },
  listContent: {
    paddingHorizontal: 16,
  },
});
