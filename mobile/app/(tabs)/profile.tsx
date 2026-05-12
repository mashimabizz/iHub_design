import type { ReactNode } from "react";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { Screen } from "../../src/components/Screen";
import { StatusPill } from "../../src/components/StatusPill";
import { useAuth } from "../../src/auth/AuthProvider";
import { ihubColors, ihubRadii, ihubShadow } from "../../src/theme/tokens";

type ProfileSheet = {
  title: string;
  subtitle: string;
};

const IDENTITY_ROWS: ProfileSheet[] = [
  {
    title: "プロフィール編集",
    subtitle: "名前、表示エリア、ひとことを整えます。",
  },
  {
    title: "推し設定",
    subtitle: "登録済みの推し、仮登録、追加リクエストを管理します。",
  },
  {
    title: "スケジュール",
    subtitle: "現地交換できる予定や活動エリアを確認します。",
  },
];

const SUPPORT_ROWS: ProfileSheet[] = [
  {
    title: "通知設定",
    subtitle: "打診、取引チャット、現地交換モードの通知を調整します。",
  },
  {
    title: "ヘルプ・FAQ",
    subtitle: "困った時の案内と問い合わせを開きます。",
  },
];

export default function ProfileScreen() {
  const { previewMode, user, signOut, exitPreview } = useAuth();
  const handle = makeHandle(user?.email);
  const displayName = previewMode ? "ハナ" : user?.email ? "michi" : "ゲスト";

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>プロフ</Text>
          <Text style={styles.subtitle}>交換の安心感を整える場所</Text>
        </View>
        <StatusPill
          label={previewMode ? "プレビュー中" : user?.email ? "ログイン中" : "未ログイン"}
          tone={previewMode ? "pink" : "lavender"}
        />
      </View>

      <View style={styles.hero}>
        <View style={styles.heroGlowPink} />
        <View style={styles.heroGlowSky} />
        <View style={styles.heroTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>iH</Text>
          </View>
          <View style={styles.heroIdentity}>
            <Text numberOfLines={1} style={styles.handle}>
              @{handle}
            </Text>
            <Text numberOfLines={1} style={styles.name}>
              {displayName}・東京都
            </Text>
          </View>
        </View>

        <View style={styles.heroStats}>
          <StatCard label="成立" value="18" />
          <StatCard label="評価" value="4.9" />
          <StatCard label="現地" value="ON" />
        </View>
      </View>

      <ProfileSection title="アイデンティティ">
        {IDENTITY_ROWS.map((row) => (
          <ProfileRow key={row.title} {...row} onPress={() => openProfileDetail(row)} />
        ))}
      </ProfileSection>

      <ProfileSection title="推し">
        <View style={styles.oshiCard}>
          <View style={styles.oshiBubble}>
            <Text style={styles.oshiBubbleText}>L</Text>
          </View>
          <View style={styles.oshiBubbleAlt}>
            <Text style={styles.oshiBubbleText}>N</Text>
          </View>
          <View style={styles.oshiCopy}>
            <Text numberOfLines={1} style={styles.oshiTitle}>
              LUMENA・スア / aespa・ニンニン
            </Text>
            <Text numberOfLines={1} style={styles.oshiMeta}>
              2グループ・5メンバー
            </Text>
          </View>
        </View>
      </ProfileSection>

      <ProfileSection title="通知・サポート">
        {SUPPORT_ROWS.map((row) => (
          <ProfileRow key={row.title} {...row} onPress={() => openProfileDetail(row)} />
        ))}
      </ProfileSection>

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
    </Screen>
  );
}

function openProfileDetail(row: ProfileSheet) {
  router.push({
    pathname: "/preview-detail",
    params: {
      kind: "profile",
      badge: "PROFILE",
      title: row.title,
      subtitle: row.subtitle,
    },
  });
}

function makeHandle(email?: string) {
  if (!email) {
    return "preview_hana";
  }

  const local = email.split("@")[0]?.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
  return local || "ihub_user";
}

function ProfileSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function ProfileRow({
  title,
  subtitle,
  onPress,
}: ProfileSheet & {
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
    >
      <View style={styles.rowIcon}>
        <Text style={styles.rowIconText}>{title.slice(0, 1)}</Text>
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text numberOfLines={1} style={styles.rowSubtitle}>
          {subtitle}
        </Text>
      </View>
      <Text style={styles.rowChevron}>›</Text>
    </Pressable>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: 16,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  title: {
    color: ihubColors.ink,
    fontSize: 29,
    fontWeight: "900",
    letterSpacing: 0,
  },
  subtitle: {
    color: ihubColors.mutedInk,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  hero: {
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(166,149,216,0.20)",
    borderRadius: ihubRadii.xl,
    borderWidth: 1,
    overflow: "hidden",
    padding: 16,
    ...ihubShadow,
  },
  heroGlowPink: {
    backgroundColor: "rgba(243,197,212,0.52)",
    borderRadius: 999,
    height: 120,
    position: "absolute",
    right: -38,
    top: -42,
    width: 120,
  },
  heroGlowSky: {
    backgroundColor: "rgba(168,212,230,0.42)",
    borderRadius: 999,
    bottom: -48,
    height: 132,
    left: -42,
    position: "absolute",
    width: 132,
  },
  heroTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: 13,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: ihubColors.lavender,
    borderColor: "rgba(255,255,255,0.86)",
    borderRadius: 25,
    borderWidth: 2,
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  avatarText: {
    color: ihubColors.surface,
    fontSize: 19,
    fontWeight: "900",
  },
  heroIdentity: {
    flex: 1,
  },
  handle: {
    color: ihubColors.ink,
    fontSize: 21,
    fontWeight: "900",
  },
  name: {
    color: ihubColors.mutedInk,
    fontSize: 12.5,
    fontWeight: "800",
    marginTop: 3,
  },
  heroStats: {
    flexDirection: "row",
    gap: 8,
    marginTop: 15,
  },
  statCard: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.74)",
    borderColor: "rgba(58,50,74,0.08)",
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 10,
  },
  statValue: {
    color: ihubColors.ink,
    fontSize: 17,
    fontWeight: "900",
  },
  statLabel: {
    color: ihubColors.mutedInk,
    fontSize: 10,
    fontWeight: "900",
    marginTop: 2,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    color: ihubColors.ink,
    fontSize: 15,
    fontWeight: "900",
    paddingHorizontal: 2,
  },
  sectionBody: {
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.08)",
    borderRadius: ihubRadii.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
    minHeight: 68,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  rowPressed: {
    backgroundColor: "rgba(166,149,216,0.08)",
  },
  rowIcon: {
    alignItems: "center",
    backgroundColor: "rgba(166,149,216,0.14)",
    borderRadius: 14,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  rowIconText: {
    color: ihubColors.lavender,
    fontSize: 15,
    fontWeight: "900",
  },
  rowCopy: {
    flex: 1,
  },
  rowTitle: {
    color: ihubColors.ink,
    fontSize: 14,
    fontWeight: "900",
  },
  rowSubtitle: {
    color: ihubColors.mutedInk,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 3,
  },
  rowChevron: {
    color: "rgba(58,50,74,0.32)",
    fontSize: 25,
    fontWeight: "700",
  },
  oshiCard: {
    alignItems: "center",
    flexDirection: "row",
    minHeight: 76,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  oshiBubble: {
    alignItems: "center",
    backgroundColor: ihubColors.pink,
    borderColor: ihubColors.surface,
    borderRadius: 18,
    borderWidth: 2,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  oshiBubbleAlt: {
    alignItems: "center",
    backgroundColor: ihubColors.sky,
    borderColor: ihubColors.surface,
    borderRadius: 18,
    borderWidth: 2,
    height: 42,
    justifyContent: "center",
    marginLeft: -10,
    width: 42,
  },
  oshiBubbleText: {
    color: ihubColors.surface,
    fontSize: 15,
    fontWeight: "900",
  },
  oshiCopy: {
    flex: 1,
    marginLeft: 12,
  },
  oshiTitle: {
    color: ihubColors.ink,
    fontSize: 13.5,
    fontWeight: "900",
  },
  oshiMeta: {
    color: ihubColors.mutedInk,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 3,
  },
  email: {
    color: ihubColors.mutedInk,
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
});
