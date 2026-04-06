import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { useBundleCatalogQuery } from "@/src/features/store/hooks/useStoreQueries";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { AppButton } from "@/src/shared/ui/AppButton";
import { Badge } from "@/src/shared/ui/Badge";
import { Panel } from "@/src/shared/ui/Panel";
import { Screen } from "@/src/shared/ui/Screen";
import { tokens } from "@/src/shared/theme/tokens";

export default function StoreScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const bundleQuery = useBundleCatalogQuery();
  const bundles = bundleQuery.data ?? [];

  return (
    <Screen
      title="Store"
      subtitle="공식 단어장 번들 카탈로그와 구매 권한을 분리해 두었습니다. 실제 결제 구현체는 나중에 연결하면 됩니다."
    >
      <Panel accentColor={colors.accent}>
        <Badge tone="accent">Paid Layer</Badge>
        <Text style={[styles.heroTitle, { color: colors.ink }]}>Official bundle catalog</Text>
        <Text style={[styles.heroBody, { color: colors.muted }]}>
          번들 목록은 로컬 캐시로 읽고, entitlement는 추후 스토어 SDK와 Supabase 동기화로 교체할 수 있게 분리했습니다.
        </Text>
      </Panel>

      {bundles.map((bundle) => (
        <Panel key={bundle.id} accentColor={bundle.coverColor}>
          <View style={styles.row}>
            <View style={styles.copy}>
              <Text style={[styles.bundleTitle, { color: colors.ink }]}>{bundle.title}</Text>
              <Text style={[styles.bundleMeta, { color: colors.muted }]}>
                {bundle.deckCount} decks · {bundle.priceText}
              </Text>
            </View>
            <Badge tone={bundle.owned ? "primary" : "accent"}>
              {bundle.owned ? "Owned" : "Locked"}
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
            View Bundle
          </AppButton>
        </Panel>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroTitle: {
    fontSize: 26,
    fontWeight: "800",
  },
  heroBody: {
    fontSize: 15,
    lineHeight: 23,
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
    fontSize: 20,
    fontWeight: "700",
  },
  bundleMeta: {
    fontSize: 13,
  },
  bundleDescription: {
    fontSize: 15,
    lineHeight: 22,
  },
});
