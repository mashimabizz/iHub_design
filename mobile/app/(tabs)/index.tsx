import { Pressable, StyleSheet, Text, View } from "react-native";
import { FoundationCard } from "../../src/components/FoundationCard";
import { IHubLogo } from "../../src/components/IHubLogo";
import { Screen } from "../../src/components/Screen";
import { StatusPill } from "../../src/components/StatusPill";
import { useAuth } from "../../src/auth/AuthProvider";
import { hasSupabaseConfig } from "../../src/lib/supabase";
import { ihubColors, ihubRadii } from "../../src/theme/tokens";

export default function HomeScreen() {
  const { previewMode, user } = useAuth();

  return (
    <Screen>
      <View style={styles.header}>
        <IHubLogo />
        <View style={styles.headerText}>
          <Text style={styles.title}>iHub iOS</Text>
          <Text style={styles.subtitle}>ネイティブ版の土台</Text>
        </View>
        <StatusPill
          label={
            hasSupabaseConfig && user
              ? "ログイン中"
              : previewMode
                ? "プレビュー中"
              : hasSupabaseConfig
                ? "Supabase接続可"
                : "環境変数待ち"
          }
          tone={hasSupabaseConfig ? "ok" : "pink"}
        />
      </View>

      <FoundationCard
        eyebrow="FOUNDATION"
        title="Web版と同じ市場に接続する準備を開始"
        body="まずはExpo Router、Supabase Auth、通知、地図を前提にしたiOS向けの基盤を作っています。画面はここからiOSらしい操作感へ寄せていきます。"
      >
        <View style={styles.pillRow}>
          <StatusPill label="Expo Router" />
          <StatusPill label="Supabase" tone="sky" />
          <StatusPill label="Apple Maps準備" tone="pink" />
        </View>
        {previewMode ? (
          <Text style={styles.userLine}>Supabase未接続の画面プレビューです。</Text>
        ) : user?.email ? (
          <Text style={styles.userLine}>ログイン: {user.email}</Text>
        ) : null}
      </FoundationCard>

      <View style={styles.grid}>
        <MiniCard title="ホーム" body="マッチカードと現地交換モード" />
        <MiniCard title="在庫" body="画像先読みと下部アクション" />
        <MiniCard title="Wish" body="列数切替と追加導線" />
        <MiniCard title="取引" body="要対応/相手待ちの連動" />
      </View>

      <Pressable style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>次はログイン連携へ進む</Text>
      </Pressable>
    </Screen>
  );
}

function MiniCard({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.miniCard}>
      <Text style={styles.miniTitle}>{title}</Text>
      <Text style={styles.miniBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: ihubColors.ink,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0,
  },
  subtitle: {
    color: ihubColors.mutedInk,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  userLine: {
    color: ihubColors.mutedInk,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 10,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  miniCard: {
    width: "48%",
    borderWidth: 1,
    borderColor: ihubColors.faintInk,
    borderRadius: ihubRadii.md,
    backgroundColor: ihubColors.surface,
    padding: 12,
  },
  miniTitle: {
    color: ihubColors.ink,
    fontSize: 13,
    fontWeight: "900",
  },
  miniBody: {
    color: ihubColors.mutedInk,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 16,
    marginTop: 5,
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: ihubRadii.md,
    backgroundColor: ihubColors.lavender,
    marginTop: 16,
    paddingVertical: 15,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
});
