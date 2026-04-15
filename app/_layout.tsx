import "react-native-reanimated";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AppProviders } from "@/src/app/AppProviders";
import { AppBootstrapGate } from "@/src/app/bootstrap/AppBootstrapGate";
import {
  modalPushOptions,
  stackPushOptions,
} from "@/src/shared/animation/motionPresets";
import { useTheme } from "@/src/shared/theme/ThemeProvider";

function RootNavigator() {
  const { colors, colorMode } = useTheme();
  return (
    <>
      <StatusBar style={colorMode === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colors.canvas,
          },
          ...stackPushOptions(),
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="decks/[deckId]/edit" />
        <Stack.Screen name="study/[deckId]" options={modalPushOptions()} />
        <Stack.Screen name="bundles/[bundleId]" options={modalPushOptions()} />
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
