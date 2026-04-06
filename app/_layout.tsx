import "react-native-reanimated";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AppProviders } from "@/src/app/AppProviders";
import { AppBootstrapGate } from "@/src/app/bootstrap/AppBootstrapGate";
import { useTheme } from "@/src/shared/theme/ThemeProvider";

function RootNavigator() {
  const { colors } = useTheme();
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colors.canvas,
          },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="decks/[deckId]/edit" />
        <Stack.Screen name="study/[deckId]" />
        <Stack.Screen name="bundles/[bundleId]" />
        <Stack.Screen name="settings/index" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <AppBootstrapGate>
        <RootNavigator />
      </AppBootstrapGate>
    </AppProviders>
  );
}
