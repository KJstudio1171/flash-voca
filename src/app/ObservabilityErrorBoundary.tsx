import { Component, ErrorInfo, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { normalizeError } from "@/src/core/errors/handleError";
import { getErrorReporter } from "@/src/core/observability";
import { tokens } from "@/src/shared/theme/tokens";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = { hasError: boolean };

export class ObservabilityErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo): void {
    try {
      void getErrorReporter().report(normalizeError(error));
    } catch {
      // observability not initialized — fall through to fallback UI
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? <DefaultFallback />;
    }
    return this.props.children;
  }
}

function DefaultFallback() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>오류가 발생했습니다</Text>
      <Text style={styles.body}>앱을 재시작해 주세요.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: tokens.spacing.xl,
  },
  title: {
    ...tokens.typography.hero,
    marginBottom: tokens.spacing.m,
  },
  body: {
    ...tokens.typography.body,
  },
});
