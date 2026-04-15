import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";

import { useBundleCatalogQuery } from "@/src/features/store/hooks/useStoreQueries";
import { staggeredList } from "@/src/shared/animation/motionPresets";
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
      <Panel>
        <Badge tone="accent">Paid Layer</Badge>
        <Text style={[styles.heroTitle, { color: colors.ink }]}>Official bundle catalog</Text>
        <Text style={[styles.heroBody, { color: colors.muted }]}>
          번들 목록은 로컬 캐시로 읽고, entitlement는 추후 스토어 SDK와 Supabase 동기화로 교체할 수 있게 분리했습니다.
        </Text>
      </Panel>

      {bundles.map((bundle, index) => (
        <Animated.View key={bundle.id} entering={staggeredList(index)}>
          <Panel>
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
});
