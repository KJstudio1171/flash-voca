import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ComponentProps, memo, useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";

import { ReviewRating, StudyCard } from "@/src/core/domain/models";
import { AnimatedFlipCard } from "@/src/shared/animation/AnimatedFlipCard";
import { cardStackEnter } from "@/src/shared/animation/motionPresets";
import { SwipeStudyCard } from "@/src/shared/animation/SwipeStudyCard";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";

type StudyFlashcardProps = {
  card: StudyCard;
  disabled?: boolean;
  enableSwipe: boolean;
  allowFrontSwipe: boolean;
  isBookmarked: boolean;
  showRatingButtons: boolean;
  onToggleBookmark: () => void;
  onRate: (rating: ReviewRating) => void;
  labels: {
    tapToReveal: string;
    again: string;
    good: string;
    easy: string;
    swipeHint: string;
    listen: string;
    example: string;
    extraInfo: string;
    synonyms: string;
    relatedExpressions: string;
    memo: string;
  };
};

function StudyFlashcardComponent({
  card,
  disabled = false,
  enableSwipe,
  allowFrontSwipe,
  isBookmarked,
  showRatingButtons,
  onToggleBookmark,
  onRate,
  labels,
}: StudyFlashcardProps) {
  const { colors, flashcardTextStyle } = useTheme();
  const [flipped, setFlipped] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const cardDetail = card.card;
  const exampleParts = splitExample(cardDetail.example, cardDetail.term);
  const canSwipe = !disabled && enableSwipe && (allowFrontSwipe || flipped);

  useEffect(() => {
    setFlipped(false);
    setImageFailed(false);
  }, [cardDetail.id, cardDetail.imageUri]);

  return (
    <Animated.View key={cardDetail.id} entering={cardStackEnter()} style={styles.root}>
      <SwipeStudyCard
        disabled={!canSwipe}
        leftActionLabel={labels.again}
        rightActionLabel={labels.easy}
        upActionLabel={labels.good}
        onSwipeComplete={(direction) => {
          const ratingMap = { left: "again", up: "good", right: "easy" } as const;
          onRate(ratingMap[direction]);
        }}
      >
        <AnimatedFlipCard
          back={
            <StudyCardFace>
              <View style={styles.cardHeader}>
                <Text
                  numberOfLines={2}
                  style={[styles.answerTerm, flashcardTextStyle, { color: colors.ink }]}
                >
                  {cardDetail.term}
                </Text>
                <VolumeIcon accessibilityLabel={labels.listen} />
                {cardDetail.pronunciation ? (
                  <Text style={[styles.pronunciation, { color: colors.muted }]}>
                    {cardDetail.pronunciation}
                  </Text>
                ) : null}
                {cardDetail.partOfSpeech ? (
                  <View style={[styles.partBadge, { backgroundColor: colors.primarySoft }]}>
                    <Text style={[styles.partBadgeText, { color: colors.primary }]}>
                      {cardDetail.partOfSpeech}
                    </Text>
                  </View>
                ) : null}
              </View>

              {cardDetail.imageUri && !imageFailed ? (
                <Image
                  onError={() => setImageFailed(true)}
                  resizeMode="cover"
                  source={{ uri: cardDetail.imageUri }}
                  style={styles.studyImage}
                />
              ) : null}

              <Text style={[styles.meaningText, { color: colors.ink }]}>
                {cardDetail.meaning}
              </Text>

              {cardDetail.example ? (
                <View style={[styles.dividedBlock, { borderTopColor: colors.line }]}>
                  <Text style={[styles.blockLabel, { color: colors.primary }]}>
                    {labels.example}
                  </Text>
                  <Text style={[styles.exampleText, { color: colors.ink }]}>
                    {exampleParts.before}
                    {exampleParts.match ? (
                      <Text style={{ color: colors.primary }}>{exampleParts.match}</Text>
                    ) : null}
                    {exampleParts.after}
                  </Text>
                  {cardDetail.exampleTranslation ? (
                    <Text style={[styles.exampleText, { color: colors.ink }]}>
                      {cardDetail.exampleTranslation}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              <ExtraInfoRows
                labels={labels}
                note={cardDetail.note}
                relatedExpressions={cardDetail.relatedExpressions}
                synonyms={cardDetail.synonyms}
              />
            </StudyCardFace>
          }
          flipped={flipped}
          onPress={() => {
            if (!disabled) {
              setFlipped((current) => !current);
            }
          }}
        >
          <StudyCardFace centered>
            <Pressable
              accessibilityRole="button"
              onPress={onToggleBookmark}
              style={styles.bookmarkButton}
            >
              <MaterialCommunityIcons
                color={isBookmarked ? colors.primary : colors.muted}
                name={isBookmarked ? "star" : "star-outline"}
                size={28}
              />
            </Pressable>
            <Text
              numberOfLines={2}
              style={[styles.termText, flashcardTextStyle, { color: colors.ink }]}
            >
              {cardDetail.term}
            </Text>
            <VolumeIcon accessibilityLabel={labels.listen} />
            <Text style={[styles.hint, { color: colors.muted }]}>{labels.tapToReveal}</Text>
          </StudyCardFace>
        </AnimatedFlipCard>
      </SwipeStudyCard>

      {showRatingButtons ? (
        <View style={styles.ratingRow}>
          <RatingButton
            disabled={disabled}
            iconName="help-circle-outline"
            label={labels.again}
            onPress={() => onRate("again")}
            tone="again"
          />
          <RatingButton
            disabled={disabled}
            iconName="check"
            label={labels.easy}
            onPress={() => onRate("easy")}
            tone="easy"
          />
        </View>
      ) : null}

      {enableSwipe ? (
        <Text style={[styles.swipeHint, { color: colors.muted }]}>{labels.swipeHint}</Text>
      ) : null}
    </Animated.View>
  );
}

export const StudyFlashcard = memo(StudyFlashcardComponent);

function StudyCardFace({
  centered = false,
  children,
}: {
  centered?: boolean;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        centered ? styles.centeredCard : null,
        tokens.elevation.card,
        { backgroundColor: colors.surface, borderColor: colors.line },
      ]}
    >
      {children}
    </View>
  );
}

function VolumeIcon({ accessibilityLabel }: { accessibilityLabel: string }) {
  const { colors } = useTheme();

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      style={styles.soundButton}
    >
      <MaterialCommunityIcons color={colors.muted} name="volume-high" size={24} />
    </View>
  );
}

function ExtraInfoRows({
  labels,
  note,
  relatedExpressions,
  synonyms,
}: {
  labels: Pick<
    StudyFlashcardProps["labels"],
    "extraInfo" | "memo" | "relatedExpressions" | "synonyms"
  >;
  note: string | null;
  relatedExpressions: string | null;
  synonyms: string | null;
}) {
  const { colors } = useTheme();
  const rows = [
    { id: "synonyms", label: labels.synonyms, value: synonyms },
    { id: "related", label: labels.relatedExpressions, value: relatedExpressions },
    { id: "memo", label: labels.memo, value: note },
  ].filter((row) => row.value);

  if (rows.length === 0) {
    return null;
  }

  return (
    <View style={[styles.extraInfo, { borderTopColor: colors.line }]}>
      <Text style={[styles.blockLabel, { color: colors.primary }]}>
        {labels.extraInfo}
      </Text>
      {rows.map((row) => (
        <View key={row.id} style={[styles.extraRow, { borderBottomColor: colors.line }]}>
          <Text style={[styles.extraLabel, { color: colors.ink }]}>{row.label}</Text>
          <Text numberOfLines={2} style={[styles.extraValue, { color: colors.muted }]}>
            {row.value}
          </Text>
          <MaterialCommunityIcons color={colors.muted} name="chevron-down" size={20} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: tokens.spacing.m,
  },
  card: {
    borderRadius: tokens.radius.l,
    borderWidth: tokens.borderWidth.hairline,
    gap: tokens.spacing.m,
    minHeight: 420,
    padding: tokens.spacing.l,
  },
  centeredCard: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 420,
  },
  bookmarkButton: {
    position: "absolute",
    right: tokens.spacing.l,
    top: tokens.spacing.l,
  },
  cardHeader: {
    alignItems: "center",
    gap: tokens.spacing.xs,
  },
  termText: {
    ...tokens.typography.flashcardTerm,
    textAlign: "center",
  },
  answerTerm: {
    ...tokens.typography.hero,
    textAlign: "center",
  },
  meaningText: {
    ...tokens.typography.heading,
    textAlign: "center",
  },
  pronunciation: {
    ...tokens.typography.caption,
  },
  partBadge: {
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.spacing.s,
    paddingVertical: 4,
  },
  partBadgeText: {
    ...tokens.typography.micro,
  },
  soundButton: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  hint: {
    ...tokens.typography.body,
    marginTop: tokens.spacing.xl,
  },
  studyImage: {
    aspectRatio: 1.9,
    borderRadius: tokens.radius.s,
    width: "100%",
  },
  dividedBlock: {
    borderTopWidth: 1,
    gap: tokens.spacing.xs,
    paddingTop: tokens.spacing.m,
  },
  blockLabel: {
    ...tokens.typography.captionBold,
  },
  exampleText: {
    ...tokens.typography.body,
  },
  extraInfo: {
    borderTopWidth: 1,
    gap: tokens.spacing.xs,
    paddingTop: tokens.spacing.m,
  },
  extraRow: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: tokens.spacing.s,
    minHeight: 40,
  },
  extraLabel: {
    ...tokens.typography.captionBold,
    width: 86,
  },
  extraValue: {
    ...tokens.typography.caption,
    flex: 1,
  },
  ratingRow: {
    flexDirection: "row",
    gap: tokens.spacing.m,
  },
  ratingButton: {
    alignItems: "center",
    borderRadius: tokens.radius.s,
    borderWidth: tokens.borderWidth.hairline,
    flex: 1,
    minHeight: 64,
    justifyContent: "center",
    padding: tokens.spacing.s,
  },
  ratingLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  ratingLabel: {
    ...tokens.typography.bodyBold,
  },
  swipeHint: {
    ...tokens.typography.caption,
    textAlign: "center",
  },
});

function RatingButton({
  disabled,
  iconName,
  label,
  onPress,
  tone,
}: {
  disabled: boolean;
  iconName: ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  onPress: () => void;
  tone: "again" | "easy";
}) {
  const { colors } = useTheme();
  const toneStyle = {
    again: {
      backgroundColor: colors.surface,
      borderColor: colors.danger,
      color: colors.danger,
    },
    easy: {
      backgroundColor: colors.surface,
      borderColor: colors.success,
      color: colors.success,
    },
  }[tone];

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.ratingButton,
        {
          backgroundColor: toneStyle.backgroundColor,
          borderColor: toneStyle.borderColor,
          opacity: disabled ? 0.5 : pressed ? 0.72 : 1,
        },
      ]}
    >
      <View style={styles.ratingLabelRow}>
        <MaterialCommunityIcons color={toneStyle.color} name={iconName} size={24} />
        <Text style={[styles.ratingLabel, { color: toneStyle.color }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

function splitExample(example: string | null, term: string) {
  if (!example) {
    return { before: "", match: "", after: "" };
  }

  const index = example.toLocaleLowerCase().indexOf(term.toLocaleLowerCase());
  if (index < 0) {
    return { before: example, match: "", after: "" };
  }

  return {
    before: example.slice(0, index),
    match: example.slice(index, index + term.length),
    after: example.slice(index + term.length),
  };
}
