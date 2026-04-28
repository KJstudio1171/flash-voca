import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { useAuthGatedAction } from "@/src/features/store/hooks/useAuthGatedAction";
import { useT } from "@/src/shared/i18n";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";
import { AppButton } from "@/src/shared/ui/AppButton";

export function AccountRequiredModal() {
  const { t } = useT();
  const { modalVisible, confirm, cancel } = useAuthGatedAction();
  const { colors } = useTheme();

  return (
    <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={cancel}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.ink }]}>
            {t("billing.accountRequired.title")}
          </Text>
          <Text style={[styles.body, { color: colors.muted }]}>
            {t("billing.accountRequired.description")}
          </Text>
          <View style={styles.actions}>
            <Pressable onPress={cancel} style={styles.cancel}>
              <Text style={{ color: colors.muted }}>
                {t("billing.accountRequired.cancel")}
              </Text>
            </Pressable>
            <AppButton onPress={confirm}>
              {t("billing.accountRequired.confirm")}
            </AppButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: tokens.spacing.l,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    borderRadius: tokens.radius.l,
    padding: tokens.spacing.xl,
    gap: tokens.spacing.s,
  },
  title: { ...tokens.typography.heading },
  body: { ...tokens.typography.body },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: tokens.spacing.s,
    marginTop: tokens.spacing.s,
  },
  cancel: {
    paddingHorizontal: tokens.spacing.m,
    paddingVertical: tokens.spacing.s,
    justifyContent: "center",
  },
});
