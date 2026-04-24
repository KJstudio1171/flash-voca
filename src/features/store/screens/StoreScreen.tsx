import { useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";

import { hasSupabaseConfig } from "@/src/core/supabase/config";
import { useBundleCatalogQuery } from "@/src/features/store/hooks/useStoreQueries";
import { staggeredList } from "@/src/shared/animation/motionPresets";
import { useT } from "@/src/shared/i18n";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { AppButton } from "@/src/shared/ui/AppButton";
import { Badge } from "@/src/shared/ui/Badge";
import { Panel } from "@/src/shared/ui/Panel";
import { Screen } from "@/src/shared/ui/Screen";
import { tokens } from "@/src/shared/theme/tokens";

export default function StoreScreen() {
  const { t } = useT();
  const router = useRouter();
  const { colors } = useTheme();
  const bundleQuery = useBundleCatalogQuery();
  const bundles = bundleQuery.data ?? [];
  const emptyTitle = hasSupabaseConfig
    ? t("store.emptyCatalogTitle")
    : t("store.supabaseRequiredTitle");
  const emptyMessage = hasSupabaseConfig
    ? t("store.emptyCatalogMessage")
    : t("store.supabaseRequiredMessage");

  return (
    <Screen
      title={t("store.title")}
      subtitle={t("store.subtitle")}
    >
      <Panel>
        <Badge tone="accent">{t("store.paidLayerBadge")}</Badge>
        <Text style={[styles.heroTitle, { color: colors.ink }]}>
          {t("store.heroTitle")}
        </Text>
        <Text style={[styles.heroBody, { color: colors.muted }]}>
          {t("store.heroBody")}
        </Text>
      </Panel>

      {bundleQuery.isLoading ? (
        <Panel>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.stateText, { color: colors.muted }]}>
            {t("store.loading")}
          </Text>
        </Panel>
      ) : null}

      {bundleQuery.isError ? (
        <Panel>
          <Badge tone="info">{t("store.catalogErrorBadge")}</Badge>
          <Text style={[styles.stateTitle, { color: colors.ink }]}>
            {t("store.catalogErrorTitle")}
          </Text>
          <Text style={[styles.stateText, { color: colors.muted }]}>
            {t("store.catalogErrorMessage")}
          </Text>
        </Panel>
      ) : null}

      {!bundleQuery.isLoading && !bundleQuery.isError && bundles.length === 0 ? (
        <Panel>
          <Badge tone="info">
            {hasSupabaseConfig ? t("store.emptyCatalogBadge") : t("store.localModeBadge")}
          </Badge>
          <Text style={[styles.stateTitle, { color: colors.ink }]}>{emptyTitle}</Text>
          <Text style={[styles.stateText, { color: colors.muted }]}>{emptyMessage}</Text>
        </Panel>
      ) : null}

      {bundles.map((bundle, index) => (
        <Animated.View key={bundle.id} entering={staggeredList(index)}>
          <Panel>
            <View style={styles.row}>
              <View style={styles.copy}>
                <Text style={[styles.bundleTitle, { color: colors.ink }]}>{bundle.title}</Text>
                <Text style={[styles.bundleMeta, { color: colors.muted }]}>
                  {t("store.bundleMeta", {
                    deckCount: bundle.deckCount,
                    priceText: bundle.priceText,
                  })}
                </Text>
              </View>
              <Badge tone={bundle.owned ? "primary" : "accent"}>
                {bundle.owned ? t("store.ownedBadge") : t("store.lockedBadge")}
              </Badge>
            </View>
            <Text style={[styles.bundleDescription, { color: colors.muted }]}>{bundle.description}</Text>
            <AppButton
              onPress={() =>
                router.push({
                  pathname: "/bundles/[bundleId]",
                  params: { bundleId: bundle.id },
                })
              }
              variant="secondary"
            >
              {t("store.viewBundle")}
            </AppButton>
          </Panel>
        </Animated.View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroTitle: {
    ...tokens.typography.hero,
  },
  heroBody: {
    ...tokens.typography.body,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: tokens.spacing.s,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  bundleTitle: {
    ...tokens.typography.heading,
  },
  bundleMeta: {
    ...tokens.typography.caption,
  },
  bundleDescription: {
    ...tokens.typography.body,
  },
  stateTitle: {
    ...tokens.typography.heading,
  },
  stateText: {
    ...tokens.typography.body,
  },
});
