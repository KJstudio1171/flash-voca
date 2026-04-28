import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { useAppServices } from "@/src/app/AppProviders";
import { AccountLinkCard } from "@/src/features/profile/components/AccountLinkCard";
import { useRestorePurchases } from "@/src/features/store/hooks/useRestorePurchases";
import { hasSupabaseConfig } from "@/src/core/supabase/config";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { useT } from "@/src/shared/i18n";
import { AppButton } from "@/src/shared/ui/AppButton";
import { Badge } from "@/src/shared/ui/Badge";
import { Panel } from "@/src/shared/ui/Panel";
import { Screen } from "@/src/shared/ui/Screen";
import { tokens } from "@/src/shared/theme/tokens";
import { useToast } from "@/src/shared/ui/toast";

export default function ProfileScreen() {
  const { entitlementService } = useAppServices();
  const { colors } = useTheme();
  const { t } = useT();
  const router = useRouter();
  const toast = useToast();
  const syncMutation = useMutation({
    mutationFn: () => entitlementService.syncAsync(),
  });
  const restore = useRestorePurchases();

  const onRestorePress = async () => {
    try {
      const summary = await restore.mutateAsync();
      if (summary.restoredCount === 0) {
        toast.show(t("billing.restoreEmpty"));
      } else {
        toast.show(t("billing.restoreCompleted", { count: summary.restoredCount }));
      }
    } catch {
      // global handler will surface a toast for AppErrors
    }
  };

  return (
    <Screen
      title="Profile"
      subtitle="계정, entitlement sync, 결제 복구 같은 서버 연동성은 여기서 출발하도록 분리했습니다."
      rightSlot={
        <AppButton onPress={() => router.push("/settings")} variant="secondary">
          Settings
        </AppButton>
      }
    >
      <AccountLinkCard />

      <Panel>
        <Text style={[styles.title, { color: colors.ink }]}>{t("billing.restoreButton")}</Text>
        <AppButton onPress={onRestorePress} disabled={restore.isPending}>
          {restore.isPending ? t("billing.restoring") : t("billing.restoreButton")}
        </AppButton>
      </Panel>

      <Panel>
        <Badge tone={hasSupabaseConfig ? "primary" : "info"}>
          {hasSupabaseConfig ? "Supabase Ready" : "Local Mode"}
        </Badge>
        <Text style={[styles.title, { color: colors.ink }]}>Sync boundary status</Text>
        <Text style={[styles.body, { color: colors.muted }]}>
          {hasSupabaseConfig
            ? "환경 변수가 있으면 entitlement pull 지점을 바로 연결할 수 있습니다."
            : "현재는 로컬 우선 모드입니다. Supabase URL/Anon key를 넣으면 권한 동기화 지점을 활성화할 수 있습니다."}
        </Text>
        <AppButton
          disabled={!hasSupabaseConfig || syncMutation.isPending}
          onPress={() => {
            void syncMutation.mutateAsync();
          }}
        >
          {syncMutation.isPending ? "Syncing..." : "Sync Entitlements"}
        </AppButton>
      </Panel>

      <Panel>
        <Text style={[styles.title, { color: colors.ink }]}>Next integrations</Text>
        <View style={styles.list}>
          <Text style={[styles.listItem, { color: colors.muted }]}>SQLite study state to Supabase user scope mapping</Text>
          <Text style={[styles.listItem, { color: colors.muted }]}>Billing provider to entitlement upsert bridge</Text>
        </View>
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    ...tokens.typography.heading,
  },
  body: {
    ...tokens.typography.body,
  },
  list: {
    gap: tokens.spacing.s,
  },
  listItem: {
    ...tokens.typography.body,
  },
});
