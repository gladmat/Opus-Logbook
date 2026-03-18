import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  LayoutAnimation,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useRecentProducts } from "@/hooks/useRecentProducts";
import { getProductsByCategory, getProductById } from "@/lib/aestheticProducts";
import {
  getAllEnergyDevices,
  type EnergyDeviceProduct,
} from "@/lib/aestheticProductsEnergy";
import type {
  AestheticProduct,
  AestheticProductCategory,
  MarketRegion,
} from "@/types/aesthetics";
import { Spacing, BorderRadius } from "@/constants/theme";

interface ProductPickerProps {
  category: AestheticProductCategory;
  selectedProductId?: string;
  onSelect: (product: AestheticProduct) => void;
  regionFilter?: MarketRegion;
}

/**
 * Inline hierarchical product selection component.
 * Level 1: Brand family / manufacturer chips
 * Level 2: Specific product chips within the selected brand
 */
export const ProductPicker = React.memo(function ProductPicker({
  category,
  selectedProductId,
  onSelect,
  regionFilter,
}: ProductPickerProps) {
  const { theme } = useTheme();
  const { recentIds, recordProductUse } = useRecentProducts(category);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null);

  // Get all products for this category
  const allProducts = useMemo((): AestheticProduct[] => {
    if (category === "energy_device") {
      return getAllEnergyDevices();
    }
    return getProductsByCategory(category);
  }, [category]);

  // Filter by region if specified
  const regionFiltered = useMemo(() => {
    if (!regionFilter) return allProducts;
    return allProducts.filter(
      (p) =>
        p.availableRegions.includes(regionFilter) ||
        p.availableRegions.includes("global"),
    );
  }, [allProducts, regionFilter]);

  // Filter by search query
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return regionFiltered;
    const q = searchQuery.toLowerCase();
    return regionFiltered.filter(
      (p) =>
        p.productName.toLowerCase().includes(q) ||
        p.manufacturer.toLowerCase().includes(q) ||
        p.brandFamily.toLowerCase().includes(q),
    );
  }, [regionFiltered, searchQuery]);

  // Group by brand family
  const brandGroups = useMemo(() => {
    const groups = new Map<string, AestheticProduct[]>();
    for (const p of filtered) {
      const key = `${p.manufacturer} — ${p.brandFamily}`;
      const arr = groups.get(key) ?? [];
      arr.push(p);
      groups.set(key, arr);
    }
    return groups;
  }, [filtered]);

  // Recent products resolved from IDs
  const recentProducts = useMemo(() => {
    return recentIds
      .map((id) => {
        const found = allProducts.find((p) => p.id === id);
        if (!found) return getProductById(id);
        return found;
      })
      .filter((p): p is AestheticProduct => p != null);
  }, [recentIds, allProducts]);

  const handleSelect = useCallback(
    (product: AestheticProduct) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      recordProductUse(product.id);
      onSelect(product);
    },
    [onSelect, recordProductUse],
  );

  const handleBrandToggle = useCallback((brandKey: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedBrand((prev) => (prev === brandKey ? null : brandKey));
  }, []);

  const selectedProduct = selectedProductId
    ? (allProducts.find((p) => p.id === selectedProductId) ??
      getProductById(selectedProductId))
    : undefined;

  return (
    <View style={styles.container}>
      {/* Selected product badge */}
      {selectedProduct && (
        <View
          style={[
            styles.selectedBadge,
            { backgroundColor: theme.link + "1A", borderColor: theme.link },
          ]}
        >
          <ThemedText style={[styles.selectedText, { color: theme.link }]}>
            {selectedProduct.brandFamily} — {selectedProduct.productName}
          </ThemedText>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect({ ...selectedProduct, id: "" } as AestheticProduct);
            }}
            hitSlop={8}
          >
            <Feather name="x" size={14} color={theme.link} />
          </Pressable>
        </View>
      )}

      {/* Search input */}
      <TextInput
        style={[
          styles.searchInput,
          {
            backgroundColor: theme.backgroundSecondary,
            color: theme.text,
            borderColor: theme.border,
          },
        ]}
        placeholder="Search products..."
        placeholderTextColor={theme.textTertiary}
        value={searchQuery}
        onChangeText={setSearchQuery}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {/* Recently used */}
      {recentProducts.length > 0 && !searchQuery && (
        <View style={styles.section}>
          <ThemedText
            style={[styles.sectionLabel, { color: theme.textSecondary }]}
          >
            Recently used
          </ThemedText>
          <View style={styles.chipRow}>
            {recentProducts.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => handleSelect(p)}
                style={[
                  styles.chip,
                  {
                    backgroundColor:
                      selectedProductId === p.id
                        ? theme.link
                        : theme.backgroundElevated,
                    borderColor:
                      selectedProductId === p.id ? theme.link : theme.border,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.chipText,
                    {
                      color:
                        selectedProductId === p.id
                          ? theme.buttonText
                          : theme.text,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {p.productName}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Brand groups */}
      {Array.from(brandGroups.entries()).map(([brandKey, products]) => {
        const isExpanded = expandedBrand === brandKey;
        const hasSingleProduct = products.length === 1;

        return (
          <View key={brandKey} style={styles.brandGroup}>
            <Pressable
              onPress={() => {
                if (hasSingleProduct) {
                  handleSelect(products[0]!);
                } else {
                  handleBrandToggle(brandKey);
                }
              }}
              style={[
                styles.brandHeader,
                {
                  backgroundColor: isExpanded
                    ? theme.link + "0D"
                    : theme.backgroundElevated,
                  borderColor: isExpanded ? theme.link + "33" : theme.border,
                },
              ]}
            >
              <View style={styles.brandHeaderContent}>
                <ThemedText
                  style={[styles.brandName, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {brandKey}
                </ThemedText>
                {!hasSingleProduct && (
                  <ThemedText
                    style={[styles.brandCount, { color: theme.textTertiary }]}
                  >
                    {products.length}
                  </ThemedText>
                )}
              </View>
              {!hasSingleProduct && (
                <Feather
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={theme.textSecondary}
                />
              )}
            </Pressable>

            {isExpanded && (
              <View style={styles.chipRow}>
                {products.map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() => handleSelect(p)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor:
                          selectedProductId === p.id
                            ? theme.link
                            : theme.backgroundSecondary,
                        borderColor:
                          selectedProductId === p.id
                            ? theme.link
                            : theme.border,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.chipText,
                        {
                          color:
                            selectedProductId === p.id
                              ? theme.buttonText
                              : theme.text,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {p.productName}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    fontSize: 14,
  },
  selectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  selectedText: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    marginRight: Spacing.sm,
  },
  section: {
    gap: Spacing.xs,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  chip: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    minHeight: 36,
    justifyContent: "center",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  brandGroup: {
    gap: Spacing.xs,
  },
  brandHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 44,
  },
  brandHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  brandName: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  brandCount: {
    fontSize: 12,
  },
});
