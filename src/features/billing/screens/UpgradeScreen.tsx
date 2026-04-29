import { useEffect } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import { useProProducts } from "@/src/features/billing/hooks/useProProducts";
import { usePurchasePro } from "@/src/features/billing/hooks/usePurchasePro";
import { useT } from "@/src/shared/i18n";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";
import { AppButton } from "@/src/shared/ui/AppButton";
import { Panel } from "@/src/shared/ui/Panel";
import { trackSafely } from "@/src/core/observability";

export function UpgradeScreen() {
  const { t } = useT();
  const { colors } = useTheme();
  const products = useProProducts();
  const purchase = usePurchasePro();

  useEffect(() => {
    trackSafely("pro_upgrade_screen_viewed");
  }, []);

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.canvas }]}>
      <Text style={[styles.title, { color: colors.ink }]}>{t("pro.title")}</Text>
      <Text style={[styles.body, { color: colors.muted }]}>{t("pro.heroDescription")}</Text>

      <Panel>
        <Text style={[styles.heading, { color: colors.ink }]}>{t("pro.title")}</Text>
        <Text style={[styles.body, { color: colors.muted }]}>• {t("pro.benefits.adFree")}</Text>
        <Text style={[styles.body, { color: colors.muted }]}>• {t("pro.benefits.future")}</Text>
      </Panel>

      {products.isLoading ? <ActivityIndicator color={colors.primary} /> : null}

      {(products.data ?? []).map((p) => {
        const titleKey = `pro.plan.${p.kind}` as const;
        const isLifetime = p.kind === "lifetime";
        return (
          <Panel key={p.productId}>
            <Text style={[styles.heading, { color: colors.ink }]}>{t(titleKey)}</Text>
            <Text style={[styles.priceText, { color: colors.primary }]}>{p.priceText}</Text>
            <View style={styles.action}>
              <AppButton
                disabled={purchase.isPending}
                onPress={() => {
                  void purchase.mutateAsync(p.productId).catch(() => {});
                }}
              >
                {isLifetime ? t("pro.buyButton") : t("pro.subscribeButton")}
              </AppButton>
            </View>
          </Panel>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: tokens.spacing.l ?? 20,
    gap: tokens.spacing.m ?? 12,
  },
  title: {
    ...tokens.typography.hero,
    marginBottom: 4,
  },
  heading: {
    ...tokens.typography.heading,
    marginBottom: 4,
  },
  body: {
    ...tokens.typography.body,
  },
  priceText: {
    ...tokens.typography.heading,
    marginVertical: tokens.spacing.s ?? 8,
  },
  action: {
    marginTop: tokens.spacing.s ?? 8,
  },
});
