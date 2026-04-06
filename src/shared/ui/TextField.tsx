import { TextInput, TextInputProps, StyleSheet, View } from "react-native";

import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";

export function TextField(props: TextInputProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.frame, { borderColor: colors.line, backgroundColor: colors.surfaceStrong }]}>
      <TextInput
        placeholderTextColor={colors.muted}
        style={[styles.input, { color: colors.ink }]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: tokens.radius.m,
    borderWidth: 1,
    paddingHorizontal: tokens.spacing.m,
    paddingVertical: tokens.spacing.s,
  },
  input: {
    minHeight: 22,
    fontSize: 15,
  },
});
