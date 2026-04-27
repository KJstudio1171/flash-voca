import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ComponentProps } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { StoreBundleDetail } from "@/src/core/domain/models";
import { useBundleDetailQuery } from "@/src/features/store/hooks/useStoreQueries";
import { AnimatedScreen } from "@/src/shared/animation/AnimatedScreen";
import { useT } from "@/src/shared/i18n";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";
import { AppButton } from "@/src/shared/ui/AppButton";
import { AppScreenFrame } from "@/src/shared/ui/AppScreenFrame";
import { Badge } from "@/src/shared/ui/Badge";
import { CardSurface } from "@/src/shared/ui/CardSurface";
import { ScreenSection } from "@/src/shared/ui/ScreenSection";

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

export default function BundleDetailScreen() {
  const { t } = useT();
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ bundleId: string | string[] }>();
  const bundleId = getParamValue(params.bundleId);
  const bundleQuery = useBundleDetailQuery(bundleId);
  const bundle = bundleQuery.data;

  return (
    <AppScreenFrame
      contentStyle={styles.screenContent}
      headerSlot={
        <View style={styles.topBar}>
          <HeaderIconButton iconName="arrow-left" onPress={() => router.back()} />
          <HeaderIconButton disabled iconName="share-variant-outline" />
        </View>
      }
    >
      {bundleQuery.isLoading ? (
        <CardSurface>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.body, { color: colors.muted }]}>
            {t("bundleDetail.loadingBody")}
          </Text>
        </CardSurface>
      ) : null}

      {bundleQuery.isError ? (
        <CardSurface>
          <Badge tone="info">{t("store.catalogErrorBadge")}</Badge>
          <Text style={[styles.body, { color: colors.muted }]}>
            {t("store.catalogErrorMessage")}
          </Text>
        </CardSurface>
      ) : null}

      {!bundleQuery.isLoading && !bundleQuery.isError && !bundle ? (
        <CardSurface>
          <Text style={[styles.body, { color: colors.muted }]}>
            {t("bundleDetail.missingBody")}
          </Text>
        </CardSurface>
      ) : null}

      {bundle ? <BundleDetailContent bundle={bundle} /> : null}
    </AppScreenFrame>
  );
}

function BundleDetailContent({ bundle }: { bundle: StoreBundleDetail }) {
  const { t } = useT();
  const { colors } = useTheme();
  const totalCards = bundle.items.reduce((sum, item) => sum + item.cardCount, 0);

  return (
    <AnimatedScreen style={styles.content}>
      <View style={styles.heroRow}>
        <BundleCover bundle={bundle} />
        <View style={styles.heroCopy}>
          <Text numberOfLines={2} style={[styles.bundleTitle, { color: colors.ink }]}>
            {bundle.title}
          </Text>
          <Text style={[styles.bundleMeta, { color: colors.muted }]}>
            {t("bundleDetail.meta", {
              level: t("bundleDetail.defaultLevel"),
              count: totalCards,
            })}
          </Text>
          <Text style={[styles.price, { color: colors.ink }]}>{bundle.priceText}</Text>
          <AppButton disabled={!bundle.owned} style={styles.ctaButton}>
            {bundle.owned
              ? t("bundleDetail.unlockedAction")
              : t("bundleDetail.purchaseAndUnlock")}
          </AppButton>
        </View>
      </View>

      <View style={styles.statsRow}>
        <StatItem
          iconName="briefcase-outline"
          label={t("bundleDetail.totalCards")}
          value={String(totalCards)}
        />
        <StatItem
          iconName="clock-outline"
          label={t("bundleDetail.studyTime")}
          value={t("bundleDetail.studyTimeValue")}
        />
        <StatItem
          iconName="creation-outline"
          label={t("bundleDetail.difficulty")}
          value={t("bundleDetail.defaultLevel")}
        />
      </View>

      <ScreenSection title={t("bundleDetail.includedDecks")}>
        <View style={styles.includedList}>
          {bundle.items.map((item) => (
            <View key={item.id} style={styles.includedRow}>
              <Text style={[styles.bullet, { color: colors.primary }]}>•</Text>
              <Text numberOfLines={1} style={[styles.includedTitle, { color: colors.ink }]}>
                {item.deckTitle}
              </Text>
              <Text style={[styles.includedMeta, { color: colors.muted }]}>
                {t("bundleDetail.cardCount", { count: item.cardCount })}
              </Text>
            </View>
          ))}
        </View>
      </ScreenSection>

      <View style={[styles.divider, { backgroundColor: colors.line }]} />

      <ScreenSection title={t("bundleDetail.benefitsTitle")}>
        <View style={styles.benefitsList}>
          {[
            t("bundleDetail.benefits.expert"),
            t("bundleDetail.benefits.examples"),
            t("bundleDetail.benefits.updates"),
            t("bundleDetail.benefits.lifetime"),
          ].map((benefit) => (
            <BenefitRow key={benefit} label={benefit} />
          ))}
        </View>
      </ScreenSection>
    </AnimatedScreen>
  );
}

function BundleCover({ bundle }: { bundle: StoreBundleDetail }) {
  const { t } = useT();
  const { colors } = useTheme();
  const words = bundle.title.split(/\s+/).filter(Boolean);
  const titleLines = words.slice(0, 4).join("\n");

  return (
    <LinearGradient
      colors={[bundle.coverColor, colors.primary]}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={styles.cover}
    >
      <View style={styles.coverBubbleLarge} />
      <View style={styles.coverBubbleSmall} />
      <Text numberOfLines={4} style={[styles.coverTitle, { color: colors.onPrimary }]}>
        {titleLines}
      </Text>
      <View style={[styles.coverBadge, { backgroundColor: colors.surface }]}>
        <Text style={[styles.coverBadgeText, { color: colors.primary }]}>
          {bundle.owned ? t("store.ownedBadge") : t("bundleDetail.paidBadge")}
        </Text>
      </View>
    </LinearGradient>
  );
}

function StatItem({
  iconName,
  label,
  value,
}: {
  iconName: ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  value: string;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.statItem}>
      <MaterialCommunityIcons color={colors.ink} name={iconName} size={28} />
      <Text style={[styles.statValue, { color: colors.ink }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

function BenefitRow({ label }: { label: string }) {
  const { colors } = useTheme();

  return (
    <View style={styles.benefitRow}>
      <View style={[styles.checkCircle, { backgroundColor: colors.infoSoft }]}>
        <MaterialCommunityIcons color={colors.info} name="check" size={22} />
      </View>
      <Text style={[styles.benefitLabel, { color: colors.ink }]}>{label}</Text>
    </View>
  );
}

function HeaderIconButton({
  disabled = false,
  iconName,
  onPress,
}: {
  disabled?: boolean;
  iconName: ComponentProps<typeof MaterialCommunityIcons>["name"];
  onPress?: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.headerButton,
        { opacity: disabled ? 0.35 : pressed ? 0.55 : 1 },
      ]}
    >
      <MaterialCommunityIcons color={colors.ink} name={iconName} size={30} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    gap: tokens.spacing.l,
    paddingTop: tokens.spacing.l,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 58,
    paddingHorizontal: tokens.spacing.l,
  },
  headerButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  content: {
    gap: tokens.spacing.xl,
  },
  heroRow: {
    flexDirection: "row",
    gap: tokens.spacing.l,
  },
  cover: {
    borderRadius: tokens.radius.m,
    height: 210,
    overflow: "hidden",
    padding: tokens.spacing.l,
    width: "43%",
  },
  coverBubbleLarge: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: tokens.radius.pill,
    height: 92,
    position: "absolute",
    right: -24,
    top: 88,
    width: 92,
  },
  coverBubbleSmall: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: tokens.radius.pill,
    bottom: 22,
    height: 64,
    position: "absolute",
    right: 18,
    width: 64,
  },
  coverTitle: {
    fontSize: 31,
    fontWeight: "800",
    lineHeight: 39,
  },
  coverBadge: {
    alignSelf: "flex-start",
    borderRadius: tokens.radius.pill,
    bottom: tokens.spacing.l,
    paddingHorizontal: tokens.spacing.m,
    paddingVertical: 8,
    position: "absolute",
    left: tokens.spacing.l,
  },
  coverBadgeText: {
    ...tokens.typography.captionBold,
  },
  heroCopy: {
    flex: 1,
    justifyContent: "center",
    gap: tokens.spacing.s,
  },
  bundleTitle: {
    ...tokens.typography.heading,
  },
  bundleMeta: {
    ...tokens.typography.body,
  },
  price: {
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 38,
    marginTop: tokens.spacing.l,
  },
  ctaButton: {
    borderRadius: tokens.radius.m,
    marginTop: tokens.spacing.s,
  },
  statsRow: {
    flexDirection: "row",
  },
  statItem: {
    alignItems: "center",
    borderRightWidth: StyleSheet.hairlineWidth,
    flex: 1,
    gap: 4,
  },
  statValue: {
    ...tokens.typography.subheading,
  },
  statLabel: {
    ...tokens.typography.caption,
  },
  includedList: {
    gap: tokens.spacing.s,
  },
  includedRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: tokens.spacing.s,
  },
  bullet: {
    fontSize: 24,
    lineHeight: 24,
  },
  includedTitle: {
    ...tokens.typography.bodyBold,
    flex: 1,
  },
  includedMeta: {
    ...tokens.typography.body,
  },
  divider: {
    height: 1,
  },
  benefitsList: {
    gap: tokens.spacing.m,
  },
  benefitRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: tokens.spacing.m,
  },
  checkCircle: {
    alignItems: "center",
    borderRadius: tokens.radius.pill,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  benefitLabel: {
    ...tokens.typography.bodyBold,
    flex: 1,
  },
  body: {
    ...tokens.typography.body,
  },
});
