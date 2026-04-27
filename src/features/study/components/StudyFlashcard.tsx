import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ComponentProps, memo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";

import { StudyCard } from "@/src/core/domain/models";
import { AnimatedFlipCard } from "@/src/shared/animation/AnimatedFlipCard";
import { cardStackEnter } from "@/src/shared/animation/motionPresets";
import { SwipeStudyCard } from "@/src/shared/animation/SwipeStudyCard";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";

type StudyFlashcardProps = {
  card: StudyCard;
  disabled?: boolean;
  onRate: (rating: 1 | 2 | 3) => void;
  labels: {
    tapToReveal: string;
    again: string;
    againSub: string;
    good: string;
    goodSub: string;
    easy: string;
    easySub: string;
    swipeHint: string;
    listen: string;
  };
};

function StudyFlashcardComponent({
  card,
  disabled = false,
  onRate,
  labels,
}: StudyFlashcardProps) {
  const { colors, flashcardTextStyle } = useTheme();
  const [flipped, setFlipped] = useState(false);
  const exampleParts = splitExample(card.card.example, card.card.term);

  return (
    <Animated.View key={card.card.id} entering={cardStackEnter()} style={styles.root}>
      <SwipeStudyCard
        disabled={disabled}
        leftActionLabel={labels.again}
        upActionLabel={labels.good}
        rightActionLabel={labels.easy}
        onSwipeComplete={(direction) => {
          const ratingMap = { left: 1, up: 2, right: 3 } as const;
          onRate(ratingMap[direction]);
        }}
      >
        <AnimatedFlipCard
          back={
            <View
              style={[
                styles.card,
                tokens.elevation.card,
                { backgroundColor: colors.surface, borderColor: colors.line },
              ]}
            >
              <View style={styles.cardCenter}>
                <Text style={[styles.meaningText, flashcardTextStyle, { color: colors.ink }]}>
                  {card.card.meaning}
                </Text>
                {card.card.note ? (
                  <Text style={[styles.noteText, { color: colors.muted }]}>
                    {card.card.note}
                  </Text>
                ) : null}
              </View>
            </View>
          }
          flipped={flipped}
          onPress={() => {
            if (!disabled) {
              setFlipped((current) => !current);
            }
          }}
        >
          <View
            style={[
              styles.card,
              tokens.elevation.card,
              { backgroundColor: colors.surface, borderColor: colors.line },
            ]}
          >
            <View style={styles.cardCenter}>
              <Text style={[styles.termText, flashcardTextStyle, { color: colors.ink }]}>
                {card.card.term}
              </Text>
              <View
                accessibilityLabel={labels.listen}
                accessibilityRole="image"
                style={styles.soundButton}
              >
                <MaterialCommunityIcons color={colors.muted} name="volume-high" size={42} />
              </View>
              <Text style={[styles.hint, { color: colors.muted }]}>{labels.tapToReveal}</Text>
            </View>
          </View>
        </AnimatedFlipCard>
      </SwipeStudyCard>

      {flipped ? (
        <View style={[styles.answerBox, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.answerText, { color: colors.ink }]}>
            {card.card.meaning}
          </Text>
        </View>
      ) : null}

      {card.card.example ? (
        <View style={[styles.exampleBox, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <View style={[styles.exampleAccent, { backgroundColor: colors.primary }]} />
          <Text style={[styles.exampleText, { color: colors.ink }]}>
            {exampleParts.before}
            {exampleParts.match ? (
              <Text style={{ color: colors.primary }}>{exampleParts.match}</Text>
            ) : null}
            {exampleParts.after}
          </Text>
        </View>
      ) : null}

      <View style={styles.ratingRow}>
        <RatingButton
          disabled={disabled}
          iconName="reload"
          label={labels.again}
          onPress={() => onRate(1)}
          sublabel={labels.againSub}
          tone="again"
        />
        <RatingButton
          disabled={disabled}
          iconName="star-outline"
          label={labels.good}
          onPress={() => onRate(2)}
          sublabel={labels.goodSub}
          tone="good"
        />
        <RatingButton
          disabled={disabled}
          iconName="check"
          label={labels.easy}
          onPress={() => onRate(3)}
          sublabel={labels.easySub}
          tone="easy"
        />
      </View>

      <Text style={[styles.swipeHint, { color: colors.muted }]}>{labels.swipeHint}</Text>
    </Animated.View>
  );
}

export const StudyFlashcard = memo(StudyFlashcardComponent);

const styles = StyleSheet.create({
  root: {
    gap: tokens.spacing.m,
  },
  card: {
    alignItems: "center",
    aspectRatio: 0.9,
    borderRadius: tokens.radius.l,
    borderWidth: 1,
    justifyContent: "center",
    maxHeight: 430,
    minHeight: 360,
    padding: tokens.spacing.xl,
  },
  cardCenter: {
    alignItems: "center",
    gap: tokens.spacing.l,
  },
  termText: {
    ...tokens.typography.flashcardTerm,
    textAlign: "center",
  },
  meaningText: {
    ...tokens.typography.flashcardMeaning,
    textAlign: "center",
  },
  noteText: {
    ...tokens.typography.body,
    textAlign: "center",
  },
  soundButton: {
    alignItems: "center",
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  hint: {
    ...tokens.typography.body,
    marginTop: tokens.spacing.xl,
  },
  answerBox: {
    alignItems: "center",
    borderRadius: tokens.radius.s,
    borderWidth: 1,
    minHeight: 64,
    justifyContent: "center",
    padding: tokens.spacing.s,
  },
  answerText: {
    ...tokens.typography.heading,
  },
  exampleBox: {
    borderRadius: tokens.radius.s,
    borderWidth: 1,
    gap: tokens.spacing.xs,
    padding: tokens.spacing.m,
    paddingLeft: tokens.spacing.l,
  },
  exampleAccent: {
    bottom: tokens.spacing.s,
    borderRadius: tokens.radius.pill,
    left: tokens.spacing.s,
    position: "absolute",
    top: tokens.spacing.s,
    width: 3,
  },
  exampleText: {
    ...tokens.typography.body,
  },
  ratingRow: {
    flexDirection: "row",
    gap: tokens.spacing.s,
  },
  ratingButton: {
    alignItems: "center",
    borderRadius: tokens.radius.s,
    borderWidth: 1,
    flex: 1,
    gap: 2,
    minHeight: 82,
    justifyContent: "center",
    padding: tokens.spacing.s,
  },
  ratingLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  ratingLabel: {
    ...tokens.typography.bodyBold,
  },
  ratingSublabel: {
    ...tokens.typography.caption,
  },
  swipeHint: {
    ...tokens.typography.body,
    textAlign: "center",
  },
});

function RatingButton({
  disabled,
  iconName,
  label,
  onPress,
  sublabel,
  tone,
}: {
  disabled: boolean;
  iconName: ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  onPress: () => void;
  sublabel: string;
  tone: "again" | "good" | "easy";
}) {
  const { colors } = useTheme();
  const toneStyle = {
    again: {
      backgroundColor: colors.chipAgainBg,
      borderColor: colors.chipAgainBorder,
      color: colors.accent,
    },
    good: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.chipAgainBorder,
      color: colors.accent,
    },
    easy: {
      backgroundColor: colors.infoSoft,
      borderColor: colors.chipEasyBorder,
      color: colors.info,
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
        <MaterialCommunityIcons color={toneStyle.color} name={iconName} size={26} />
        <Text style={[styles.ratingLabel, { color: toneStyle.color }]}>{label}</Text>
      </View>
      <Text style={[styles.ratingSublabel, { color: colors.muted }]}>{sublabel}</Text>
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
