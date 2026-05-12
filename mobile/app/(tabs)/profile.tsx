import { useEffect, useState, type ReactNode } from "react";
import { router } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { Screen } from "../../src/components/Screen";
import { useAuth } from "../../src/auth/AuthProvider";
import { supabase } from "../../src/lib/supabase";
import { ihubColors, ihubRadii } from "../../src/theme/tokens";

type ProfileSheet = {
  title: string;
  subtitle: string;
};

type ProfileData = {
  handle: string;
  displayName: string;
  primaryArea: string | null;
  avatarUrl: string | null;
  tradeCount: number;
  ratingAvg: number | null;
  ratingCount: number;
  oshiGroups: OshiGroup[];
};

type OshiGroup = {
  groupName: string;
  members: string[];
};

type ProfileRow = {
  handle: string | null;
  display_name: string | null;
  primary_area: string | null;
  avatar_url: string | null;
};

type OshiRow = {
  group_id: string | null;
  character_id: string | null;
  oshi_request_id: string | null;
  character_request_id: string | null;
  priority: number;
  group: { name: string | null } | { name: string | null }[] | null;
  character: { name: string | null } | { name: string | null }[] | null;
  oshi_request:
    | { requested_name: string | null }
    | { requested_name: string | null }[]
    | null;
  character_request:
    | { requested_name: string | null }
    | { requested_name: string | null }[]
    | null;
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
  const [profile, setProfile] = useState<ProfileData>(() =>
    fallbackProfile(user?.email, previewMode),
  );
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setProfile(fallbackProfile(user?.email, previewMode));
    if (!supabase || !user || previewMode) {
      setLoadError(null);
      return;
    }

    let active = true;
    setLoadError(null);
    fetchProfileData(user.id, user.email)
      .then((next) => {
        if (active) setProfile(next);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : "読み込みに失敗しました");
      });

    return () => {
      active = false;
    };
  }, [previewMode, user]);

  const oshiSummary = formatOshiSummary(profile.oshiGroups);

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
            {profile.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>
                {(profile.displayName || profile.handle || "iH").slice(0, 2)}
              </Text>
            )}
          </View>
          <View style={styles.heroIdentity}>
            <Text numberOfLines={1} style={styles.handle}>
              @{profile.handle}
            </Text>
            <Text numberOfLines={1} style={styles.name}>
              {profile.displayName} ・ {profile.primaryArea ?? "エリア未設定"} ・ 取引 {profile.tradeCount} 回
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
            <Text style={styles.ratingValue}>
              {profile.ratingAvg == null ? "★—" : `★${profile.ratingAvg.toFixed(1)}`}
            </Text>
            <Text style={styles.ratingCount}>{profile.ratingCount} 件</Text>
            <Text style={styles.ratingLink}>詳細 ›</Text>
          </Pressable>
        </View>
      </View>

      {loadError ? <Text style={styles.inlineError}>{loadError}</Text> : null}

      <ProfileSection title="アイデンティティ">
        {IDENTITY_ROWS.map((row) => (
          <ProfileRow key={row.title} {...row} onPress={() => openProfileDetail(row)} />
        ))}
      </ProfileSection>

      <ProfileSection title="推し">
        <View style={styles.oshiCard}>
          <View style={styles.oshiBubble}>
            <Text style={styles.oshiBubbleText}>
              {profile.oshiGroups[0]?.groupName.slice(0, 1) ?? "推"}
            </Text>
          </View>
          <View style={styles.oshiBubbleAlt}>
            <Text style={styles.oshiBubbleText}>
              {profile.oshiGroups[1]?.groupName.slice(0, 1) ?? "し"}
            </Text>
          </View>
          <View style={styles.oshiCopy}>
            <Text numberOfLines={1} style={styles.oshiTitle}>
              {oshiSummary.title}
            </Text>
            <Text numberOfLines={1} style={styles.oshiMeta}>
              {oshiSummary.meta}
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

async function fetchProfileData(
  userId: string,
  email?: string,
): Promise<ProfileData> {
  if (!supabase) return fallbackProfile(email, false);
  const [
    { data: profile },
    { data: oshi },
    { count: tradeCount },
    { data: evaluations },
  ] = await Promise.all([
    supabase
      .from("users")
      .select("handle, display_name, primary_area, avatar_url")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("user_oshi")
      .select(
        "group_id, character_id, oshi_request_id, character_request_id, priority, group:groups_master(name), character:characters_master(name), oshi_request:oshi_requests(requested_name), character_request:character_requests(requested_name)",
      )
      .eq("user_id", userId)
      .order("priority", { ascending: true }),
    supabase
      .from("proposals")
      .select("id", { count: "exact", head: true })
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq("status", "completed"),
    supabase.from("user_evaluations").select("stars").eq("ratee_id", userId),
  ]);

  const profileRow = profile as ProfileRow | null;
  const stars = ((evaluations as { stars: number }[] | null) ?? [])
    .map((evaluation) => evaluation.stars)
    .filter((star) => typeof star === "number");
  const ratingAvg =
    stars.length > 0 ? stars.reduce((sum, star) => sum + star, 0) / stars.length : null;

  return {
    handle: profileRow?.handle ?? makeHandle(email),
    displayName: profileRow?.display_name ?? (email ? "michi" : "ゲスト"),
    primaryArea: profileRow?.primary_area ?? null,
    avatarUrl: profileRow?.avatar_url ?? null,
    tradeCount: tradeCount ?? 0,
    ratingAvg,
    ratingCount: stars.length,
    oshiGroups: buildOshiGroups((oshi as OshiRow[] | null) ?? []),
  };
}

function fallbackProfile(email?: string, previewMode = false): ProfileData {
  return {
    handle: makeHandle(email),
    displayName: previewMode ? "ハナ" : email ? "michi" : "ゲスト",
    primaryArea: previewMode ? "東京都" : null,
    avatarUrl: null,
    tradeCount: previewMode ? 18 : 0,
    ratingAvg: previewMode ? 4.9 : null,
    ratingCount: previewMode ? 12 : 0,
    oshiGroups: previewMode
      ? [
          { groupName: "LUMENA", members: ["スア"] },
          { groupName: "aespa", members: ["ニンニン"] },
        ]
      : [],
  };
}

function buildOshiGroups(rows: OshiRow[]): OshiGroup[] {
  const groups = new Map<string, OshiGroup>();
  for (const row of rows) {
    const groupId = row.group_id ?? row.oshi_request_id;
    const groupName =
      pickName(row.group) ?? pickRequestName(row.oshi_request) ?? null;
    if (!groupId || !groupName) continue;
    const group = groups.get(groupId) ?? { groupName, members: [] };
    const memberName =
      pickName(row.character) ?? pickRequestName(row.character_request);
    if (memberName) group.members.push(memberName);
    groups.set(groupId, group);
  }
  return Array.from(groups.values());
}

function formatOshiSummary(groups: OshiGroup[]) {
  if (groups.length === 0) {
    return {
      title: "推し未設定",
      meta: "推し設定から追加できます",
    };
  }
  const memberCount = groups.reduce((sum, group) => sum + group.members.length, 0);
  return {
    title: groups
      .slice(0, 2)
      .map((group) =>
        group.members.length > 0
          ? `${group.groupName}・${group.members.slice(0, 2).join("/")}`
          : group.groupName,
      )
      .join(" / "),
    meta: `${groups.length}グループ・${memberCount}メンバー`,
  };
}

function pickName(
  value:
    | { name: string | null }
    | { name: string | null }[]
    | null
    | undefined,
) {
  if (!value) return null;
  return Array.isArray(value) ? value[0]?.name ?? null : value.name;
}

function pickRequestName(
  value:
    | { requested_name: string | null }
    | { requested_name: string | null }[]
    | null
    | undefined,
) {
  if (!value) return null;
  return Array.isArray(value)
    ? value[0]?.requested_name ?? null
    : value.requested_name;
}

function openProfileDetail(row: ProfileSheet) {
  if (row.title === "プロフィール編集") {
    router.push("/profile-edit");
    return;
  }

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
    overflow: "hidden",
    width: 56,
  },
  avatarImage: {
    height: "100%",
    width: "100%",
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
  inlineError: {
    color: ihubColors.warn,
    fontSize: 11.5,
    fontWeight: "800",
    lineHeight: 17,
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
