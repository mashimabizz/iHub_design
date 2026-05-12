import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { FoundationCard } from "../../src/components/FoundationCard";
import { IHubLogo } from "../../src/components/IHubLogo";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { Screen } from "../../src/components/Screen";
import { TextField } from "../../src/components/TextField";
import { useAuth } from "../../src/auth/AuthProvider";
import { ihubColors, ihubRadii } from "../../src/theme/tokens";

export default function LoginScreen() {
  const { configured, enterPreview, signIn, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    setMessage(null);
    setPending(true);
    const trimmedEmail = email.trim();
    const error =
      mode === "signIn"
        ? await signIn(trimmedEmail, password)
        : await signUp(trimmedEmail, password);
    setPending(false);
    if (error) {
      setMessage(error);
      return;
    }
    if (mode === "signUp") {
      setMessage("確認メールを送信しました。メール認証後にログインできます。");
    }
  }

  return (
    <Screen contentStyle={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboard}
      >
        <View style={styles.brand}>
          <IHubLogo />
          <View>
            <Text style={styles.brandTitle}>iHub</Text>
            <Text style={styles.brandSub}>iOS native preview</Text>
          </View>
        </View>

        <FoundationCard
          eyebrow="AUTH"
          title={configured ? "ログイン" : "Supabase設定待ち"}
          body={
            configured
              ? "Web版と同じアカウントでログインし、同じ在庫・Wish・打診を表示する想定です。"
              : "mobile/.env.local に Supabase の公開URLとpublishable keyを入れるとログイン検証に進めます。"
          }
        >
          {configured ? (
            <View style={styles.form}>
              <View style={styles.segment}>
                <SegmentButton
                  active={mode === "signIn"}
                  label="ログイン"
                  onPress={() => setMode("signIn")}
                />
                <SegmentButton
                  active={mode === "signUp"}
                  label="新規登録"
                  onPress={() => setMode("signUp")}
                />
              </View>
              <TextField
                label="メールアドレス"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
                placeholder="you@example.com"
              />
              <TextField
                label="パスワード"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                textContentType="password"
                placeholder="8文字以上"
              />
              {message ? <Text style={styles.message}>{message}</Text> : null}
              <PrimaryButton
                loading={pending}
                disabled={!email.trim() || password.length < 6}
                onPress={submit}
              >
                {mode === "signIn" ? "ログインする" : "登録する"}
              </PrimaryButton>
            </View>
          ) : (
            <View style={styles.envBox}>
              <Text style={styles.envLine}>EXPO_PUBLIC_SUPABASE_URL</Text>
              <Text style={styles.envLine}>
                EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
              </Text>
              <PrimaryButton variant="secondary" onPress={enterPreview}>
                画面だけプレビューする
              </PrimaryButton>
            </View>
          )}
        </FoundationCard>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function SegmentButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Text onPress={onPress} style={[styles.segmentButton, active && styles.segmentActive]}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    justifyContent: "center",
  },
  keyboard: {
    gap: 18,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  brandTitle: {
    color: ihubColors.ink,
    fontSize: 26,
    fontWeight: "900",
  },
  brandSub: {
    color: ihubColors.mutedInk,
    fontSize: 12,
    fontWeight: "800",
  },
  form: {
    gap: 13,
  },
  segment: {
    flexDirection: "row",
    borderRadius: ihubRadii.md,
    backgroundColor: "rgba(166,149,216,0.12)",
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    borderRadius: ihubRadii.sm,
    color: ihubColors.mutedInk,
    overflow: "hidden",
    paddingVertical: 9,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "900",
  },
  segmentActive: {
    backgroundColor: "#fff",
    color: ihubColors.lavender,
  },
  message: {
    color: ihubColors.warn,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
  },
  envBox: {
    borderRadius: ihubRadii.md,
    backgroundColor: "rgba(58,50,74,0.06)",
    padding: 12,
    gap: 10,
  },
  envLine: {
    color: ihubColors.ink,
    fontSize: 11,
    fontWeight: "900",
  },
});
