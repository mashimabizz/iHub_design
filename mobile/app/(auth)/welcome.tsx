import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { IHubLogo } from "../../src/components/IHubLogo";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { Screen } from "../../src/components/Screen";
import { useAuth } from "../../src/auth/AuthProvider";
import { ihubColors, ihubRadii } from "../../src/theme/tokens";

export default function WelcomeScreen() {
  const { configured, enterPreview } = useAuth();

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.hero}>
        <View style={styles.glowLavender} />
        <View style={styles.glowSky} />
        <IHubLogo size={88} />
        <Text style={styles.title}>iHub</Text>
        <Text style={styles.copy}>
          グッズ交換を、{"\n"}現地で、もっと簡単に。
        </Text>
      </View>

      <View style={styles.actions}>
        <PrimaryButton onPress={() => router.push("/signup")}>
          メールアドレスで新規登録
        </PrimaryButton>
        <PrimaryButton variant="secondary" disabled>
          Googleで新規登録
        </PrimaryButton>
        <View style={styles.loginRow}>
          <Text style={styles.loginText}>すでにアカウントをお持ちの方は </Text>
          <Pressable onPress={() => router.push("/login")}>
            <Text style={styles.loginLink}>ログイン</Text>
          </Pressable>
        </View>
        {!configured ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              enterPreview();
              router.replace("/");
            }}
            style={styles.previewButton}
          >
            <Text style={styles.previewText}>画面だけプレビューする</Text>
          </Pressable>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingBottom: 32,
    paddingTop: 82,
  },
  hero: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    overflow: "hidden",
  },
  glowLavender: {
    backgroundColor: "rgba(166,149,216,0.16)",
    borderRadius: 999,
    height: 230,
    position: "absolute",
    right: -80,
    top: 24,
    width: 230,
  },
  glowSky: {
    backgroundColor: "rgba(168,212,230,0.16)",
    borderRadius: 999,
    bottom: 44,
    height: 250,
    left: -96,
    position: "absolute",
    width: 250,
  },
  title: {
    color: ihubColors.ink,
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: 24,
  },
  copy: {
    color: ihubColors.mutedInk,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 22,
    marginTop: 10,
    textAlign: "center",
  },
  actions: {
    gap: 10,
  },
  loginRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
  },
  loginText: {
    color: ihubColors.mutedInk,
    fontSize: 13,
    fontWeight: "700",
  },
  loginLink: {
    color: ihubColors.lavender,
    fontSize: 13,
    fontWeight: "900",
  },
  previewButton: {
    alignItems: "center",
    borderRadius: ihubRadii.md,
    paddingVertical: 11,
  },
  previewText: {
    color: ihubColors.mutedInk,
    fontSize: 12,
    fontWeight: "800",
  },
});
