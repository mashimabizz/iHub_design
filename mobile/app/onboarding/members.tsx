import { useEffect, useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { Screen } from "../../src/components/Screen";
import { useAuth } from "../../src/auth/AuthProvider";
import { supabase } from "../../src/lib/supabase";
import { ihubColors, ihubRadii } from "../../src/theme/tokens";

type Member = {
  id: string;
  name: string;
};

type Section = {
  key: string;
  groupId: string | null;
  requestId: string | null;
  groupName: string;
  isPending: boolean;
  members: Member[];
  initialMemberIds: string[];
  initialBox: boolean;
};

type Selection = {
  box: boolean;
  memberIds: string[];
};

export default function OnboardingMembersScreen() {
  const { user } = useAuth();
  const [sections, setSections] = useState<Section[]>([]);
  const [selection, setSelection] = useState<Record<string, Selection>>({});
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !supabase) {
      router.replace("/login");
      return;
    }
    let active = true;
    setLoading(true);
    Promise.all([
      supabase
        .from("user_oshi")
        .select("id, group_id, oshi_request_id, character_id, kind, priority, group:groups_master(id, name), oshi_request:oshi_requests(id, requested_name)")
        .eq("user_id", user.id)
        .order("priority", { ascending: true }),
      supabase
        .from("characters_master")
        .select("id, group_id, name, display_order")
        .order("display_order", { ascending: true }),
    ])
      .then(([oshiRes, charsRes]) => {
        if (!active) return;
        const rows = (oshiRes.data as Record<string, unknown>[] | null) ?? [];
        if (rows.length === 0) {
          router.replace("/onboarding/oshi");
          return;
        }
        const charsByGroup = new Map<string, Member[]>();
        for (const char of (charsRes.data as Record<string, unknown>[] | null) ?? []) {
          const groupId = typeof char.group_id === "string" ? char.group_id : null;
          if (!groupId) continue;
          const arr = charsByGroup.get(groupId) ?? [];
          arr.push({ id: String(char.id), name: String(char.name ?? "") });
          charsByGroup.set(groupId, arr);
        }

        const sectionMap = new Map<string, Section>();
        for (const row of rows) {
          const key = String(row.group_id ?? row.oshi_request_id ?? "");
          if (!key) continue;
          const group = pickRelation(row.group as RelationName | undefined);
          const request = pickRequest(row.oshi_request as RequestRelation | undefined);
          const existing = sectionMap.get(key);
          if (existing) {
            if (typeof row.character_id === "string") {
              existing.initialMemberIds.push(row.character_id);
              existing.initialBox = false;
            }
            continue;
          }
          const groupId = typeof row.group_id === "string" ? row.group_id : null;
          sectionMap.set(key, {
            key,
            groupId,
            requestId: typeof row.oshi_request_id === "string" ? row.oshi_request_id : null,
            groupName: group?.name ?? request?.requested_name ?? "推し",
            isPending: !!row.oshi_request_id,
            members: groupId ? charsByGroup.get(groupId) ?? [] : [],
            initialMemberIds:
              typeof row.character_id === "string" ? [row.character_id] : [],
            initialBox: row.kind !== "specific" && row.kind !== "multi",
          });
        }

        const nextSections = Array.from(sectionMap.values());
        const nextSelection: Record<string, Selection> = {};
        for (const section of nextSections) {
          nextSelection[section.key] = {
            box: section.initialBox || section.initialMemberIds.length === 0,
            memberIds: section.initialMemberIds,
          };
        }
        setSections(nextSections);
        setSelection(nextSelection);
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
  }, [user]);

  function setBox(sectionKey: string) {
    setSelection((prev) => ({
      ...prev,
      [sectionKey]: { box: true, memberIds: [] },
    }));
  }

  function toggleMember(sectionKey: string, memberId: string) {
    setSelection((prev) => {
      const current = prev[sectionKey] ?? { box: true, memberIds: [] };
      const nextIds = current.memberIds.includes(memberId)
        ? current.memberIds.filter((id) => id !== memberId)
        : [...current.memberIds, memberId];
      return {
        ...prev,
        [sectionKey]: {
          box: nextIds.length === 0,
          memberIds: nextIds,
        },
      };
    });
  }

  async function save() {
    if (!user || !supabase) {
      router.replace("/login");
      return;
    }
    setPending(true);
    setError(null);
    const { error: deleteError } = await supabase
      .from("user_oshi")
      .delete()
      .eq("user_id", user.id);
    if (deleteError) {
      setPending(false);
      setError(deleteError.message);
      return;
    }

    const rows: Record<string, unknown>[] = [];
    let priority = 1;
    for (const section of sections) {
      const current = selection[section.key] ?? { box: true, memberIds: [] };
      if (section.isPending || current.box || current.memberIds.length === 0) {
        rows.push({
          user_id: user.id,
          group_id: section.groupId,
          oshi_request_id: section.requestId,
          kind: "box",
          priority: priority++,
        });
      } else {
        const kind = current.memberIds.length > 1 ? "multi" : "specific";
        for (const character_id of current.memberIds) {
          rows.push({
            user_id: user.id,
            group_id: section.groupId,
            character_id,
            kind,
            priority: priority++,
          });
        }
      }
    }

    const { error: insertError } = await supabase.from("user_oshi").insert(rows);
    setPending(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    router.push("/onboarding/area");
  }

  return (
    <Screen contentStyle={styles.screen}>
      <Header title="プロフィール設定" sub="推しメン・推しキャラ" progress="3/4" backTo="/onboarding/oshi" />
      <ProgressDots current={2} />
      <Text style={styles.title}>メンバーは？</Text>
      <Text style={styles.copy}>推しごとに「箱推し」または個別メンバーを選択できます</Text>
      {loading ? <ActivityIndicator color={ihubColors.lavender} /> : null}
      <View style={styles.sections}>
        {sections.map((section) => {
          const current = selection[section.key] ?? { box: true, memberIds: [] };
          return (
            <View key={section.key} style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.groupAvatar}>
                  <Text style={styles.groupAvatarText}>{section.groupName.slice(0, 1)}</Text>
                </View>
                <View style={styles.sectionCopy}>
                  <Text style={styles.groupName}>{section.groupName}</Text>
                  <Text style={styles.groupMeta}>
                    {section.isPending
                      ? "承認後にメンバー選択できます"
                      : section.members.length > 0
                        ? `${section.members.length}人から選択`
                        : "メンバーデータ準備中"}
                  </Text>
                </View>
              </View>
              <View style={styles.memberWrap}>
                <Chip label="箱推し（メンバー全員）" active={current.box} onPress={() => setBox(section.key)} />
                {section.members.map((member) => (
                  <Chip
                    key={member.id}
                    label={member.name}
                    active={current.memberIds.includes(member.id)}
                    onPress={() => toggleMember(section.key, member.id)}
                  />
                ))}
              </View>
            </View>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.footer}>
        <PrimaryButton loading={pending} disabled={sections.length === 0} onPress={save}>
          次へ
        </PrimaryButton>
      </View>
    </Screen>
  );
}

type RelationName = { id?: string | null; name?: string | null } | { id?: string | null; name?: string | null }[] | null;
type RequestRelation = { id?: string | null; requested_name?: string | null } | { id?: string | null; requested_name?: string | null }[] | null;

function pickRelation(value: RelationName | undefined) {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function pickRequest(value: RequestRelation | undefined) {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function Header({ title, sub, progress, backTo }: { title: string; sub: string; progress: string; backTo: string }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={() => router.replace(backTo)} style={styles.backButton}>
        <Text style={styles.backText}>‹</Text>
      </Pressable>
      <View style={styles.headerCopy}>
        <Text style={styles.headerTitle}>{title}</Text>
        <Text style={styles.headerSub}>{sub}</Text>
      </View>
      <Text style={styles.progressText}>{progress}</Text>
    </View>
  );
}

function ProgressDots({ current }: { current: number }) {
  return (
    <View style={styles.dots}>
      {[0, 1, 2, 3].map((index) => (
        <View key={index} style={[styles.dot, index <= current ? styles.dotActive : null]} />
      ))}
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active ? styles.chipActive : null]}>
      <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    gap: 13,
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
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  backText: {
    color: ihubColors.ink,
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 32,
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    color: ihubColors.ink,
    fontSize: 17,
    fontWeight: "900",
  },
  headerSub: {
    color: ihubColors.mutedInk,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
  },
  progressText: {
    backgroundColor: "rgba(166,149,216,0.12)",
    borderRadius: ihubRadii.pill,
    color: ihubColors.lavender,
    fontSize: 12,
    fontWeight: "900",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  dots: {
    flexDirection: "row",
    gap: 6,
    marginTop: 5,
  },
  dot: {
    backgroundColor: "rgba(58,50,74,0.12)",
    borderRadius: 999,
    flex: 1,
    height: 5,
  },
  dotActive: {
    backgroundColor: ihubColors.lavender,
  },
  title: {
    color: ihubColors.ink,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 28,
  },
  copy: {
    color: ihubColors.mutedInk,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 19,
  },
  sections: {
    gap: 12,
  },
  sectionCard: {
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.08)",
    borderRadius: ihubRadii.xl,
    borderWidth: 1,
    gap: 13,
    padding: 14,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
  },
  groupAvatar: {
    alignItems: "center",
    backgroundColor: "rgba(166,149,216,0.14)",
    borderRadius: 17,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  groupAvatarText: {
    color: ihubColors.lavender,
    fontSize: 16,
    fontWeight: "900",
  },
  sectionCopy: {
    flex: 1,
  },
  groupName: {
    color: ihubColors.ink,
    fontSize: 15,
    fontWeight: "900",
  },
  groupMeta: {
    color: ihubColors.mutedInk,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 3,
  },
  memberWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.12)",
    borderRadius: ihubRadii.pill,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: "rgba(166,149,216,0.12)",
    borderColor: ihubColors.lavender,
  },
  chipText: {
    color: ihubColors.ink,
    fontSize: 11.5,
    fontWeight: "900",
  },
  chipTextActive: {
    color: ihubColors.lavender,
  },
  error: {
    color: ihubColors.warn,
    fontSize: 12,
    fontWeight: "800",
  },
  footer: {
    marginTop: "auto",
    paddingTop: 16,
  },
});
