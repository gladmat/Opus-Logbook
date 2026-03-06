import React, { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  useWindowDimensions,
  StyleSheet,
} from "react-native";
import type { ViewToken } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  withTiming,
  withDelay,
  Easing,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FeatureSlide } from "./FeatureSlide";
import { palette, Colors } from "@/constants/theme";
import { copy } from "@/constants/onboardingCopy";

const dark = Colors.dark;
const SLIDE_COUNT = 3;

interface Props {
  onComplete: () => void;
}

// ── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressSegment({
  index,
  segmentWidth,
  scrollX,
  screenWidth,
}: {
  index: number;
  segmentWidth: number;
  scrollX: SharedValue<number>;
  screenWidth: number;
}) {
  const fillStyle = useAnimatedStyle(() => {
    const fill = interpolate(
      scrollX.value / screenWidth,
      [index - 1, index],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return { width: fill * segmentWidth };
  });

  return (
    <View style={[progressStyles.segmentBg, { width: segmentWidth }]}>
      <Animated.View style={[progressStyles.segmentFill, fillStyle]} />
    </View>
  );
}

function ProgressBar({
  scrollX,
  screenWidth,
  topInset,
}: {
  scrollX: SharedValue<number>;
  screenWidth: number;
  topInset: number;
}) {
  // 3 segments with 2pt gaps between — full screen width, no padding
  const segmentWidth = (screenWidth - 4) / SLIDE_COUNT;

  return (
    <View style={[progressStyles.container, { top: topInset }]}>
      {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
        <ProgressSegment
          key={i}
          index={i}
          segmentWidth={segmentWidth}
          scrollX={scrollX}
          screenWidth={screenWidth}
        />
      ))}
    </View>
  );
}

const progressStyles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: "row",
    gap: 2,
    height: 2,
  },
  segmentBg: {
    height: 2,
    backgroundColor: palette.charcoal[800],
    overflow: "hidden",
  },
  segmentFill: {
    height: 2,
    backgroundColor: palette.amber[600],
  },
});

// ── Slide Visuals ────────────────────────────────────────────────────────────

const easeOut = Easing.out(Easing.ease);

/** Slide 1 — Stylised case entry form with autocomplete highlight */
function SpeedVisual({ isActive }: { isActive: boolean }) {
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    if (isActive) {
      opacity.value = withTiming(1, { duration: 500, easing: easeOut });
    }
  }, [isActive]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[{ alignItems: "center" }, animStyle]}>
      <View style={speedStyles.mockCard}>
        {/* Header bar */}
        <View style={speedStyles.header}>
          <View style={speedStyles.headerDot} />
          <View style={speedStyles.headerLabel} />
        </View>
        {/* Form fields */}
        <View style={speedStyles.field} />
        <View style={[speedStyles.field, { width: "70%" }]} />
        {/* Autocomplete dropdown — highlighted row */}
        <View style={speedStyles.autocomplete}>
          <View style={speedStyles.autoItem} />
          <View style={[speedStyles.autoItem, speedStyles.autoItemActive]} />
          <View style={speedStyles.autoItem} />
        </View>
        <View style={[speedStyles.field, { width: "55%" }]} />
      </View>
      {/* Amber accent line below image */}
      <View style={speedStyles.accentLine} />
    </Animated.View>
  );
}

const speedStyles = StyleSheet.create({
  mockCard: {
    width: 240,
    backgroundColor: palette.charcoal[900],
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  headerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.amber[600],
  },
  headerLabel: {
    height: 8,
    width: 60,
    backgroundColor: palette.charcoal[800],
    borderRadius: 4,
  },
  field: {
    height: 10,
    backgroundColor: palette.charcoal[800],
    borderRadius: 5,
  },
  autocomplete: {
    backgroundColor: palette.charcoal[850],
    borderRadius: 8,
    padding: 8,
    gap: 6,
  },
  autoItem: {
    height: 8,
    width: "80%",
    backgroundColor: palette.charcoal[800],
    borderRadius: 4,
  },
  autoItemActive: {
    backgroundColor: palette.amber[600],
    opacity: 0.3,
  },
  accentLine: {
    width: 40,
    height: 1,
    backgroundColor: palette.amber[600],
    marginTop: 16,
  },
});

/** Slide 2 — Team logging: case record branching to surgeon profiles */
function TeamVisual({ isActive }: { isActive: boolean }) {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    if (isActive) {
      progress.value = withTiming(5, {
        duration: 1500,
        easing: easeOut,
      });
    }
  }, [isActive]);

  const centralStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        scale: interpolate(
          progress.value,
          [0, 1],
          [0.95, 1],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const branchStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [1, 2],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  const card1Style = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [2, 3],
      [0, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [2, 3],
          [6, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const card2Style = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [2.5, 3.5],
      [0, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [2.5, 3.5],
          [6, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const card3Style = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [3, 4],
      [0, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [3, 4],
          [6, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const surgeons = [
    { name: "Dr Smith", style: card1Style },
    { name: "Dr Chen", style: card2Style },
    { name: "Dr Patel", style: card3Style },
  ];

  return (
    <View style={teamStyles.container}>
      {/* Central case card */}
      <Animated.View style={[teamStyles.centralCard, centralStyle]}>
        <Text style={teamStyles.caseLabel}>Case #427</Text>
        <Text style={teamStyles.caseDetail}>ALT Free Flap</Text>
      </Animated.View>

      {/* Amber branch connectors */}
      <Animated.View style={[teamStyles.branchArea, branchStyle]}>
        <View style={teamStyles.verticalLine} />
        <View style={teamStyles.horizontalLine} />
      </Animated.View>

      {/* Surgeon cards */}
      <View style={teamStyles.cardsRow}>
        {surgeons.map((s, i) => (
          <Animated.View key={i} style={[teamStyles.surgeonCard, s.style]}>
            <View style={teamStyles.verifiedDot} />
            <Text style={teamStyles.surgeonName}>{s.name}</Text>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

const teamStyles = StyleSheet.create({
  container: {
    alignItems: "center",
    width: 280,
  },
  centralCard: {
    backgroundColor: palette.charcoal[900],
    borderLeftWidth: 3,
    borderLeftColor: palette.amber[600],
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: 160,
    alignItems: "center",
  },
  caseLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: dark.text,
  },
  caseDetail: {
    fontSize: 11,
    color: "#AEAEB2",
    marginTop: 2,
  },
  branchArea: {
    alignItems: "center",
  },
  verticalLine: {
    width: 2,
    height: 20,
    backgroundColor: palette.amber[600],
  },
  horizontalLine: {
    width: 200,
    height: 2,
    backgroundColor: palette.amber[600],
  },
  cardsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  surgeonCard: {
    backgroundColor: palette.charcoal[900],
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    width: 80,
    gap: 6,
  },
  verifiedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2EA043",
  },
  surgeonName: {
    fontSize: 10,
    fontWeight: "500",
    color: "#AEAEB2",
  },
});

/** Slide 3 — Data flow: Opus case → programme registry labels */
const PROGRAMMES = ["ISCP", "FEBOPRAS", "BSSH", "RACS", "NMBRA"];

function DataFlowVisual({ isActive }: { isActive: boolean }) {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    if (isActive) {
      progress.value = withTiming(6, {
        duration: 1800,
        easing: easeOut,
      });
    }
  }, [isActive]);

  const centralStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        scale: interpolate(
          progress.value,
          [0, 1],
          [0.95, 1],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return (
    <View style={dataStyles.container}>
      {/* Central Opus card */}
      <Animated.View style={[dataStyles.centralCard, centralStyle]}>
        <Text style={dataStyles.opusLabel}>opus</Text>
        <Text style={dataStyles.caseLabel}>Case Data</Text>
      </Animated.View>

      {/* Connecting lines + programme labels */}
      <View style={dataStyles.labelsColumn}>
        {PROGRAMMES.map((name, i) => (
          <DataFlowLabel
            key={name}
            name={name}
            index={i}
            progress={progress}
          />
        ))}
      </View>
    </View>
  );
}

function DataFlowLabel({
  name,
  index,
  progress,
}: {
  name: string;
  index: number;
  progress: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const start = 1 + index * 0.8;
    return {
      opacity: interpolate(
        progress.value,
        [start, start + 0.8],
        [0, 1],
        Extrapolation.CLAMP,
      ),
      transform: [
        {
          translateX: interpolate(
            progress.value,
            [start, start + 0.8],
            [-8, 0],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  return (
    <Animated.View style={[dataStyles.labelRow, style]}>
      <View style={dataStyles.connector} />
      <View style={dataStyles.labelPill}>
        <Text style={dataStyles.labelText}>{name}</Text>
      </View>
    </Animated.View>
  );
}

const dataStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  centralCard: {
    backgroundColor: palette.charcoal[900],
    borderLeftWidth: 3,
    borderLeftColor: palette.amber[600],
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    width: 110,
  },
  opusLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: palette.amber[600],
    letterSpacing: 2,
  },
  caseLabel: {
    fontSize: 10,
    color: "#AEAEB2",
    marginTop: 2,
  },
  labelsColumn: {
    gap: 6,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  connector: {
    width: 16,
    height: 1,
    backgroundColor: palette.amber[600],
  },
  labelPill: {
    backgroundColor: palette.charcoal[800],
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  labelText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#AEAEB2",
    letterSpacing: 0.5,
  },
});

// ── Visual Components Array ──────────────────────────────────────────────────

const VISUALS: React.FC<{ isActive: boolean }>[] = [
  SpeedVisual,
  TeamVisual,
  DataFlowVisual,
];

// ── Feature Pager ────────────────────────────────────────────────────────────

export function FeaturePager({ onComplete }: Props) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const scrollX = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (viewableItems.length > 0 && first != null && first.index != null) {
        setCurrentPage(first.index);
      }
    },
  ).current;

  const handleCta = useCallback(
    (index: number) => {
      if (index < SLIDE_COUNT - 1) {
        flatListRef.current?.scrollToIndex({
          index: index + 1,
          animated: true,
        });
      } else {
        // Last slide "Create Account" → advance to auth
        onComplete();
      }
    },
    [onComplete],
  );

  const slides = copy.features.slides;

  const renderItem = useCallback(
    ({ item, index }: { item: (typeof slides)[number]; index: number }) => {
      const Visual = VISUALS[index] ?? SpeedVisual;
      return (
        <FeatureSlide
          headline={item.headline}
          body={item.body}
          ctaLabel={item.cta}
          visual={<Visual isActive={currentPage === index} />}
          onCta={() => handleCta(index)}
          onSkip={onComplete}
          width={screenWidth}
          height={screenHeight}
          topInset={insets.top}
          bottomInset={insets.bottom}
          slideIndex={index}
          totalSlides={SLIDE_COUNT}
        />
      );
    },
    [currentPage, screenWidth, screenHeight, insets, handleCta, onComplete],
  );

  return (
    <View style={pagerStyles.root}>
      <Animated.FlatList
        ref={flatListRef as React.RefObject<FlatList>}
        data={slides}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyExtractor={(_, i) => String(i)}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: screenWidth,
          offset: screenWidth * index,
          index,
        })}
      />
      <ProgressBar
        scrollX={scrollX}
        screenWidth={screenWidth}
        topInset={insets.top}
      />
    </View>
  );
}

const pagerStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.charcoal[950],
  },
});
