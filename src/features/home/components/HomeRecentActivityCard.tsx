import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ComponentProps } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";

export type HomeRecentActivityItem = {
  id: string;
  title: string;
  timeLabel: string;
  resultLabel: string;
  resultTone: "good" | "again";
  iconName: ComponentProps<typeof MaterialCommunityIcons>["name"];
};

type HomeRecentActivityCardProps = {
  items: HomeRecentActivityItem[];
  emptyLabel: string;
};

export function HomeRecentActivityCard({ emptyLabel, items }: HomeRecentActivityCardProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.root,
        tokens.elevation.soft,
        { backgroundColor: colors.surface, borderColor: colors.line },
      ]}
    >
      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.muted }]}>{emptyLabel}</Text>
        </View>
      ) : null}

      {items.map((item, index) => {
        const toneStyles =
          item.resultTone === "good"
            ? {
                backgroundColor: colors.successSoft,
                borderColor: colors.success,
                color: colors.success,
              }
            : {
                backgroundColor: colors.dangerSoft,
                borderColor: colors.danger,
                color: colors.danger,
              };

        return (
          <View key={item.id}>
            <View style={styles.row}>
              <View style={[styles.iconFrame, { backgroundColor: colors.infoSoft }]}>
                <MaterialCommunityIcons
                  color={colors.info}
                  name={item.iconName}
                  size={22}
                />
              </View>
              <View style={styles.copy}>
                <Text style={[styles.title, { color: colors.ink }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[styles.time, { color: colors.muted }]}>
                  {item.timeLabel}
                </Text>
              </View>
              <View
                style={[
                  styles.result,
                  {
                    backgroundColor: toneStyles.backgroundColor,
                    borderColor: toneStyles.borderColor,
                  },
                ]}
              >
                <Text style={[styles.resultLabel, { color: toneStyles.color }]}>
                  {item.resultLabel}
                </Text>
              </View>
            </View>
            {index < items.length - 1 ? (
              <View style={[styles.divider, { backgroundColor: colors.line }]} />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderRadius: tokens.radius.m,
    borderWidth: tokens.borderWidth.hairline,
    overflow: "hidden",
    paddingHorizontal: tokens.spacing.m,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: tokens.spacing.s,
    minHeight: 68,
  },
  emptyState: {
    minHeight: 68,
    justifyContent: "center",
  },
  emptyText: {
    ...tokens.typography.body,
  },
  iconFrame: {
    alignItems: "center",
    borderRadius: tokens.radius.s,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...tokens.typography.bodyBold,
  },
  time: {
    ...tokens.typography.caption,
  },
  result: {
    borderRadius: tokens.radius.pill,
    borderWidth: tokens.borderWidth.hairline,
    minWidth: 72,
    paddingHorizontal: tokens.spacing.s,
    paddingVertical: 7,
  },
  resultLabel: {
    ...tokens.typography.label,
    textAlign: "center",
  },
  divider: {
    height: 1,
    marginLeft: 50,
  },
});
