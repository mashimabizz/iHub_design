import { Redirect, Tabs, router } from "expo-router";
import { useEffect, useRef } from "react";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../src/auth/AuthProvider";
import { ihubColors, ihubRadii } from "../../src/theme/tokens";

const TAB_CONFIG: Record<string, { label: string; glyph: string }> = {
  index: { label: "ホーム", glyph: "⌂" },
  inventory: { label: "在庫", glyph: "▦" },
  wishes: { label: "Wish", glyph: "♡" },
  transactions: { label: "取引", glyph: "↔" },
  profile: { label: "プロフ", glyph: "◉" },
};

export default function TabLayout() {
  const { configured, loading, previewMode, session } = useAuth();

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
      tabBar={(props) => <LiquidTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen name="index" options={{ title: TAB_CONFIG.index.label }} />
      <Tabs.Screen
        name="inventory"
        options={{ title: TAB_CONFIG.inventory.label }}
      />
      <Tabs.Screen name="wishes" options={{ title: TAB_CONFIG.wishes.label }} />
      <Tabs.Screen
        name="transactions"
        options={{ title: TAB_CONFIG.transactions.label }}
      />
      <Tabs.Screen name="profile" options={{ title: TAB_CONFIG.profile.label }} />
    </Tabs>
  );
}

function LiquidTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const progress = useRef(new Animated.Value(state.index)).current;
  const routes = state.routes;
  const shellWidth = Math.min(width - 24, 430);
  const searchSize = 64;
  const gap = 7;
  const barWidth = shellWidth - searchSize - gap;
  const itemWidth = barWidth / routes.length;
  const indicatorWidth = itemWidth + 12;
  const translateX = Animated.multiply(progress, itemWidth);

  useEffect(() => {
    Animated.spring(progress, {
      toValue: state.index,
      damping: 18,
      stiffness: 190,
      mass: 0.78,
      useNativeDriver: true,
    }).start();
  }, [progress, state.index]);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.tabBarRoot,
        {
          paddingBottom: Math.max(insets.bottom, 10),
        },
      ]}
    >
      <View style={[styles.tabBarShell, { width: shellWidth }]}>
        <View style={[styles.tabBarGlass, { width: barWidth }]}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.tabBarIndicator,
              {
                width: indicatorWidth,
                transform: [{ translateX }],
              },
            ]}
          >
            <View style={styles.tabBarIndicatorGloss} />
            <View style={styles.tabBarIridescentA} />
            <View style={styles.tabBarIridescentB} />
          </Animated.View>

          {routes.map((route, index) => {
            const options = descriptors[route.key]?.options;
            const focused = state.index === index;
            const config = TAB_CONFIG[route.name] ?? {
              label:
                typeof options?.title === "string" ? options.title : route.name,
              glyph: route.name.slice(0, 1).toUpperCase(),
            };

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });

              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: "tabLongPress",
                target: route.key,
              });
            };

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={focused ? { selected: true } : {}}
                accessibilityLabel={options?.tabBarAccessibilityLabel}
                testID={options?.tabBarButtonTestID}
                onPress={onPress}
                onLongPress={onLongPress}
                style={[styles.tabBarItem, { width: itemWidth }]}
              >
                <Text
                  style={[
                    styles.tabGlyphText,
                    focused
                      ? styles.tabGlyphTextActive
                      : styles.tabGlyphTextInactive,
                  ]}
                >
                  {config.glyph}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.tabLabel,
                    focused ? styles.tabLabelActive : styles.tabLabelInactive,
                  ]}
                >
                  {config.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="検索"
          onPress={() => router.push("/search")}
          style={[styles.searchOrb, { height: searchSize, width: searchSize }]}
        >
          <Text style={styles.searchGlyph}>⌕</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarRoot: {
    alignItems: "center",
    backgroundColor: "transparent",
    bottom: 0,
    left: 0,
    paddingTop: 8,
    position: "absolute",
    right: 0,
  },
  tabBarShell: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
  },
  tabBarGlass: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.82)",
    borderColor: "rgba(255,255,255,0.88)",
    borderRadius: ihubRadii.pill,
    borderWidth: 1,
    flexDirection: "row",
    height: 64,
    justifyContent: "center",
    overflow: "visible",
    paddingHorizontal: 2,
    shadowColor: ihubColors.ink,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.14,
    shadowRadius: 26,
  },
  tabBarIndicator: {
    backgroundColor: "rgba(255,255,255,0.74)",
    borderColor: "rgba(255,255,255,0.98)",
    borderRadius: ihubRadii.pill,
    borderWidth: 1,
    bottom: 0,
    left: -6,
    overflow: "hidden",
    position: "absolute",
    top: 0,
    shadowColor: ihubColors.pink,
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  tabBarIndicatorGloss: {
    backgroundColor: "rgba(255,255,255,0.42)",
    borderRadius: ihubRadii.pill,
    bottom: 7,
    left: 8,
    position: "absolute",
    right: 8,
    top: 7,
  },
  tabBarIridescentA: {
    backgroundColor: "rgba(255,45,85,0.34)",
    borderRadius: 999,
    height: 38,
    left: -5,
    position: "absolute",
    top: 5,
    width: 24,
  },
  tabBarIridescentB: {
    backgroundColor: "rgba(166,149,216,0.24)",
    borderColor: "rgba(255,255,255,0.55)",
    borderRadius: 999,
    borderWidth: 1,
    height: 62,
    position: "absolute",
    right: -12,
    top: 1,
    width: 62,
  },
  tabBarItem: {
    alignItems: "center",
    gap: 1,
    height: 60,
    justifyContent: "center",
    zIndex: 1,
  },
  tabGlyphText: {
    fontSize: 25,
    fontWeight: "900",
    lineHeight: 28,
  },
  tabGlyphTextActive: {
    color: ihubColors.lavender,
  },
  tabGlyphTextInactive: {
    color: "rgba(58,50,74,0.52)",
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: "900",
    letterSpacing: 0,
  },
  tabLabelActive: {
    color: ihubColors.lavender,
  },
  tabLabelInactive: {
    color: "rgba(58,50,74,0.52)",
  },
  searchOrb: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.80)",
    borderColor: "rgba(255,255,255,0.96)",
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    shadowColor: ihubColors.ink,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.16,
    shadowRadius: 26,
  },
  searchGlyph: {
    color: ihubColors.ink,
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 38,
  },
});
