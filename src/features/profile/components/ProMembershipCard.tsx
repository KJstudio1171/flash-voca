import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { openPlaySubscriptionManagement } from "@/src/features/billing/utils/playSubscriptionDeeplink";
import { useProAccess } from "@/src/features/billing/hooks/useProAccess";
import { useT } from "@/src/shared/i18n";
import { useFormat } from "@/src/shared/i18n";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";
import { AppButton } from "@/src/shared/ui/AppButton";
import { Panel } from "@/src/shared/ui/Panel";

export function ProMembershipCard() {
  const { t } = useT();
  const { colors } = useTheme();
  const { isPro, expiresAt, kind, autoRenewing } = useProAccess();
  const router = useRouter();
  const { date } = useFormat();

  if (!isPro) {
    return (
      <Panel>
        <Text style={[styles.title, { color: colors.ink }]}>{t("pro.title")}</Text>
        <Text style={[styles.body, { color: colors.muted }]}>{t("pro.heroDescription")}</Text>
        <View style={styles.action}>
          <AppButton onPress={() => router.push("/upgrade")}>
            {t("pro.upgradeButton")}
          </AppButton>
        </View>
      </Panel>
    );
  }

  const subtitle =
    kind === "lifetime"
      ? t("pro.lifetimeBadge")
      : expiresAt && autoRenewing
        ? t("pro.nextRenewal", { date: date(expiresAt) })
        : expiresAt
          ? t("pro.expiresOn", { date: date(expiresAt) })
          : t("pro.activeStatus");

  return (
    <Panel>
      <Text style={[styles.title, { color: colors.ink }]}>⭐ {t("pro.activeStatus")}</Text>
      <Text style={[styles.body, { color: colors.muted }]}>{subtitle}</Text>
      {kind === "subscription" ? (
        <View style={styles.action}>
          <AppButton variant="secondary" onPress={() => openPlaySubscriptionManagement()}>
            {t("pro.managePlay")}
          </AppButton>
        </View>
      ) : null}
    </Panel>
  );
}

const styles = StyleSheet.create({
  title: {
    ...tokens.typography.heading,
  },
  body: {
    ...tokens.typography.body,
  },
  action: {
    marginTop: tokens.spacing.s ?? 8,
  },
});
