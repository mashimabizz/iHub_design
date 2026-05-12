import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../src/auth/AuthProvider";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { Screen } from "../src/components/Screen";
import { supabase } from "../src/lib/supabase";
import { ihubColors, ihubRadii, ihubShadow } from "../src/theme/tokens";

type OshiRow = {
  id: string;
  group_id: string | null;
  character_id: string | null;
  oshi_request_id: string | null;
  character_request_id: string | null;
  kind: "box" | "specific" | "multi";
  priority: number;
  group: { name: string | null } | { name: string | null }[] | null;
  character: { name: string | null } | { name: string | null }[] | null;
  oshi_request:
    | { requested_name: string | null; status: string | null }
    | { requested_name: string | null; status: string | null }[]
    | null;
  character_request:
    | { requested_name: string | null; status: string | null }
    | { requested_name: string | null; status: string | null }[]
    | null;
};

type OshiGroup = {
  key: string;
  groupId: string | null;
  requestId: string | null;
  name: string;
  pending: boolean;
  priority: number;
  members: {
    id: string;
    rowId: string;
    name: string;
    pending: boolean;
  }[];
};

export default function OshiSettingsScreen() {
  const { user, previewMode } = useAuth();
  const [groups, setGroups] = useState<OshiGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const summary = useMemo(() => {
    const memberCount = groups.reduce((sum, group) => sum + group.members.length, 0);
    return `${groups.length}グループ・${memberCount}メンバー`;
  }, [groups]);

  useEffect(() => {
    if (!supabase || !user || previewMode) {
      setGroups([]);
      setError(previewMode ? null : "ログイン後に推し設定を確認できます");
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    fetchOshiGroups(user.id)
      .then((next) => {
        if (active) setGroups(next);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "読み込みに失敗しました");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [previewMode, user]);

  async function reload() {
    if (!user || !supabase) return;
    setGroups(await fetchOshiGroups(user.id));
  }

  async function removeGroup(group: OshiGroup) {
    if (!user || !supabase) return;
    setBusyKey(group.key);
    setError(null);
    try {
      let query = supabase.from("user_oshi").delete().eq("user_id", user.id);
      query = group.groupId
        ? query.eq("group_id", group.groupId)
        : query.eq("oshi_request_id", group.requestId);
      const { error: deleteError } = await query;
      if (deleteError) throw deleteError;
      await reload();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "削除に失敗しました");
    } finally {
      setBusyKey(null);
    }
  }

  async function removeMember(memberRowId: string) {
    if (!user || !supabase) return;
    setBusyKey(memberRowId);
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from("user_oshi")
        .delete()
        .eq("id", memberRowId)
        .eq("user_id", user.id);
      if (deleteError) throw deleteError;
      await reload();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "削除に失敗しました");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="戻る"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>推し設定</Text>
          <Text style={styles.subtitle}>{summary}</Text>
        </View>
      </View>

      <PrimaryButton
        variant="secondary"
        onPress={() =>
          router.push({
            pathname: "/preview-detail",
            params: {
              kind: "profile",
              badge: "NEXT",
              title: "登録済みの推しを追加",
              subtitle: "検索・カテゴリタブ・追加リクエストの本画面を次に接続します。",
            },
          })
        }
      >
        ＋ 登録済みの推しを追加
      </PrimaryButton>

      {loading ? <Text style={styles.inlineNotice}>推し設定を読み込み中…</Text> : null}
      {error ? <Text style={styles.inlineError}>{error}</Text> : null}

      {groups.length === 0 && !loading ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>推しが未設定です</Text>
          <Text style={styles.emptyText}>
            登録済みの推し追加と追加リクエストをここに接続します。
          </Text>
        </View>
      ) : null}

      <View style={styles.groupList}>
        {groups.map((group) => (
          <View key={group.key} style={styles.groupCard}>
            <View style={styles.groupHeader}>
              <View style={styles.groupIcon}>
                <Text style={styles.groupIconText}>{group.name.slice(0, 1)}</Text>
              </View>
              <View style={styles.groupCopy}>
                <Text style={styles.groupName}>{group.name}</Text>
                <Text style={styles.groupMeta}>
                  {group.pending ? "承認待ち・仮登録" : `${group.members.length}メンバー`}
                </Text>
              </View>
              <Pressable
                disabled={busyKey === group.key}
                onPress={() => removeGroup(group)}
                style={styles.removeButton}
              >
                <Text style={styles.removeButtonText}>削除</Text>
              </Pressable>
            </View>

            {group.members.length > 0 ? (
              <View style={styles.memberWrap}>
                {group.members.map((member) => (
                  <Pressable
                    key={member.rowId}
                    disabled={busyKey === member.rowId}
                    onPress={() => removeMember(member.rowId)}
                    style={styles.memberChip}
                  >
                    <Text style={styles.memberText}>
                      {member.name}
                      {member.pending ? "（承認待ち）" : ""}
                    </Text>
                    <Text style={styles.memberDelete}>×</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text style={styles.noMemberText}>箱推しとして登録中</Text>
            )}
          </View>
        ))}
      </View>
    </Screen>
  );
}

async function fetchOshiGroups(userId: string): Promise<OshiGroup[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("user_oshi")
    .select(
      "id, group_id, character_id, oshi_request_id, character_request_id, kind, priority, group:groups_master(name), character:characters_master(name), oshi_request:oshi_requests(requested_name, status), character_request:character_requests(requested_name, status)",
    )
    .eq("user_id", userId)
    .order("priority", { ascending: true });
  if (error) throw error;

  const map = new Map<string, OshiGroup>();
  for (const row of (data as OshiRow[] | null) ?? []) {
    const groupId = row.group_id;
    const requestId = row.oshi_request_id;
    const key = groupId ?? requestId ?? row.id;
    const groupName =
      pickName(row.group) ?? pickRequestName(row.oshi_request) ?? "未設定";
    const groupPending = !groupId && !!requestId;
    const group =
      map.get(key) ??
      {
        key,
        groupId,
        requestId,
        name: groupName,
        pending: groupPending,
        priority: row.priority,
        members: [],
      };

    const memberName =
      pickName(row.character) ?? pickRequestName(row.character_request);
    const memberId = row.character_id ?? row.character_request_id;
    if (memberName && memberId) {
      group.members.push({
        id: memberId,
        rowId: row.id,
        name: memberName,
        pending: !row.character_id && !!row.character_request_id,
      });
    }
    map.set(key, group);
  }

  return Array.from(map.values()).sort((a, b) => a.priority - b.priority);
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

const styles = StyleSheet.create({
  screen: {
    gap: 14,
  },
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
    height: 44,
    justifyContent: "center",
    width: 44,
    ...ihubShadow,
  },
  backText: {
    color: ihubColors.ink,
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 34,
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    color: ihubColors.ink,
    fontSize: 20,
    fontWeight: "900",
  },
  subtitle: {
    color: ihubColors.mutedInk,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
  },
  inlineNotice: {
    color: ihubColors.mutedInk,
    fontSize: 11.5,
    fontWeight: "800",
  },
  inlineError: {
    color: ihubColors.warn,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
  },
  emptyBox: {
    alignItems: "center",
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.10)",
    borderRadius: ihubRadii.xl,
    borderStyle: "dashed",
    borderWidth: 1,
    gap: 6,
    padding: 24,
  },
  emptyTitle: {
    color: ihubColors.ink,
    fontSize: 15,
    fontWeight: "900",
  },
  emptyText: {
    color: ihubColors.mutedInk,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
    textAlign: "center",
  },
  groupList: {
    gap: 11,
  },
  groupCard: {
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.08)",
    borderRadius: ihubRadii.xl,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  groupHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
  },
  groupIcon: {
    alignItems: "center",
    backgroundColor: "rgba(166,149,216,0.16)",
    borderRadius: 18,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  groupIconText: {
    color: ihubColors.lavender,
    fontSize: 16,
    fontWeight: "900",
  },
  groupCopy: {
    flex: 1,
  },
  groupName: {
    color: ihubColors.ink,
    fontSize: 15,
    fontWeight: "900",
  },
  groupMeta: {
    color: ihubColors.mutedInk,
    fontSize: 10.5,
    fontWeight: "800",
    marginTop: 2,
  },
  removeButton: {
    backgroundColor: "rgba(217,130,107,0.12)",
    borderRadius: ihubRadii.pill,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  removeButtonText: {
    color: ihubColors.warn,
    fontSize: 10.5,
    fontWeight: "900",
  },
  memberWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  memberChip: {
    alignItems: "center",
    backgroundColor: "rgba(166,149,216,0.12)",
    borderColor: "rgba(166,149,216,0.24)",
    borderRadius: ihubRadii.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  memberText: {
    color: ihubColors.ink,
    fontSize: 11.5,
    fontWeight: "900",
  },
  memberDelete: {
    color: ihubColors.warn,
    fontSize: 12,
    fontWeight: "900",
  },
  noMemberText: {
    color: ihubColors.mutedInk,
    fontSize: 11.5,
    fontWeight: "800",
  },
});
