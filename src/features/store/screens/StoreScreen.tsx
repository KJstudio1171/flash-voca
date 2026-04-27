import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { StoreBundleSummary } from "@/src/core/domain/models";
import { hasSupabaseConfig } from "@/src/core/supabase/config";
import { StoreBundleGridCard } from "@/src/features/store/components/StoreBundleGridCard";
import {
  StoreCategoryChips,
  StoreCategoryId,
} from "@/src/features/store/components/StoreCategoryChips";
import { useBundleCatalogQuery } from "@/src/features/store/hooks/useStoreQueries";
import { AnimatedScreen } from "@/src/shared/animation/AnimatedScreen";
import { useT } from "@/src/shared/i18n";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";
import { AppScreenFrame } from "@/src/shared/ui/AppScreenFrame";
import { Badge } from "@/src/shared/ui/Badge";
import { CardSurface } from "@/src/shared/ui/CardSurface";

export default function StoreScreen() {
  const { t } = useT();
  const router = useRouter();
  const { colors } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<StoreCategoryId>("all");
  const bundleQuery = useBundleCatalogQuery();
  const bundles = useMemo(() => bundleQuery.data ?? [], [bundleQuery.data]);
  const visibleBundles = useMemo(
    () => filterBundlesByCategory(bundles, selectedCategory),
    [bundles, selectedCategory],
  );
  const emptyTitle = hasSupabaseConfig
    ? t("store.emptyCatalogTitle")
    : t("store.supabaseRequiredTitle");
  const emptyMessage = hasSupabaseConfig
    ? t("store.emptyCatalogMessage")
    : t("store.supabaseRequiredMessage");
  const categories = [
    { id: "all" as const, label: t("store.categories.all") },
    { id: "toeic" as const, label: t("store.categories.toeic") },
    { id: "jlpt" as const, label: t("store.categories.jlpt") },
    { id: "business" as const, label: t("store.categories.business") },
    { id: "travel" as const, label: t("store.categories.travel") },
  ];

  return (
    <AppScreenFrame bottomInset="tabs" contentStyle={styles.screenContent}>
      <AnimatedScreen style={styles.header}>
        <Text style={[styles.title, { color: colors.ink }]}>{t("store.title")}</Text>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.crown}>👑</Text>
            <Text style={[styles.sectionTitle, { color: colors.ink }]}>
              {t("store.officialSectionTitle")}
            </Text>
          </View>
          <MaterialCommunityIcons color={colors.muted} name="chevron-right" size={28} />
        </View>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          {t("store.officialSectionSubtitle")}
        </Text>
      </AnimatedScreen>

      <StoreCategoryChips
        categories={categories}
        onSelect={setSelectedCategory}
        selectedId={selectedCategory}
      />

      {bundleQuery.isLoading ? (
        <CardSurface>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.stateText, { color: colors.muted }]}>{t("store.loading")}</Text>
        </CardSurface>
      ) : null}

      {bundleQuery.isError ? (
        <CardSurface>
          <Badge tone="info">{t("store.catalogErrorBadge")}</Badge>
          <Text style={[styles.stateTitle, { color: colors.ink }]}>
            {t("store.catalogErrorTitle")}
          </Text>
          <Text style={[styles.stateText, { color: colors.muted }]}>
            {t("store.catalogErrorMessage")}
          </Text>
        </CardSurface>
      ) : null}

      {!bundleQuery.isLoading && !bundleQuery.isError && bundles.length === 0 ? (
        <CardSurface>
          <Badge tone="info">
            {hasSupabaseConfig ? t("store.emptyCatalogBadge") : t("store.localModeBadge")}
          </Badge>
          <Text style={[styles.stateTitle, { color: colors.ink }]}>{emptyTitle}</Text>
          <Text style={[styles.stateText, { color: colors.muted }]}>{emptyMessage}</Text>
        </CardSurface>
      ) : null}

      {!bundleQuery.isLoading &&
      !bundleQuery.isError &&
      bundles.length > 0 &&
      visibleBundles.length === 0 ? (
        <CardSurface>
          <Badge tone="info">{t("store.emptyFilterBadge")}</Badge>
          <Text style={[styles.stateTitle, { color: colors.ink }]}>
            {t("store.emptyFilterTitle")}
          </Text>
          <Text style={[styles.stateText, { color: colors.muted }]}>
            {t("store.emptyFilterMessage")}
          </Text>
        </CardSurface>
      ) : null}

      <View style={styles.grid}>
        {visibleBundles.map((bundle, index) => (
          <StoreBundleGridCard
            bundle={bundle}
            index={index}
            key={bundle.id}
            lockedLabel={t("store.lockedBadge")}
            metaLabel={t("store.bundleMeta", {
              deckCount: bundle.deckCount,
              priceText: bundle.priceText,
            })}
            onPress={() =>
              router.push({
                pathname: "/bundles/[bundleId]",
                params: { bundleId: bundle.id },
              })
            }
            ownedLabel={t("store.ownedBadge")}
          />
        ))}
      </View>
    </AppScreenFrame>
  );
}

function filterBundlesByCategory(
  bundles: StoreBundleSummary[],
  category: StoreCategoryId,
) {
  if (category === "all") return bundles;

  return bundles.filter((bundle) => {
    const haystack = `${bundle.title} ${bundle.description}`.toLowerCase();
    return haystack.includes(category);
  });
}

const styles = StyleSheet.create({
  screenContent: {
    gap: tokens.spacing.l,
  },
  header: {
    gap: tokens.spacing.s,
  },
  title: {
    ...tokens.typography.pageTitleLarge,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: tokens.spacing.s,
  },
  sectionTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: tokens.spacing.s,
  },
  crown: {
    fontSize: 28,
    lineHeight: 32,
  },
  sectionTitle: {
    ...tokens.typography.heading,
  },
  subtitle: {
    ...tokens.typography.body,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.m,
  },
  stateTitle: {
    ...tokens.typography.heading,
  },
  stateText: {
    ...tokens.typography.body,
  },
});
