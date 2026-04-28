import type { ReviewRating } from "@/src/core/domain/models";

export const ratingToInt: Record<ReviewRating, number> = {
  again: 1,
  hard: 2,
  good: 3,
  easy: 4,
};

const intToRatingMap: Record<number, ReviewRating> = {
  0: "again",
  1: "again",
  2: "hard",
  3: "good",
  4: "easy",
};

export function ratingFromInt(value: number): ReviewRating {
  return intToRatingMap[value] ?? "again";
}
