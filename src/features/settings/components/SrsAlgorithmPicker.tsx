import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppServices } from "@/src/app/AppProviders";
import type { SrsAlgorithmId } from "@/src/core/services/srs/SrsAlgorithm";
import { useT } from "@/src/shared/i18n";
import type { TranslationKey } from "@/src/shared/i18n";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";
import { useToast } from "@/src/shared/ui/toast";

const OPTIONS: SrsAlgorithmId[] = ["leitner", "sm2"];
const TITLE_KEYS: Record<SrsAlgorithmId, TranslationKey> = {
  leitner: "srs.algorithm.leitner.title",
  sm2: "srs.algorithm.sm2.title",
};
const DESC_KEYS: Record<SrsAlgorithmId, TranslationKey> = {
  leitner: "srs.algorithm.leitner.description",
  sm2: "srs.algorithm.sm2.description",
};

export function SrsAlgorithmPicker() {
  const { t } = useT();
  const { colors } = useTheme();
  const { srsPreferenceService } = useAppServices();
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: current = "leitner" } = useQuery({
    queryKey: ["srs", "algorithm"],
    queryFn: () => srsPreferenceService.getAlgorithmAsync(),
  });

  const setAlgo = useMutation({
    mutationFn: (id: SrsAlgorithmId) => srsPreferenceService.setAlgorithmAsync(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["srs", "algorithm"] });
      toast.show(t("srs.algorithm.changed", { name: t(TITLE_KEYS[id]) }));
    },
  });

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.ink }]}>
        {t("srs.algorithm.sectionTitle")}
      </Text>
      {OPTIONS.map((id) => {
        const selected = current === id;
        return (
          <Pressable
            key={id}
            onPress={() => setAlgo.mutate(id)}
            disabled={setAlgo.isPending}
            style={[
              styles.option,
              {
                borderColor: selected ? colors.primary : colors.line,
                backgroundColor: selected
                  ? (colors as Record<string, string>).primarySoft ?? colors.surface
                  : colors.surface,
              },
            ]}
          >
            <View
              style={[
                styles.radio,
                { borderColor: selected ? colors.primary : colors.muted },
              ]}
            >
              {selected ? (
                <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />
              ) : null}
            </View>
            <View style={styles.optionBody}>
              <Text style={[styles.optionTitle, { color: colors.ink }]}>
                {t(TITLE_KEYS[id])}
              </Text>
              <Text style={[styles.optionDesc, { color: colors.muted }]}>
                {t(DESC_KEYS[id])}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: tokens.spacing.s },
  sectionTitle: { ...tokens.typography.heading, marginBottom: tokens.spacing.s },
  option: {
    flexDirection: "row",
    gap: tokens.spacing.m,
    padding: tokens.spacing.m,
    borderRadius: tokens.radius.l,
    borderWidth: tokens.borderWidth.hairline,
    alignItems: "center",
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  optionBody: { flex: 1, gap: 4 },
  optionTitle: { ...tokens.typography.body, fontWeight: "600" },
  optionDesc: { ...tokens.typography.body, fontSize: 13 },
});
