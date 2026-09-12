import { Tabs } from "expo-router";
import Icon from "@react-native-vector-icons/material-design-icons";
import { Platform } from "react-native";
import { useTheme } from "@/src/theme";

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surfaceSecondary,
          borderTopColor: colors.border,
          ...(Platform.OS === "web" ? { height: 64 } : {}),
        },
        tabBarItemStyle: { alignSelf: "center" },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Beranda",
          tabBarIcon: ({ color, size }) => <Icon name="home-variant" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="input"
        options={{
          title: "Input",
          tabBarIcon: ({ color, size }) => <Icon name="pencil-plus" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="rekap"
        options={{
          title: "Rekap",
          tabBarIcon: ({ color, size }) => <Icon name="table" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Pengaturan",
          tabBarIcon: ({ color, size }) => <Icon name="cog" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
