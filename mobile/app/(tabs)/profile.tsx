import type { ReactNode } from "react";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { Screen } from "../../src/components/Screen";
import { useAuth } from "../../src/auth/AuthProvider";
import { ihubColors, ihubRadii } from "../../src/theme/tokens";

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
        </View>
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
              {displayName} ・ 東京都 ・ 取引 18 回
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="評価一覧を見る"
            onPress={() =>
              router.push({
                pathname: "/preview-detail",
                params: {
                  kind: "profile",
                  badge: "PROFILE",
                  title: "評価一覧",
                  subtitle: "成立した取引の評価を確認します。",
                },
              })
            }
            style={styles.ratingPanel}
          >
            <Text style={styles.ratingValue}>★4.9</Text>
            <Text style={styles.ratingCount}>12 件</Text>
            <Text style={styles.ratingLink}>詳細 ›</Text>
          </Pressable>
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
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 24,
  },
  hero: {
    backgroundColor: ihubColors.lavender,
    borderRadius: 16,
    overflow: "hidden",
    padding: 20,
    shadowColor: ihubColors.lavender,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
  },
  heroGlowPink: {
    backgroundColor: "rgba(243,197,212,0.34)",
    borderRadius: 999,
    height: 132,
    position: "absolute",
    right: -34,
    top: -48,
    width: 132,
  },
  heroGlowSky: {
    backgroundColor: "rgba(168,212,230,0.62)",
    borderRadius: 999,
    bottom: -58,
    height: 154,
    left: -46,
    position: "absolute",
    width: 154,
  },
  heroTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: 13,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderColor: "rgba(255,255,255,0.30)",
    borderRadius: 16,
    borderWidth: 2,
    height: 56,
    justifyContent: "center",
    width: 56,
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
    color: ihubColors.surface,
    fontSize: 16,
    fontWeight: "900",
  },
  name: {
    color: "rgba(255,255,255,0.90)",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 3,
  },
  ratingPanel: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    flexShrink: 0,
    justifyContent: "center",
    minWidth: 58,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  ratingValue: {
    color: ihubColors.surface,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 16,
  },
  ratingCount: {
    color: "rgba(255,255,255,0.90)",
    fontSize: 9.5,
    fontWeight: "800",
    marginTop: 2,
  },
  ratingLink: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 8.5,
    fontWeight: "800",
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
