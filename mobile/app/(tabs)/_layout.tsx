import { Redirect, Tabs } from "expo-router";
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
  index: { label: "ホーム", glyph: "H" },
  inventory: { label: "在庫", glyph: "I" },
  wishes: { label: "Wish", glyph: "W" },
  transactions: { label: "取引", glyph: "T" },
  profile: { label: "プロフ", glyph: "P" },
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
  const barWidth = Math.min(width - 28, 414);
  const itemWidth = barWidth / routes.length;
  const indicatorWidth = itemWidth - 8;
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
              <View
                style={[
                  styles.tabGlyph,
                  focused ? styles.tabGlyphActive : styles.tabGlyphInactive,
                ]}
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
              </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarRoot: {
    alignItems: "center",
    backgroundColor: "transparent",
    paddingTop: 8,
  },
  tabBarGlass: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
    borderColor: "rgba(255,255,255,0.88)",
    borderRadius: ihubRadii.pill,
    borderWidth: 1,
    flexDirection: "row",
    height: 68,
    justifyContent: "center",
    overflow: "hidden",
    paddingHorizontal: 4,
    shadowColor: ihubColors.ink,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.16,
    shadowRadius: 30,
  },
  tabBarIndicator: {
    backgroundColor: "rgba(255,255,255,0.82)",
    borderColor: "rgba(255,255,255,0.94)",
    borderRadius: ihubRadii.pill,
    borderWidth: 1,
    bottom: 6,
    left: 4,
    position: "absolute",
    top: 6,
    shadowColor: ihubColors.lavender,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
  },
  tabBarIndicatorGloss: {
    backgroundColor: "rgba(166,149,216,0.13)",
    borderRadius: ihubRadii.pill,
    bottom: 8,
    left: 10,
    position: "absolute",
    right: 10,
    top: 8,
  },
  tabBarItem: {
    alignItems: "center",
    gap: 3,
    height: 60,
    justifyContent: "center",
    zIndex: 1,
  },
  tabGlyph: {
    alignItems: "center",
    borderRadius: 10,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  tabGlyphActive: {
    backgroundColor: "rgba(166,149,216,0.18)",
  },
  tabGlyphInactive: {
    backgroundColor: "transparent",
  },
  tabGlyphText: {
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 16,
  },
  tabGlyphTextActive: {
    color: ihubColors.lavender,
  },
  tabGlyphTextInactive: {
    color: "rgba(58,50,74,0.52)",
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0,
  },
  tabLabelActive: {
    color: ihubColors.lavender,
  },
  tabLabelInactive: {
    color: "rgba(58,50,74,0.52)",
  },
});
