import type { ReactNode } from "react";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ihubColors, ihubRadii, ihubShadow } from "../theme/tokens";

type RouteHeaderProps = {
  right?: ReactNode;
  subtitle?: string;
  title: string;
};

export function RouteHeader({ right, subtitle, title }: RouteHeaderProps) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel="戻る"
        accessibilityRole="button"
        onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace("/");
          }
        }}
        style={styles.backButton}
      >
        <Text style={styles.backText}>‹</Text>
      </Pressable>
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.08)",
    borderRadius: ihubRadii.pill,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
    ...ihubShadow,
  },
  backText: {
    color: ihubColors.ink,
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 32,
  },
  copy: {
    flex: 1,
  },
  title: {
    color: ihubColors.ink,
    fontSize: 19,
    fontWeight: "900",
    lineHeight: 24,
  },
  subtitle: {
    color: ihubColors.mutedInk,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
  },
  right: {
    alignItems: "flex-end",
    minWidth: 42,
  },
});
