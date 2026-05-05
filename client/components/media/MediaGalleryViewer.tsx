import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
  type ViewToken,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Sharing from "expo-sharing";
import * as Haptics from "expo-haptics";

import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { MediaTagBadge } from "@/components/media/MediaTagBadge";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useDecryptedImage } from "@/hooks/useDecryptedImage";
import { isOpusMediaUri } from "@/lib/mediaStorage";
import type { MediaTag } from "@/types/media";
import { resolveMediaTag } from "@/lib/mediaTagHelpers";
import {
  clampIndex,
  formatCounter,
  formatMediaDate,
} from "@/components/media/mediaGalleryHelpers";

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

export interface GalleryMediaItem {
  id: string;
  localUri: string;
  mimeType?: string;
  caption?: string;
  tag?: MediaTag;
  timestamp?: string;
  createdAt?: string;
}

interface MediaGalleryViewerProps {
  visible: boolean;
  items: GalleryMediaItem[];
  initialIndex?: number;
  onClose: () => void;
}

// ═══════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════

const BACKDROP = "#000";
const CHROME_BG = "rgba(0,0,0,0.55)";
const CHROME_TEXT = "#FFFFFF";
const MIN_SCALE = 1;
const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2;

// ═══════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════

export function MediaGalleryViewer({
  visible,
  items,
  initialIndex = 0,
  onClose,
}: MediaGalleryViewerProps) {
  const insets = useSafeAreaInsets();
  const [dims, setDims] = useState(() => Dimensions.get("window"));
  const { width, height } = dims;
  const [index, setIndex] = useState(() =>
    clampIndex(initialIndex, items.length),
  );
  const [chromeVisible, setChromeVisible] = useState(true);
  const [zoomed, setZoomed] = useState(false);

  const listRef = useRef<FlatList<GalleryMediaItem>>(null);

  useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window }) => {
      setDims(window);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (visible) {
      setIndex(clampIndex(initialIndex, items.length));
      setChromeVisible(true);
      setZoomed(false);
    }
  }, [visible, initialIndex, items.length]);

  const current = items[index];

  const viewabilityConfig = useMemo(
    () => ({ itemVisiblePercentThreshold: 60 }),
    [],
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first && typeof first.index === "number") {
        setIndex(first.index);
        setZoomed(false);
      }
    },
  ).current;

  const handleZoomChange = useCallback((z: boolean) => {
    setZoomed(z);
  }, []);

  const handleToggleChrome = useCallback(() => {
    setChromeVisible((v) => !v);
  }, []);

  const handleShare = useCallback(async () => {
    if (!current) return;
    try {
      // For opus-media URIs, the decrypt cache holds a file:// URI after
      // the page has rendered. For plain URIs, pass through.
      let shareUri = current.localUri;
      if (isOpusMediaUri(current.localUri)) {
        const { decryptCache } = await import("@/lib/mediaDecryptCache");
        const mediaId = current.localUri.replace(/^opus-media:/, "");
        const cached = decryptCache.getCached(mediaId, "full");
        if (!cached) return;
        shareUri = cached;
      }
      const ok = await Sharing.isAvailableAsync();
      if (!ok) return;
      await Sharing.shareAsync(shareUri, {
        mimeType: current.mimeType ?? "image/jpeg",
        dialogTitle: "Share photo",
      });
      Haptics.selectionAsync().catch(() => {});
    } catch {
      // Swallow share errors silently — user cancelled or system denied.
    }
  }, [current]);

  const getItemLayout = useCallback(
    (_: unknown, i: number) => ({
      length: width,
      offset: width * i,
      index: i,
    }),
    [width],
  );

  const keyExtractor = useCallback((item: GalleryMediaItem) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: GalleryMediaItem }) => (
      <GalleryPage
        item={item}
        width={width}
        height={height}
        panEnabled={zoomed}
        onSingleTap={handleToggleChrome}
        onZoomChange={handleZoomChange}
      />
    ),
    [width, height, zoomed, handleToggleChrome, handleZoomChange],
  );

  if (items.length === 0) return null;

  const counter = formatCounter(index, items.length);
  const captionDate = formatMediaDate(current?.timestamp ?? current?.createdAt);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
      testID="mediaGallery.modal"
    >
      <GestureHandlerRootView style={styles.root}>
        <View style={[styles.root, { backgroundColor: BACKDROP }]}>
          <FlatList
            ref={listRef}
            data={items}
            horizontal
            pagingEnabled
            scrollEnabled={!zoomed}
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={clampIndex(initialIndex, items.length)}
            getItemLayout={getItemLayout}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            windowSize={3}
            initialNumToRender={1}
            maxToRenderPerBatch={2}
            removeClippedSubviews
            testID="mediaGallery.list"
          />

          {chromeVisible ? (
            <>
              <View
                style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}
                pointerEvents="box-none"
              >
                <Pressable
                  onPress={onClose}
                  style={styles.chromeButton}
                  hitSlop={12}
                  testID="mediaGallery.btn-close"
                  accessibilityLabel="Close"
                  accessibilityRole="button"
                >
                  <Feather name="x" size={24} color={CHROME_TEXT} />
                </Pressable>

                <View style={styles.counterPill}>
                  <ThemedText
                    style={styles.counterText}
                    testID="mediaGallery.counter"
                  >
                    {counter}
                  </ThemedText>
                </View>

                <Pressable
                  onPress={handleShare}
                  style={styles.chromeButton}
                  hitSlop={12}
                  testID="mediaGallery.btn-share"
                  accessibilityLabel="Share"
                  accessibilityRole="button"
                >
                  <Feather name="share" size={22} color={CHROME_TEXT} />
                </Pressable>
              </View>

              {current?.caption || current?.tag || captionDate ? (
                <View
                  style={[
                    styles.footer,
                    { paddingBottom: insets.bottom + Spacing.lg },
                  ]}
                  pointerEvents="box-none"
                >
                  <View style={styles.footerRow}>
                    {current?.tag ? (
                      <MediaTagBadge
                        tag={resolveMediaTag(current)}
                        size="small"
                      />
                    ) : null}
                    {captionDate ? (
                      <ThemedText style={styles.footerDate}>
                        {captionDate}
                      </ThemedText>
                    ) : null}
                  </View>
                  {current?.caption ? (
                    <ThemedText
                      style={styles.caption}
                      numberOfLines={4}
                      testID="mediaGallery.caption"
                    >
                      {current.caption}
                    </ThemedText>
                  ) : null}
                </View>
              ) : null}
            </>
          ) : null}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════
// Gallery page (one zoomable image)
// ═══════════════════════════════════════════════════════════

interface GalleryPageProps {
  item: GalleryMediaItem;
  width: number;
  height: number;
  panEnabled: boolean;
  onSingleTap: () => void;
  onZoomChange: (zoomed: boolean) => void;
}

function GalleryPage({
  item,
  width,
  height,
  panEnabled,
  onSingleTap,
  onZoomChange,
}: GalleryPageProps) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  const isOpusUri = isOpusMediaUri(item.localUri);
  const decrypted = useDecryptedImage(item.localUri, false);
  const sourceUri = isOpusUri ? decrypted.uri : item.localUri;
  const loading = isOpusUri ? decrypted.loading : false;
  const failed = isOpusUri ? decrypted.error : false;

  const resetZoom = useCallback(() => {
    scale.value = withTiming(1);
    savedScale.value = 1;
    tx.value = withTiming(0);
    ty.value = withTiming(0);
    savedTx.value = 0;
    savedTy.value = 0;
    onZoomChange(false);
  }, [scale, savedScale, tx, ty, savedTx, savedTy, onZoomChange]);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      const next = savedScale.value * e.scale;
      scale.value = Math.min(Math.max(next, MIN_SCALE * 0.8), MAX_SCALE);
    })
    .onEnd(() => {
      if (scale.value < MIN_SCALE * 1.05) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        tx.value = withTiming(0);
        ty.value = withTiming(0);
        savedTx.value = 0;
        savedTy.value = 0;
        runOnJS(onZoomChange)(false);
      } else {
        savedScale.value = scale.value;
        runOnJS(onZoomChange)(true);
      }
    });

  const pan = Gesture.Pan()
    .enabled(panEnabled)
    .onUpdate((e) => {
      if (scale.value <= MIN_SCALE * 1.05) return;
      tx.value = savedTx.value + e.translationX;
      ty.value = savedTy.value + e.translationY;
    })
    .onEnd(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(250)
    .onEnd(() => {
      if (scale.value > MIN_SCALE * 1.05) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        tx.value = withTiming(0);
        ty.value = withTiming(0);
        savedTx.value = 0;
        savedTy.value = 0;
        runOnJS(onZoomChange)(false);
      } else {
        scale.value = withTiming(DOUBLE_TAP_SCALE);
        savedScale.value = DOUBLE_TAP_SCALE;
        runOnJS(onZoomChange)(true);
      }
    });

  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .maxDuration(250)
    .onEnd(() => {
      runOnJS(onSingleTap)();
    })
    .requireExternalGestureToFail(doubleTap);

  const composed = Gesture.Simultaneous(
    pinch,
    pan,
    Gesture.Exclusive(doubleTap, singleTap),
  );

  useEffect(() => {
    // Reset zoom when item identity changes (e.g. remount during list scroll).
    return () => {
      resetZoom();
    };
  }, [resetZoom]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View
      style={{ width, height, justifyContent: "center", alignItems: "center" }}
    >
      {loading ? (
        <ActivityIndicator size="large" color={CHROME_TEXT} />
      ) : failed || !sourceUri ? (
        <View style={styles.errorBox}>
          <Feather name="image" size={48} color="#555" />
          <ThemedText style={styles.errorText}>Image unavailable</ThemedText>
        </View>
      ) : (
        <GestureDetector gesture={composed}>
          <Animated.View
            style={[
              { width, height, justifyContent: "center", alignItems: "center" },
              animatedStyle,
            ]}
          >
            <ExpoImage
              source={{ uri: sourceUri }}
              style={{ width, height }}
              contentFit="contain"
              transition={150}
            />
          </Animated.View>
        </GestureDetector>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: CHROME_BG,
  },
  chromeButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  counterPill: {
    flex: 1,
    alignItems: "center",
  },
  counterText: {
    color: CHROME_TEXT,
    fontSize: 15,
    fontWeight: "600",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: CHROME_BG,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  footerDate: {
    color: CHROME_TEXT,
    fontSize: 13,
    opacity: 0.8,
  },
  caption: {
    color: CHROME_TEXT,
    fontSize: 15,
    lineHeight: 22,
  },
  errorBox: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  errorText: {
    color: "#999",
    fontSize: 14,
  },
});
