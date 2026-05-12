import { StyleSheet, Text, View } from "react-native";
import { FoundationCard } from "../../src/components/FoundationCard";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { Screen } from "../../src/components/Screen";
import { StatusPill } from "../../src/components/StatusPill";
import { useAuth } from "../../src/auth/AuthProvider";
import { ihubColors } from "../../src/theme/tokens";

export default function ProfileScreen() {
  const { previewMode, user, signOut, exitPreview } = useAuth();

  return (
    <Screen>
      <FoundationCard
        eyebrow="PROFILE"
        title="プロフィール"
        body="推し設定、スケジュール、評価、本人の表示情報をiOSの右スライド遷移でつなげます。"
      >
        <View style={styles.content}>
          <StatusPill
            label={previewMode ? "プレビュー中" : user?.email ? "ログイン中" : "未ログイン"}
          />
          {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
          <PrimaryButton
            variant="secondary"
            onPress={() => {
              if (previewMode) {
                exitPreview();
                return;
              }
              void signOut();
            }}
          >
            {previewMode ? "プレビューを終了" : "ログアウト"}
          </PrimaryButton>
        </View>
      </FoundationCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
  },
  email: {
    color: ihubColors.ink,
    fontSize: 13,
    fontWeight: "800",
  },
});
