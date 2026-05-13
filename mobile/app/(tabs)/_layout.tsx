import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../src/auth/AuthProvider";
import { ihubColors } from "../../src/theme/tokens";

const TAB_CONFIG = {
  index: "ホーム",
  inventory: "在庫",
  wishes: "Wish",
  transactions: "取引",
  profile: "プロフ",
};

export default function TabLayout() {
  const { configured, loading, previewMode, session } = useAuth();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: ihubColors.background,
        }}
      >
        <ActivityIndicator color={ihubColors.lavender} />
      </View>
    );
  }

  if ((!configured && !previewMode) || (configured && !session)) {
    return <Redirect href="/welcome" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: ihubColors.lavender,
        tabBarInactiveTintColor: "rgba(58,50,74,0.46)",
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        tabBarStyle: [
          styles.nativeTabBar,
          {
            height: 58 + bottomInset,
            paddingBottom: bottomInset,
          },
        ],
      }}
    >
      <Tabs.Screen name="index" options={{ title: TAB_CONFIG.index }} />
      <Tabs.Screen
        name="inventory"
        options={{ title: TAB_CONFIG.inventory }}
      />
      <Tabs.Screen name="wishes" options={{ title: TAB_CONFIG.wishes }} />
      <Tabs.Screen
        name="transactions"
        options={{ title: TAB_CONFIG.transactions }}
      />
      <Tabs.Screen name="profile" options={{ title: TAB_CONFIG.profile }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  nativeTabBar: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderTopColor: "rgba(58,50,74,0.10)",
    borderTopWidth: StyleSheet.hairlineWidth,
    elevation: 0,
    shadowColor: "transparent",
  },
  tabItem: {
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0,
  },
});
