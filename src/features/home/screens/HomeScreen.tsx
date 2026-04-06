import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { useDeckListQuery } from "@/src/features/decks/hooks/useDeckQueries";
import { useBundleCatalogQuery } from "@/src/features/store/hooks/useStoreQueries";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { AppButton } from "@/src/shared/ui/AppButton";
import { Badge } from "@/src/shared/ui/Badge";
import { Panel } from "@/src/shared/ui/Panel";
import { Screen } from "@/src/shared/ui/Screen";
import { tokens } from "@/src/shared/theme/tokens";

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const deckQuery = useDeckListQuery();
  const bundleQuery = useBundleCatalogQuery();

  const decks = deckQuery.data ?? [];
  const bundles = bundleQuery.data ?? [];
  const quickStudyDeck = decks.find((item) => item.sourceType === "user") ?? decks[0];

  return (
    <Screen
      title="Home"
      subtitle="로컬 학습 상태는 SQLite에 두고, 계정/권한은 별도 경계에서 연결하는 MVP 구조입니다."
    >
      <Panel accentColor={quickStudyDeck?.accentColor ?? colors.primary}>
        <Badge tone="primary">Today</Badge>
        <Text style={[styles.heroTitle, { color: colors.ink }]}>
          {quickStudyDeck ? quickStudyDeck.title : "첫 단어장을 만들 준비가 되어 있습니다"}
        </Text>
        <Text style={[styles.heroBody, { color: colors.muted }]}>
          {quickStudyDeck
            ? `${quickStudyDeck.cardCount}장의 카드로 바로 학습을 시작하거나 편집 화면에서 구조를 다듬을 수 있습니다.`
            : "내 단어장에서 새 단어장을 생성하면 홈에서 바로 학습 루틴을 시작할 수 있습니다."}
        </Text>
        <View style={styles.heroActions}>
          <AppButton
            onPress={() =>
              quickStudyDeck
                ? router.push({
                    pathname: "/study/[deckId]",
                    params: { deckId: quickStudyDeck.id },
                  })
                : router.push({
                    pathname: "/decks/[deckId]/edit",
                    params: { deckId: "new" },
                  })
            }
          >
            {quickStudyDeck ? "Start Study" : "Create First Deck"}
          </AppButton>
          <AppButton onPress={() => router.push("/decks")} variant="secondary">
            View Decks
          </AppButton>
        </View>
      </Panel>

      <View style={styles.statGrid}>
        <Panel style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.ink }]}>{decks.length}</Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>available decks</Text>
        </Panel>
        <Panel style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.ink }]}>{bundles.length}</Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>store bundles</Text>
        </Panel>
      </View>

      <Panel>
        <Badge tone="info">Next Focus</Badge>
        <Text style={[styles.sectionTitle, { color: colors.ink }]}>MVP routes already wired</Text>
        <Text style={[styles.sectionBody, { color: colors.muted }]}>
          홈, 내 단어장, 편집, 학습, 스토어, 번들 상세, 프로필 화면이 각각 repository/service 계층 위에 연결되어 있습니다.
        </Text>
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroTitle: {
    fontSize: 28,
    fontWeight: "800",
  },
  heroBody: {
    fontSize: 15,
    lineHeight: 23,
  },
  heroActions: {
    flexDirection: "row",
    gap: tokens.spacing.s,
  },
  statGrid: {
    flexDirection: "row",
    gap: tokens.spacing.s,
  },
  statCard: {
    flex: 1,
  },
  statValue: {
    fontSize: 26,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  sectionBody: {
    fontSize: 15,
    lineHeight: 23,
  },
});
