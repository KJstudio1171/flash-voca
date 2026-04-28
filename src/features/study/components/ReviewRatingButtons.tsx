import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { useAppServices } from "@/src/app/AppProviders";
import type { ReviewRating } from "@/src/core/domain/models";
import { getSrsAlgorithm } from "@/src/core/services/srs/srsAlgorithmRegistry";
import type { CardSrsState } from "@/src/core/services/srs/SrsAlgorithm";
import type { TranslationKey } from "@/src/shared/i18n";
import { useT } from "@/src/shared/i18n";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";

interface Props {
  cardState: CardSrsState;
  onRate: (rating: ReviewRating) => void;
  disabled?: boolean;
}

const ORDER: ReviewRating[] = ["again", "hard", "good", "easy"];

const RATING_KEYS: Record<ReviewRating, TranslationKey> = {
  again: "srs.rating.again",
  hard: "srs.rating.hard",
  good: "srs.rating.good",
  easy: "srs.rating.easy",
};

export function ReviewRatingButtons({ cardState, onRate, disabled }: Props) {
  const { t } = useT();
  const { colors } = useTheme();
  const { srsPreferenceService } = useAppServices();

  const { data: algoId = "leitner" } = useQuery({
    queryKey: ["srs", "algorithm"],
    queryFn: () => srsPreferenceService.getAlgorithmAsync(),
  });

  const algorithm = getSrsAlgorithm(algoId);

  const previews = useMemo(() => {
    const now = new Date().toISOString();
    return ORDER.map((rating) => {
      const next = algorithm.computeNextState(cardState, {
        rating,
        reviewedAt: now,
        elapsedMs: 0,
      });
      return { rating, intervalDays: next.intervalDays };
    });
  }, [algorithm, cardState]);

  const colorByRating: Record<ReviewRating, string> = {
    again: colors.danger,
    hard: colors.warning,
    good: colors.primary,
    easy: colors.success,
  };

  return (
    <View style={styles.row}>
      {previews.map((p) => (
        <Pressable
          key={p.rating}
          onPress={() => onRate(p.rating)}
          disabled={disabled}
          style={[
            styles.btn,
            { backgroundColor: colorByRating[p.rating], opacity: disabled ? 0.5 : 1 },
          ]}
        >
          <Text style={styles.label}>{t(RATING_KEYS[p.rating])}</Text>
          <Text style={styles.interval}>{formatInterval(p.intervalDays)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function formatInterval(days: number): string {
  if (days < 1) return "<1d";
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${Math.round(days / 365)}y`;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: tokens.spacing.s },
  btn: {
    flex: 1,
    paddingVertical: tokens.spacing.m,
    paddingHorizontal: tokens.spacing.s,
    borderRadius: tokens.radius.m,
    alignItems: "center",
    gap: 2,
  },
  label: { color: "#fff", ...tokens.typography.bodyBold },
  interval: { color: "#fff", opacity: 0.85, fontSize: 12 },
});
