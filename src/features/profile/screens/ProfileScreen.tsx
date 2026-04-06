import { useMutation } from "@tanstack/react-query";
import { StyleSheet, Text, View } from "react-native";

import { useAppServices } from "@/src/app/AppProviders";
import { hasSupabaseConfig } from "@/src/core/supabase/config";
import { AppButton } from "@/src/shared/ui/AppButton";
import { Badge } from "@/src/shared/ui/Badge";
import { Panel } from "@/src/shared/ui/Panel";
import { Screen } from "@/src/shared/ui/Screen";
import { tokens } from "@/src/shared/theme/tokens";

export default function ProfileScreen() {
  const { entitlementService } = useAppServices();
  const syncMutation = useMutation({
    mutationFn: () => entitlementService.syncAsync(),
  });

  return (
    <Screen
      title="Profile"
      subtitle="계정, entitlement sync, 결제 복구 같은 서버 연동성은 여기서 출발하도록 분리했습니다."
    >
      <Panel accentColor={hasSupabaseConfig ? tokens.colors.primary : tokens.colors.info}>
        <Badge tone={hasSupabaseConfig ? "primary" : "info"}>
          {hasSupabaseConfig ? "Supabase Ready" : "Local Mode"}
        </Badge>
        <Text style={styles.title}>Sync boundary status</Text>
        <Text style={styles.body}>
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
        <Text style={styles.title}>Next integrations</Text>
        <View style={styles.list}>
          <Text style={styles.listItem}>SQLite study state to Supabase user scope mapping</Text>
          <Text style={styles.listItem}>Billing provider to entitlement upsert bridge</Text>
          <Text style={styles.listItem}>Auth session to local user id replacement</Text>
        </View>
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: tokens.colors.ink,
  },
  body: {
    fontSize: 15,
    lineHeight: 23,
    color: tokens.colors.muted,
  },
  list: {
    gap: tokens.spacing.s,
  },
  listItem: {
    fontSize: 15,
    lineHeight: 21,
    color: tokens.colors.muted,
  },
});
