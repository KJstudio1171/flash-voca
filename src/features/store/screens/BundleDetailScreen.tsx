import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { useBundleDetailQuery } from "@/src/features/store/hooks/useStoreQueries";
import { AppButton } from "@/src/shared/ui/AppButton";
import { Badge } from "@/src/shared/ui/Badge";
import { Panel } from "@/src/shared/ui/Panel";
import { Screen } from "@/src/shared/ui/Screen";
import { tokens } from "@/src/shared/theme/tokens";

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

export default function BundleDetailScreen() {
  const params = useLocalSearchParams<{ bundleId: string | string[] }>();
  const bundleId = getParamValue(params.bundleId);
  const bundleQuery = useBundleDetailQuery(bundleId);
  const bundle = bundleQuery.data;

  if (!bundle) {
    return (
      <Screen title="Bundle" subtitle="등록되지 않았거나 아직 로딩되지 않은 번들입니다.">
        <Panel>
          <Text style={styles.body}>스토어 카탈로그와 entitlement sync가 분리된 상태를 유지합니다.</Text>
        </Panel>
      </Screen>
    );
  }

  return (
    <Screen
      title={bundle.title}
      subtitle="번들 상세는 구매 UI와 권한 판단을 분리한 상태로 시작합니다."
    >
      <Panel accentColor={bundle.coverColor}>
        <Badge tone={bundle.owned ? "primary" : "accent"}>
          {bundle.owned ? "Unlocked" : "Paid Bundle"}
        </Badge>
        <Text style={styles.price}>{bundle.priceText}</Text>
        <Text style={styles.body}>{bundle.description}</Text>
        <AppButton disabled={!bundle.owned}>
          {bundle.owned ? "Unlocked for this account" : "Billing hook comes next"}
        </AppButton>
      </Panel>

      <Panel>
        <Text style={styles.sectionTitle}>Included decks</Text>
        {bundle.items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <View style={styles.copy}>
              <Text style={styles.itemTitle}>{item.deckTitle}</Text>
              <Text style={styles.itemMeta}>{item.cardCount} cards</Text>
            </View>
            <Badge tone="info">#{item.position + 1}</Badge>
          </View>
        ))}
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  price: {
    fontSize: 28,
    fontWeight: "800",
    color: tokens.colors.ink,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: tokens.colors.muted,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: tokens.colors.ink,
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
    fontSize: 16,
    fontWeight: "700",
    color: tokens.colors.ink,
  },
  itemMeta: {
    fontSize: 13,
    color: tokens.colors.muted,
  },
});
