import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../src/auth/AuthProvider";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { Screen } from "../src/components/Screen";
import { TextField } from "../src/components/TextField";
import { supabase } from "../src/lib/supabase";
import { ihubColors, ihubRadii, ihubShadow } from "../src/theme/tokens";

type Gender = "female" | "male" | "other" | "no_answer";

type ProfileForm = {
  handle: string;
  displayName: string;
  gender: Gender | null;
  primaryArea: string;
  avatarUrl: string | null;
};

type UserProfileRow = {
  handle: string | null;
  display_name: string | null;
  gender: Gender | null;
  primary_area: string | null;
  avatar_url: string | null;
};

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "female", label: "女性" },
  { value: "male", label: "男性" },
  { value: "other", label: "その他" },
  { value: "no_answer", label: "回答しない" },
];

export default function ProfileEditScreen() {
  const { user, previewMode } = useAuth();
  const [form, setForm] = useState<ProfileForm>(() => fallbackForm(user?.email));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const initial = useMemo(
    () => (form.displayName || form.handle || "?").slice(0, 1).toUpperCase(),
    [form.displayName, form.handle],
  );
  const shouldHoldFormForLoad = loading && !!supabase && !!user && !previewMode;

  useEffect(() => {
    if (!supabase || !user || previewMode) {
      setForm(fallbackForm(user?.email));
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    fetchProfile(user.id, user.email)
      .then((next) => {
        if (active) setForm(next);
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

  async function handleSave() {
    if (!user || !supabase || previewMode) {
      setError("ログイン後に保存できます");
      return;
    }
    const validation = validateForm(form);
    if (validation) {
      setError(validation);
      return;
    }

    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const handle = form.handle.trim().toLowerCase();
      const { data: duplicate, error: duplicateError } = await supabase
        .from("users")
        .select("id")
        .eq("handle", handle)
        .neq("id", user.id)
        .maybeSingle();
      if (duplicateError) throw duplicateError;
      if (duplicate) {
        setError("このハンドル名は既に使われています");
        return;
      }

      const { error: updateError } = await supabase
        .from("users")
        .update({
          handle,
          display_name: form.displayName.trim(),
          gender: form.gender,
          primary_area: form.primaryArea.trim() || null,
          avatar_url: form.avatarUrl,
        })
        .eq("id", user.id);
      if (updateError) throw updateError;
      setSaved(true);
      setTimeout(() => {
        if (router.canGoBack()) router.back();
      }, 350);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存に失敗しました");
    } finally {
      setSaving(false);
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
          <Text style={styles.title}>プロフィール編集</Text>
          <Text style={styles.subtitle}>表示名・エリア・アイコン</Text>
        </View>
      </View>

      {shouldHoldFormForLoad ? (
        <Text style={styles.inlineNotice}>プロフィールを読み込み中…</Text>
      ) : (
        <>
      <View style={styles.avatarPanel}>
        <View style={styles.avatar}>
          {form.avatarUrl ? (
            <Image source={{ uri: form.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{initial}</Text>
          )}
        </View>
        <View style={styles.avatarCopy}>
          <Text style={styles.avatarTitle}>アイコン画像</Text>
          <Text style={styles.avatarSub}>
            ネイティブの画像選択は次の実装で追加します
          </Text>
        </View>
        {form.avatarUrl ? (
          <Pressable
            onPress={() => setForm((current) => ({ ...current, avatarUrl: null }))}
            style={styles.avatarDelete}
          >
            <Text style={styles.avatarDeleteText}>削除</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>基本情報</Text>
        <View style={styles.handleField}>
          <Text style={styles.handlePrefix}>@</Text>
          <TextField
            label="ハンドル名"
            value={form.handle}
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={(handle) =>
              setForm((current) => ({ ...current, handle }))
            }
            style={styles.handleInput}
          />
        </View>
        <TextField
          label="表示名"
          value={form.displayName}
          onChangeText={(displayName) =>
            setForm((current) => ({ ...current, displayName }))
          }
        />
        <TextField
          label="活動エリア"
          value={form.primaryArea}
          placeholder="東京都"
          onChangeText={(primaryArea) =>
            setForm((current) => ({ ...current, primaryArea }))
          }
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>性別</Text>
        <View style={styles.genderGrid}>
          {GENDER_OPTIONS.map((option) => {
            const active = form.gender === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() =>
                  setForm((current) => ({ ...current, gender: option.value }))
                }
                style={[styles.genderChip, active ? styles.genderChipActive : null]}
              >
                <Text
                  style={[
                    styles.genderChipText,
                    active ? styles.genderChipTextActive : null,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {loading ? <Text style={styles.inlineNotice}>プロフィールを読み込み中…</Text> : null}
      {saved ? <Text style={styles.inlineOk}>保存しました</Text> : null}
      {error ? <Text style={styles.inlineError}>{error}</Text> : null}

      <PrimaryButton loading={saving} onPress={handleSave}>
        保存する
      </PrimaryButton>
        </>
      )}
    </Screen>
  );
}

async function fetchProfile(userId: string, email?: string): Promise<ProfileForm> {
  if (!supabase) return fallbackForm(email);
  const { data, error } = await supabase
    .from("users")
    .select("handle, display_name, gender, primary_area, avatar_url")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  const row = data as UserProfileRow | null;
  return {
    handle: row?.handle ?? makeHandle(email),
    displayName: row?.display_name ?? "",
    gender: row?.gender ?? null,
    primaryArea: row?.primary_area ?? "",
    avatarUrl: row?.avatar_url ?? null,
  };
}

function fallbackForm(email?: string): ProfileForm {
  return {
    handle: makeHandle(email),
    displayName: email ? "michi" : "ゲスト",
    gender: null,
    primaryArea: "",
    avatarUrl: null,
  };
}

function validateForm(form: ProfileForm) {
  const handle = form.handle.trim().toLowerCase();
  const displayName = form.displayName.trim();
  if (!/^[a-z0-9_]{3,20}$/.test(handle)) {
    return "ハンドルは半角英数字・_ の3〜20文字で入力してください";
  }
  if (!displayName || displayName.length > 50) {
    return "表示名は1〜50文字で入力してください";
  }
  if (form.primaryArea.trim().length > 50) {
    return "活動エリアは50文字以内で入力してください";
  }
  return null;
}

function makeHandle(email?: string) {
  if (!email) return "preview_hana";
  const local = email.split("@")[0]?.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
  return local || "ihub_user";
}

const styles = StyleSheet.create({
  screen: {
    gap: 15,
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
  avatarPanel: {
    alignItems: "center",
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.08)",
    borderRadius: ihubRadii.xl,
    borderWidth: 1,
    flexDirection: "row",
    gap: 13,
    padding: 15,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: ihubColors.lavender,
    borderRadius: 27,
    height: 64,
    justifyContent: "center",
    overflow: "hidden",
    width: 64,
  },
  avatarImage: {
    height: "100%",
    width: "100%",
  },
  avatarText: {
    color: ihubColors.surface,
    fontSize: 22,
    fontWeight: "900",
  },
  avatarCopy: {
    flex: 1,
  },
  avatarTitle: {
    color: ihubColors.ink,
    fontSize: 13.5,
    fontWeight: "900",
  },
  avatarSub: {
    color: ihubColors.mutedInk,
    fontSize: 10.5,
    fontWeight: "800",
    lineHeight: 15,
    marginTop: 3,
  },
  avatarDelete: {
    backgroundColor: "rgba(217,130,107,0.12)",
    borderRadius: ihubRadii.pill,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  avatarDeleteText: {
    color: ihubColors.warn,
    fontSize: 10.5,
    fontWeight: "900",
  },
  section: {
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.08)",
    borderRadius: ihubRadii.xl,
    borderWidth: 1,
    gap: 12,
    padding: 15,
  },
  sectionTitle: {
    color: ihubColors.lavender,
    fontSize: 11.5,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  handleField: {
    gap: 7,
  },
  handlePrefix: {
    color: ihubColors.mutedInk,
    fontSize: 12,
    fontWeight: "900",
    position: "absolute",
    right: 12,
    top: 0,
  },
  handleInput: {
    textTransform: "lowercase",
  },
  genderGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  genderChip: {
    backgroundColor: "rgba(58,50,74,0.05)",
    borderColor: "rgba(58,50,74,0.08)",
    borderRadius: ihubRadii.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  genderChipActive: {
    backgroundColor: ihubColors.lavender,
    borderColor: ihubColors.lavender,
  },
  genderChipText: {
    color: ihubColors.ink,
    fontSize: 12,
    fontWeight: "900",
  },
  genderChipTextActive: {
    color: ihubColors.surface,
  },
  inlineNotice: {
    color: ihubColors.mutedInk,
    fontSize: 11.5,
    fontWeight: "800",
  },
  inlineOk: {
    color: ihubColors.ok,
    fontSize: 12,
    fontWeight: "900",
  },
  inlineError: {
    color: ihubColors.warn,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
  },
});
