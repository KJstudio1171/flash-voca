import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useDeckSync, useFailedDeckOpsCount } from "@/src/features/profile/hooks/useDeckSync";
import { useT, useFormat } from "@/src/shared/i18n";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";
import { AppButton } from "@/src/shared/ui/AppButton";
import { Panel } from "@/src/shared/ui/Panel";
import { useToast } from "@/src/shared/ui/toast";

export function SyncStatusCard() {
  const { t } = useT();
  const { colors } = useTheme();
  const { sync } = useDeckSync();
  const { data: failedCount = 0, refetch: refetchFailed } = useFailedDeckOpsCount();
  const toast = useToast();
  const { relative } = useFormat();
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const onPress = async () => {
    try {
      const result = await sync.mutateAsync();
      setLastSyncedAt(new Date().toISOString());
      void refetchFailed();
      if (result.pushed === 0 && result.pulled === 0) {
        toast.show(t("deckSync.toastNoChanges"));
      } else {
        toast.show(t("deckSync.toastSuccess"));
      }
    } catch {
      // surfaces via global error handler
    }
  };

  const lastSyncLabel = lastSyncedAt
    ? t("deckSync.lastSyncedAt", { time: relative(lastSyncedAt) })
    : t("deckSync.never");

  return (
    <Panel>
      <Text style={[styles.title, { color: colors.ink }]}>{t("deckSync.title")}</Text>
      <Text style={[styles.body, { color: colors.muted }]}>{lastSyncLabel}</Text>
      <View style={styles.action}>
        <AppButton onPress={onPress} disabled={sync.isPending}>
          {sync.isPending ? t("deckSync.syncing") : t("deckSync.button")}
        </AppButton>
      </View>
      {failedCount > 0 ? (
        <View style={styles.failedRow}>
          <Text style={[styles.body, { color: colors.muted }]}>
            {t("deckSync.failedItems", { count: failedCount })}
          </Text>
          <AppButton variant="secondary" onPress={onPress} disabled={sync.isPending}>
            {t("deckSync.retry")}
          </AppButton>
        </View>
      ) : null}
    </Panel>
  );
}

const styles = StyleSheet.create({
  title: { ...tokens.typography.heading },
  body: { ...tokens.typography.body },
  action: { marginTop: tokens.spacing.s },
  failedRow: {
    marginTop: tokens.spacing.s,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: tokens.spacing.s,
  },
});
