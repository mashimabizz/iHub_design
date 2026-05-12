import { Tabs } from "expo-router";
import { Text } from "react-native";
import { ihubColors } from "../../src/theme/tokens";

const TAB_LABELS = {
  index: "ホーム",
  inventory: "在庫",
  wishes: "Wish",
  transactions: "取引",
  profile: "プロフ",
} as const;

function tabIcon(label: string, color: string, focused: boolean) {
  return (
    <Text style={{ color, fontSize: 11, fontWeight: "900" }}>
      {focused ? "●" : "○"} {label}
    </Text>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ihubColors.lavender,
        tabBarInactiveTintColor: ihubColors.mutedInk,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "800",
        },
        tabBarStyle: {
          backgroundColor: "rgba(255,255,255,0.94)",
          borderTopColor: "rgba(58,50,74,0.08)",
          height: 78,
          paddingBottom: 14,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: TAB_LABELS.index,
          tabBarIcon: ({ color, focused }) => tabIcon("H", color, focused),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: TAB_LABELS.inventory,
          tabBarIcon: ({ color, focused }) => tabIcon("I", color, focused),
        }}
      />
      <Tabs.Screen
        name="wishes"
        options={{
          title: TAB_LABELS.wishes,
          tabBarIcon: ({ color, focused }) => tabIcon("W", color, focused),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: TAB_LABELS.transactions,
          tabBarIcon: ({ color, focused }) => tabIcon("T", color, focused),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: TAB_LABELS.profile,
          tabBarIcon: ({ color, focused }) => tabIcon("P", color, focused),
        }}
      />
    </Tabs>
  );
}
