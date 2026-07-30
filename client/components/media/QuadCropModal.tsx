import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet, Modal, Pressable, Image } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Polygon } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import type { DetectedQuadCorners } from "@/lib/imageEnhance";
import {
  computeContainRect,
  layoutToNormalized,
  normalizedToLayout,
  type LayoutRect,
  type Size,
} from "@/lib/quadAdjust";

const AnimatedPolygon = Animated.createAnimatedComponent(Polygon);

const HANDLE_SIZE = 28;
const HANDLE_HIT_SLOP = (44 - HANDLE_SIZE) / 2;

interface QuadCropModalProps {
  visible: boolean;
  /** Plaintext file:// URI of the image being adjusted. */
  imageUri: string;
  /** Seed quad (manual > detected > default inset), normalized top-left origin. */
  initialQuad: DetectedQuadCorners;
  onApply: (quad: DetectedQuadCorners) => void;
  onClose: () => void;
}

interface CornerHandle {
  x: SharedValue<number>;
  y: SharedValue<number>;
  gesture: ReturnType<typeof Gesture.Pan>;
  style: ReturnType<typeof useAnimatedStyle>;
}

function useCornerHandle(rectSv: SharedValue<LayoutRect>): CornerHandle {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const gesture = Gesture.Pan()
    .onBegin(() => {
      startX.value = x.value;
      startY.value = y.value;
    })
    .onUpdate((event) => {
      const rect = rectSv.value;
      x.value = Math.min(
        rect.x + rect.width,
        Math.max(rect.x, startX.value + event.translationX),
      );
      y.value = Math.min(
        rect.y + rect.height,
        Math.max(rect.y, startY.value + event.translationY),
      );
    });

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value - HANDLE_SIZE / 2 },
      { translateY: y.value - HANDLE_SIZE / 2 },
    ],
  }));

  return { x, y, gesture, style };
}

/**
 * Full-screen manual corner-adjust editor: four draggable handles over the
 * ORIGINAL image; Apply hands back the normalized quad for perspective
 * correction. Purely presentational — the caller re-runs enhancement.
 */
export function QuadCropModal({
  visible,
  imageUri,
  initialQuad,
  onApply,
  onClose,
}: QuadCropModalProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [containerSize, setContainerSize] = useState<Size | null>(null);
  const [imageSize, setImageSize] = useState<Size | null>(null);
  const rectSv = useSharedValue<LayoutRect>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const initializedRef = useRef(false);

  const tl = useCornerHandle(rectSv);
  const tr = useCornerHandle(rectSv);
  const br = useCornerHandle(rectSv);
  const bl = useCornerHandle(rectSv);

  useEffect(() => {
    if (!visible) {
      initializedRef.current = false;
      return;
    }
    let cancelled = false;
    Image.getSize(
      imageUri,
      (width, height) => {
        if (!cancelled) setImageSize({ width, height });
      },
      () => {
        if (!cancelled) setImageSize(null);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [visible, imageUri]);

  const seedCorners = useCallback(
    (quad: DetectedQuadCorners, rect: LayoutRect) => {
      const set = (
        handle: CornerHandle,
        point: { x: number; y: number },
      ): void => {
        const layout = normalizedToLayout(point, rect);
        handle.x.value = layout.x;
        handle.y.value = layout.y;
      };
      set(tl, quad.topLeft);
      set(tr, quad.topRight);
      set(br, quad.bottomRight);
      set(bl, quad.bottomLeft);
    },
    [tl, tr, br, bl],
  );

  useEffect(() => {
    if (!visible || !containerSize || !imageSize) return;
    const rect = computeContainRect(containerSize, imageSize);
    if (rect.width <= 0 || rect.height <= 0) return;
    rectSv.value = rect;
    if (!initializedRef.current) {
      initializedRef.current = true;
      seedCorners(initialQuad, rect);
    }
  }, [visible, containerSize, imageSize, initialQuad, rectSv, seedCorners]);

  const polygonProps = useAnimatedProps(() => ({
    points: `${tl.x.value},${tl.y.value} ${tr.x.value},${tr.y.value} ${br.x.value},${br.y.value} ${bl.x.value},${bl.y.value}`,
  }));

  const handleReset = () => {
    const rect = rectSv.value;
    if (rect.width > 0) seedCorners(initialQuad, rect);
  };

  const handleApply = () => {
    const rect = rectSv.value;
    if (rect.width <= 0 || rect.height <= 0) {
      onClose();
      return;
    }
    const toNormalized = (handle: CornerHandle) =>
      layoutToNormalized({ x: handle.x.value, y: handle.y.value }, rect);
    onApply({
      topLeft: toNormalized(tl),
      topRight: toNormalized(tr),
      bottomRight: toNormalized(br),
      bottomLeft: toNormalized(bl),
    });
  };

  const handles: { key: string; handle: CornerHandle }[] = [
    { key: "topLeft", handle: tl },
    { key: "topRight", handle: tr },
    { key: "bottomRight", handle: br },
    { key: "bottomLeft", handle: bl },
  ];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View
        testID="sheet-quadCrop"
        style={[styles.container, { backgroundColor: "#000" }]}
      >
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <Pressable
            testID="media.crop.btn-cancel"
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Cancel crop adjustment"
          >
            <ThemedText style={[styles.headerAction, { color: "#FFFFFF" }]}>
              Cancel
            </ThemedText>
          </Pressable>
          <ThemedText style={[styles.headerTitle, { color: "#FFFFFF" }]}>
            Adjust Crop
          </ThemedText>
          <Pressable
            testID="media.crop.btn-apply"
            onPress={handleApply}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Apply crop"
          >
            <ThemedText style={[styles.headerAction, { color: theme.accent }]}>
              Apply
            </ThemedText>
          </Pressable>
        </View>

        <View
          style={styles.imageArea}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            setContainerSize({ width, height });
          }}
        >
          <Image
            source={{ uri: imageUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="contain"
          />
          <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
            <AnimatedPolygon
              animatedProps={polygonProps}
              fill="rgba(229, 160, 13, 0.12)"
              stroke={theme.accent}
              strokeWidth={2}
            />
          </Svg>
          {handles.map(({ key, handle }) => (
            <GestureDetector key={key} gesture={handle.gesture}>
              <Animated.View
                testID={`media.crop.handle-${key}`}
                hitSlop={HANDLE_HIT_SLOP}
                style={[
                  styles.handle,
                  {
                    backgroundColor: theme.accent,
                    borderColor: "#FFFFFF",
                  },
                  handle.style,
                ]}
              />
            </GestureDetector>
          ))}
        </View>

        <View
          style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}
        >
          <Pressable
            testID="media.crop.btn-reset"
            onPress={handleReset}
            accessibilityRole="button"
            accessibilityLabel="Reset corners"
            style={[styles.resetButton, { borderColor: "#FFFFFF55" }]}
          >
            <ThemedText style={[styles.resetText, { color: "#FFFFFF" }]}>
              Reset
            </ThemedText>
          </Pressable>
          <ThemedText style={[styles.hint, { color: "#FFFFFF99" }]}>
            Drag the corners to the edges of the X-ray
          </ThemedText>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  headerAction: {
    fontSize: 16,
    fontWeight: "600",
  },
  imageArea: {
    flex: 1,
  },
  handle: {
    position: "absolute",
    top: 0,
    left: 0,
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    borderWidth: 3,
  },
  footer: {
    alignItems: "center",
    gap: Spacing.sm,
    paddingTop: Spacing.md,
  },
  resetButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: "center",
  },
  resetText: {
    fontSize: 14,
    fontWeight: "500",
  },
  hint: {
    fontSize: 13,
  },
});
