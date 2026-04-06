import { TextInput, TextInputProps, StyleSheet, View } from "react-native";

import { tokens } from "@/src/shared/theme/tokens";

export function TextField(props: TextInputProps) {
  return (
    <View style={styles.frame}>
      <TextInput
        placeholderTextColor={tokens.colors.muted}
        style={styles.input}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: tokens.radius.m,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    backgroundColor: tokens.colors.surfaceStrong,
    paddingHorizontal: tokens.spacing.m,
    paddingVertical: tokens.spacing.s,
  },
  input: {
    minHeight: 22,
    color: tokens.colors.ink,
    fontSize: 15,
  },
});
