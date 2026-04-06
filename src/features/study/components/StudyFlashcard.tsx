import { memo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { StudyCard } from "@/src/core/domain/models";
import { AnimatedFlipCard } from "@/src/shared/animation/AnimatedFlipCard";
import { SwipeStudyCard } from "@/src/shared/animation/SwipeStudyCard";
import { Badge } from "@/src/shared/ui/Badge";
import { Panel } from "@/src/shared/ui/Panel";
import { tokens } from "@/src/shared/theme/tokens";

type StudyFlashcardProps = {
  card: StudyCard;
  currentIndex: number;
  totalCards: number;
  disabled?: boolean;
  onRate: (rating: 1 | 2 | 3) => void;
};

type StudyCardFaceProps = {
  title: string;
  body: string;
  footer: string;
  accentColor: string;
  badgeTone: "accent" | "info" | "primary";
  badgeLabel: string;
  progressLabel: string;
};

const StudyCardFace = memo(function StudyCardFace({
  title,
  body,
  footer,
  accentColor,
  badgeTone,
  badgeLabel,
  progressLabel,
}: StudyCardFaceProps) {
  return (
    <Panel accentColor={accentColor} style={styles.cardFace}>
      <View style={styles.faceHeader}>
        <Badge tone={badgeTone}>{badgeLabel}</Badge>
        <Text style={styles.progressLabel}>{progressLabel}</Text>
      </View>
      <View style={styles.faceBody}>
        <Text style={styles.headline}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
      <Text style={styles.footer}>{footer}</Text>
    </Panel>
  );
});

function StudyFlashcardComponent({
  card,
  currentIndex,
  totalCards,
  disabled = false,
  onRate,
}: StudyFlashcardProps) {
  const [flipped, setFlipped] = useState(false);
  const progressLabel = `${currentIndex + 1} / ${totalCards}`;
  const masteryLabel =
    card.state == null ? "New card" : `Mastery ${card.state.masteryLevel}`;

  return (
    <View style={styles.root}>
      <View style={styles.metaRow}>
        <Badge tone="info">{masteryLabel}</Badge>
        <Text style={styles.metaText}>Swipe left for Again, right for Easy</Text>
      </View>

      <SwipeStudyCard
        disabled={disabled}
        leftActionLabel="Again"
        rightActionLabel="Easy"
        onSwipeComplete={(direction) => {
          onRate(direction === "left" ? 1 : 3);
        }}
      >
        <AnimatedFlipCard
          back={
            <StudyCardFace
              accentColor={tokens.colors.accent}
              badgeLabel="Back"
              badgeTone="accent"
              body={card.card.example || "No example sentence yet."}
              footer="Again, Good, Easy all record to local review logs."
              progressLabel={progressLabel}
              title={card.card.meaning}
            />
          }
          flipped={flipped}
          onPress={() => {
            if (!disabled) {
              setFlipped((current) => !current);
            }
          }}
        >
          <StudyCardFace
            accentColor={tokens.colors.primary}
            badgeLabel="Front"
            badgeTone="primary"
            body={card.card.note || "Tap the card to reveal the answer."}
            footer="Keep one card mounted at a time for a lightweight session loop."
            progressLabel={progressLabel}
            title={card.card.term}
          />
        </AnimatedFlipCard>
      </SwipeStudyCard>
    </View>
  );
}

export const StudyFlashcard = memo(StudyFlashcardComponent);

const styles = StyleSheet.create({
  root: {
    gap: tokens.spacing.s,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacing.s,
  },
  metaText: {
    flex: 1,
    textAlign: "right",
    fontSize: 12,
    lineHeight: 18,
    color: tokens.colors.muted,
  },
  cardFace: {
    minHeight: 360,
    justifyContent: "space-between",
    paddingVertical: tokens.spacing.xl,
  },
  faceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacing.s,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: tokens.colors.muted,
  },
  faceBody: {
    gap: tokens.spacing.m,
  },
  headline: {
    fontSize: 34,
    fontWeight: "800",
    color: tokens.colors.ink,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: tokens.colors.muted,
  },
  footer: {
    fontSize: 13,
    lineHeight: 20,
    color: tokens.colors.muted,
  },
});
