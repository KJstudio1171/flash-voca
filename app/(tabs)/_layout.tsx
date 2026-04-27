import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { tabShiftOptions } from "@/src/shared/animation/motionPresets";
import { useT } from "@/src/shared/i18n";
import { useTheme } from "@/src/shared/theme/ThemeProvider";

export default function TabsLayout() {
  const { colors } = useTheme();
  const { t } = useT();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          height: 68,
          paddingBottom: 10,
          paddingTop: 8,
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
        },
        ...tabShiftOptions(),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.home"),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons color={color} name="view-dashboard-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="decks/index"
        options={{
          title: t("tabs.decks"),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons color={color} name="cards-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="study/index"
        options={{
          title: t("tabs.study"),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons color={color} name="chat-processing-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="store/index"
        options={{
          title: t("tabs.store"),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons color={color} name="shopping-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: t("tabs.profile"),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons color={color} name="account-circle-outline" size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
