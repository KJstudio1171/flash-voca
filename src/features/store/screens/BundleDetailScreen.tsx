import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";

import { useBundleDetailQuery } from "@/src/features/store/hooks/useStoreQueries";
import { fadeInUp } from "@/src/shared/animation/motionPresets";
import { motion } from "@/src/shared/animation/motionTokens";
import { useT } from "@/src/shared/i18n";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { AppButton } from "@/src/shared/ui/AppButton";
import { Badge } from "@/src/shared/ui/Badge";
import { Panel } from "@/src/shared/ui/Panel";
import { Screen } from "@/src/shared/ui/Screen";
import { tokens } from "@/src/shared/theme/tokens";

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

export default function BundleDetailScreen() {
  const { t } = useT();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ bundleId: string | string[] }>();
  const bundleId = getParamValue(params.bundleId);
  const bundleQuery = useBundleDetailQuery(bundleId);
  const bundle = bundleQuery.data;

  if (bundleQuery.isLoading) {
    return (
      <Screen title={t("bundleDetail.title")} subtitle={t("bundleDetail.loadingSubtitle")}>
        <Panel>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.body, { color: colors.muted }]}>
            {t("bundleDetail.loadingBody")}
          </Text>
        </Panel>
      </Screen>
    );
  }

  if (bundleQuery.isError) {
    return (
      <Screen title={t("bundleDetail.title")} subtitle={t("bundleDetail.errorSubtitle")}>
        <Panel>
          <Badge tone="info">{t("store.catalogErrorBadge")}</Badge>
          <Text style={[styles.body, { color: colors.muted }]}>
            {t("store.catalogErrorMessage")}
          </Text>
        </Panel>
      </Screen>
    );
  }

  if (!bundle) {
    return (
      <Screen title={t("bundleDetail.title")} subtitle={t("bundleDetail.missingSubtitle")}>
        <Panel>
          <Text style={[styles.body, { color: colors.muted }]}>
            {t("bundleDetail.missingBody")}
          </Text>
        </Panel>
      </Screen>
    );
  }

  return (
    <Screen
      title={bundle.title}
      subtitle={t("bundleDetail.subtitle")}
    >
      <Animated.View entering={fadeInUp(0)}>
        <Panel>
          <Badge tone={bundle.owned ? "primary" : "accent"}>
            {bundle.owned ? t("bundleDetail.unlockedBadge") : t("bundleDetail.paidBadge")}
          </Badge>
          <Text style={[styles.price, { color: colors.ink }]}>{bundle.priceText}</Text>
          <Text style={[styles.body, { color: colors.muted }]}>{bundle.description}</Text>
          <AppButton disabled={!bundle.owned}>
            {bundle.owned
              ? t("bundleDetail.unlockedAction")
              : t("bundleDetail.billingComingSoon")}
          </AppButton>
        </Panel>
      </Animated.View>

      <Animated.View entering={fadeInUp(motion.delay.stagger)}>
        <Panel>
          <Text style={[styles.sectionTitle, { color: colors.ink }]}>
            {t("bundleDetail.includedDecks")}
          </Text>
          {bundle.items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.copy}>
                <Text style={[styles.itemTitle, { color: colors.ink }]}>{item.deckTitle}</Text>
                <Text style={[styles.itemMeta, { color: colors.muted }]}>
                  {t("bundleDetail.cardCount", { count: item.cardCount })}
                </Text>
              </View>
              <Badge tone="info">#{item.position + 1}</Badge>
            </View>
          ))}
        </Panel>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  price: {
    ...tokens.typography.hero,
  },
  body: {
    ...tokens.typography.body,
  },
  sectionTitle: {
    ...tokens.typography.heading,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: tokens.spacing.s,
    paddingVertical: tokens.spacing.xs,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    ...tokens.typography.subheading,
  },
  itemMeta: {
    ...tokens.typography.caption,
  },
});
