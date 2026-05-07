import { useMutation } from "@tanstack/react-query";
import { StyleSheet, Text, View } from "react-native";

import { useAppServices } from "@/src/app/AppServicesContext";
import { useAuthState } from "@/src/features/profile/hooks/useAuthState";
import { useT } from "@/src/shared/i18n";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";
import { AppButton } from "@/src/shared/ui/AppButton";
import { Panel } from "@/src/shared/ui/Panel";

export function AccountLinkCard() {
  const { t } = useT();
  const { authService } = useAppServices();
  const state = useAuthState();
  const { colors } = useTheme();
  const link = useMutation({ mutationFn: () => authService.linkGoogleAsync() });

  const subtitle =
    state.kind === "linked"
      ? t("auth.linkCard.linkedAs", { email: state.email ?? "" })
      : state.kind === "anonymous"
        ? t("auth.linkCard.linkedAnonymous")
        : t("auth.linkCard.description");

  return (
    <Panel>
      <Text style={[styles.title, { color: colors.ink }]}>
        {t("auth.linkCard.title")}
      </Text>
      <Text style={[styles.body, { color: colors.muted }]}>{subtitle}</Text>
      {state.kind !== "linked" ? (
        <View style={styles.action}>
          <AppButton
            disabled={link.isPending}
            onPress={() => {
              void link.mutateAsync();
            }}
          >
            {link.isPending ? t("auth.linkCard.linking") : t("auth.linkCard.button")}
          </AppButton>
        </View>
      ) : null}
    </Panel>
  );
}

const styles = StyleSheet.create({
  title: { ...tokens.typography.heading },
  body: { ...tokens.typography.body },
  action: { marginTop: tokens.spacing.s },
});
