import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";

export type StoreCategoryId = "all" | "toeic" | "jlpt" | "business" | "travel";

export type StoreCategory = {
  id: StoreCategoryId;
  label: string;
};

type StoreCategoryChipsProps = {
  categories: StoreCategory[];
  selectedId: StoreCategoryId;
  onSelect: (id: StoreCategoryId) => void;
};

export function StoreCategoryChips({
  categories,
  selectedId,
  onSelect,
}: StoreCategoryChipsProps) {
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      {categories.map((category) => (
        <CategoryChip
          active={category.id === selectedId}
          key={category.id}
          label={category.label}
          onPress={() => onSelect(category.id)}
        />
      ))}
    </ScrollView>
  );
}

function CategoryChip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? colors.surface : colors.surfaceStrong,
          borderColor: active ? colors.primary : colors.line,
          opacity: pressed ? 0.72 : 1,
        },
      ]}
    >
      <Text style={[styles.label, { color: active ? colors.primary : colors.muted }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: tokens.spacing.s,
    paddingRight: tokens.layout.screenPadding,
  },
  chip: {
    borderRadius: tokens.radius.pill,
    borderWidth: tokens.borderWidth.hairline,
    minHeight: 42,
    minWidth: 74,
    paddingHorizontal: tokens.spacing.m,
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    ...tokens.typography.bodyBold,
  },
});
