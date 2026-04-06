import "react-native-reanimated";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AppProviders } from "@/src/app/AppProviders";
import { AppBootstrapGate } from "@/src/app/bootstrap/AppBootstrapGate";
import { tokens } from "@/src/shared/theme/tokens";

export default function RootLayout() {
  return (
    <AppProviders>
      <AppBootstrapGate>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: tokens.colors.canvas,
            },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="decks/[deckId]/edit" />
          <Stack.Screen name="study/[deckId]" />
          <Stack.Screen name="bundles/[bundleId]" />
        </Stack>
      </AppBootstrapGate>
    </AppProviders>
  );
}
