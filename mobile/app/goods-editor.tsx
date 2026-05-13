import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { Screen } from "../src/components/Screen";
import { StatusPill } from "../src/components/StatusPill";
import { useAuth } from "../src/auth/AuthProvider";
import { supabase } from "../src/lib/supabase";
import { ihubColors, ihubRadii, ihubShadow } from "../src/theme/tokens";

type GoodsKind = "inventory" | "wish";
type EditorMode = "create" | "edit" | "readonly";
type DbKind = "for_trade" | "wanted";
type DbStatus = "active" | "keep" | "traded" | "reserved" | "archived";

type Master = { id: string; name: string };
type CharacterMaster = { id: string; name: string; group_id: string };
type PendingMember = { id: string; name: string; group_id: string };
type TagValue = { id: string | null; label: string };
type TagSuggestion = { id: string; label: string; userCount: number };

type EditorItem = {
  id: string;
  kind: DbKind;
  groupId: string;
  characterId: string | null;
  characterRequestId: string | null;
  goodsTypeId: string;
  title: string;
  description: string;
  quantity: number;
  photoUrls: string[];
  carrying: boolean;
  status: DbStatus;
};

type EditorData = {
  groups: Master[];
  characters: CharacterMaster[];
  goodsTypes: Master[];
  pendingMembers: PendingMember[];
  tags: TagValue[];
  item: EditorItem | null;
  lockPhotoRemoval: boolean;
};

const REQ_PREFIX = "req:";
const TAG_LIMIT = 5;

export default function GoodsEditorScreen() {
  const { user, previewMode } = useAuth();
  const params = useLocalSearchParams<{
    id?: string | string[];
    kind?: GoodsKind | GoodsKind[];
    mode?: EditorMode | EditorMode[];
    title?: string | string[];
    group?: string | string[];
    goodsType?: string | string[];
    note?: string | string[];
    glyph?: string | string[];
    hue?: string | string[];
    badge?: string | string[];
    quantity?: string | string[];
  }>();

  const id = one(params.id) ?? "";
  const kind = (one(params.kind) as GoodsKind | undefined) ?? "inventory";
  const mode = (one(params.mode) as EditorMode | undefined) ?? (id ? "edit" : "create");
  const readonly = mode === "readonly";
  const isWish = kind === "wish";
  const initialTitle = one(params.title) ?? (isWish ? "追加Wish" : "追加グッズ");
  const initialQuantity = one(params.quantity);

  const [data, setData] = useState<EditorData>(() => fallbackEditorData(params, kind, mode));
  const [loading, setLoading] = useState(!!supabase && !previewMode && !!user);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  const [groupId, setGroupId] = useState("");
  const [characterValue, setCharacterValue] = useState("");
  const [goodsTypeId, setGoodsTypeId] = useState("");
  const [title, setTitle] = useState(initialTitle);
  const [quantity, setQuantity] = useState(() =>
    Math.max(1, Number(one(params.quantity) ?? "1") || 1),
  );
  const [description, setDescription] = useState(one(params.note) ?? "");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [startCarrying, setStartCarrying] = useState(false);
  const [tags, setTags] = useState<TagValue[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [tagSuggestions, setTagSuggestions] = useState<TagSuggestion[]>([]);
  const hydratedKey = useRef<string | null>(null);

  const screenTitle = useMemo(() => {
    if (readonly) return isWish ? "ウィッシュ詳細" : "グッズ詳細";
    if (mode === "create") return isWish ? "ウィッシュを追加" : "グッズを登録";
    return isWish ? "ウィッシュを編集" : "グッズを編集";
  }, [isWish, mode, readonly]);

  const selectedGoodsType = data.goodsTypes.find((g) => g.id === goodsTypeId);
  const selectedGroup = data.groups.find((g) => g.id === groupId);
  const filteredCharacters = useMemo(
    () => data.characters.filter((c) => c.group_id === groupId),
    [data.characters, groupId],
  );
  const filteredPending = useMemo(
    () => (isWish ? [] : data.pendingMembers.filter((p) => p.group_id === groupId)),
    [data.pendingMembers, groupId, isWish],
  );
  const isOther = selectedGoodsType?.name === "その他";
  const itemIsReadOnly = readonly || data.item?.status === "traded";

  useEffect(() => {
    if (!supabase || previewMode || !user) {
      setData(fallbackEditorData(params, kind, mode));
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setLoadError(null);
    fetchEditorData({ userId: user.id, kind, id: id || null })
      .then((next) => {
        if (active) setData(next);
      })
      .catch((loadErr: unknown) => {
        if (!active) return;
        setLoadError(loadErr instanceof Error ? loadErr.message : "読み込みに失敗しました");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, kind, mode, previewMode, user]);

  useEffect(() => {
    const key = `${kind}:${mode}:${data.item?.id ?? "new"}:${data.groups.length}:${data.goodsTypes.length}`;
    if (hydratedKey.current === key) return;
    hydratedKey.current = key;

    const item = data.item;
    setGroupId(item?.groupId ?? "");
    setCharacterValue(packCharacterValue(item?.characterId ?? null, item?.characterRequestId ?? null));
    setGoodsTypeId(item?.goodsTypeId ?? "");
    setTitle(item?.title ?? (mode === "create" ? "" : initialTitle));
    setQuantity(item?.quantity ?? Math.max(1, Number(initialQuantity ?? "1") || 1));
    setDescription(item?.description ?? "");
    setPhotoUrls(item?.photoUrls ?? []);
    setStartCarrying(item?.carrying ?? false);
    setTags(data.tags);
    setTagDraft("");
    setTagSuggestions([]);
    setError(null);
  }, [data, initialQuantity, initialTitle, kind, mode]);

  useEffect(() => {
    if (!supabase || previewMode || !tagDraft.trim()) {
      setTagSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      void searchTags(tagDraft.trim())
        .then(setTagSuggestions)
        .catch(() => setTagSuggestions([]));
    }, 160);

    return () => clearTimeout(timer);
  }, [previewMode, tagDraft]);

  function handleGroupSelect(nextGroupId: string) {
    if (itemIsReadOnly) return;
    setGroupId(nextGroupId);
    if (!isCharacterValidForGroup(characterValue, nextGroupId, data.characters, data.pendingMembers)) {
      setCharacterValue("");
    }
  }

  function addTag(raw: string, existingId: string | null = null) {
    if (itemIsReadOnly) return;
    const label = raw.replace(/^#+/, "").trim();
    if (!label) return;
    setTags((current) => {
      if (current.some((tag) => tag.label.toLowerCase() === label.toLowerCase())) {
        return current;
      }
      if (current.length >= TAG_LIMIT) return current;
      return [...current, { id: existingId, label }];
    });
    setTagDraft("");
    setTagSuggestions([]);
  }

  function removeTag(index: number) {
    if (itemIsReadOnly) return;
    setTags((current) => current.filter((_, i) => i !== index));
  }

  async function handlePickPhoto() {
    if (itemIsReadOnly || !user || !supabase) return;
    setPhotoUploading(true);
    setError(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError("写真ライブラリの利用を許可してください");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        mediaTypes: ["images"],
        quality: 0.86,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const publicUrl = await uploadGoodsPhoto({
        userId: user.id,
        uri: asset.uri,
        mimeType: asset.mimeType,
        fileName: asset.fileName,
      });
      const oldUrl = photoUrls[0];
      setPhotoUrls([publicUrl]);
      if (oldUrl) {
        void deleteGoodsPhoto(oldUrl);
      }
    } catch (pickErr) {
      setError(pickErr instanceof Error ? pickErr.message : "画像の追加に失敗しました");
    } finally {
      setPhotoUploading(false);
    }
  }

  function handleRemoveWishPhoto() {
    if (itemIsReadOnly || !isWish) return;
    if (data.lockPhotoRemoval) {
      setError("この WISH は個別募集で使用中のため画像を削除できません（差し替えは可能）");
      return;
    }
    setPhotoUrls([]);
  }

  async function handleSave() {
    if (itemIsReadOnly) return;
    if (!supabase || previewMode || !user) {
      router.back();
      return;
    }

    const validation = validateForm();
    if (validation) {
      setError(validation);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const finalTitle = buildFinalTitle();
      if (!finalTitle) {
        setError("タイトルを入力してください");
        return;
      }

      const savedId = isWish
        ? await saveWish({ userId: user.id, finalTitle })
        : await saveInventory({ userId: user.id, finalTitle });

      await syncTags(savedId, tags, data.tags);
      navigateBackToList();
    } catch (saveErr) {
      setError(saveErr instanceof Error ? saveErr.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  function validateForm() {
    if (!goodsTypeId) return "グッズ種別を選択してください";
    if (!groupId && !characterValue) return "推しのグループまたはメンバーを選択してください";
    if (quantity < 1 || quantity > 999) return "数量は 1〜999 で入力してください";
    if (isOther && !title.trim()) return "タイトルを入力してください（その他選択時は必須）";
    if (title.trim().length > 100) return "タイトルは 100 文字以内で入力してください";
    if (isWish && description.length > 200) return "メモは 200 文字以内で入力してください";
    if (!isWish && description.length > 500) return "説明は 500 文字以内で入力してください";
    if (mode === "edit" && !id) return "編集対象が見つかりません";
    return null;
  }

  function buildFinalTitle() {
    const manual = title.trim();
    if (manual) return manual;
    const { characterId, characterRequestId } = splitCharacterValue(characterValue);
    const characterName = characterId
      ? data.characters.find((c) => c.id === characterId)?.name
      : null;
    const requestName = characterRequestId
      ? data.pendingMembers.find((p) => p.id === characterRequestId)?.name
      : null;
    const name = characterName ?? requestName ?? selectedGroup?.name ?? "";
    return `${name} ${selectedGoodsType?.name ?? ""}`.trim();
  }

  async function saveInventory(input: { userId: string; finalTitle: string }) {
    const { characterId, characterRequestId } = splitCharacterValue(characterValue);
    const payload = {
      user_id: input.userId,
      kind: "for_trade" as const,
      group_id: groupId,
      character_id: characterRequestId ? null : characterId,
      character_request_id: characterRequestId,
      goods_type_id: goodsTypeId,
      title: input.finalTitle,
      series: null,
      description: description.trim() || null,
      condition: null,
      quantity,
      photo_urls: photoUrls,
      carrying: startCarrying,
    };

    if (mode === "edit" && id) {
      const current = await loadCurrentStatus(id, input.userId);
      if (current?.status === "traded") {
        throw new Error("過去に譲ったグッズは変更できません");
      }
      const { error: updateError } = await supabase!
        .from("goods_inventory")
        .update({
          group_id: payload.group_id,
          character_id: payload.character_id,
          character_request_id: payload.character_request_id,
          goods_type_id: payload.goods_type_id,
          title: payload.title,
          series: payload.series,
          description: payload.description,
          condition: payload.condition,
          quantity: payload.quantity,
          photo_urls: payload.photo_urls,
          carrying: payload.carrying,
        })
        .eq("id", id)
        .eq("user_id", input.userId)
        .eq("kind", "for_trade");
      if (updateError) throw updateError;
      return id;
    }

    const { data: inserted, error: insertError } = await supabase!
      .from("goods_inventory")
      .insert(payload)
      .select("id")
      .single();
    if (insertError) throw insertError;
    return String((inserted as { id: string }).id);
  }

  async function saveWish(input: { userId: string; finalTitle: string }) {
    const { characterId } = splitCharacterValue(characterValue);
    if (mode === "edit" && id) {
      if (data.lockPhotoRemoval && data.item?.photoUrls.length && photoUrls.length === 0) {
        throw new Error("この WISH は個別募集で使用中のため画像を削除できません（差し替えは可能）");
      }
      const { error: updateError } = await supabase!
        .from("goods_inventory")
        .update({
          group_id: groupId || null,
          character_id: characterId,
          goods_type_id: goodsTypeId,
          title: input.finalTitle,
          description: description.trim() || null,
          quantity,
          photo_urls: photoUrls,
        })
        .eq("id", id)
        .eq("user_id", input.userId)
        .eq("kind", "wanted");
      if (updateError) throw updateError;
      return id;
    }

    const { data: inserted, error: insertError } = await supabase!
      .from("goods_inventory")
      .insert({
        user_id: input.userId,
        kind: "wanted",
        group_id: groupId || null,
        character_id: characterId,
        goods_type_id: goodsTypeId,
        title: input.finalTitle,
        description: description.trim() || null,
        priority: "second",
        flex_level: "exact",
        exchange_type: "any",
        quantity,
        photo_urls: photoUrls,
      })
      .select("id")
      .single();
    if (insertError) throw insertError;
    return String((inserted as { id: string }).id);
  }

  function handleDeleteInventory() {
    if (itemIsReadOnly || isWish || !id || !user || !supabase) return;
    Alert.alert(
      "この在庫を削除しますか？",
      "削除すると復元できません。",
      [
        { text: "閉じる", style: "cancel" },
        {
          text: "削除",
          style: "destructive",
          onPress: () => {
            void deleteInventory();
          },
        },
      ],
    );
  }

  async function deleteInventory() {
    if (!user || !supabase || !id) return;
    setDeleting(true);
    setError(null);
    try {
      const current = await loadCurrentStatus(id, user.id);
      if (current?.status === "traded") {
        setError("過去に譲ったグッズは削除できません");
        return;
      }
      await removeUnavailableHavesFromListings(user.id, [id]);
      const { error: deleteError } = await supabase
        .from("goods_inventory")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id)
        .eq("kind", "for_trade");
      if (deleteError) throw deleteError;
      navigateBackToList();
    } catch (deleteErr) {
      setError(deleteErr instanceof Error ? deleteErr.message : "削除に失敗しました");
    } finally {
      setDeleting(false);
    }
  }

  async function handleMemberRequest() {
    if (!supabase || !user || !groupId || itemIsReadOnly) return;
    const db = supabase;
    const currentUserId = user.id;
    const currentGroupId = groupId;
    Alert.prompt(
      "メンバー追加リクエスト",
      "メンバー名を入力してください",
      async (value) => {
        const name = value?.trim();
        if (!name) return;
        try {
          const { data: inserted, error: insertError } = await db
            .from("character_requests")
            .insert({
              user_id: currentUserId,
              group_id: currentGroupId,
              requested_name: name,
              note: null,
            })
            .select("id")
            .single();
          if (insertError) throw insertError;
          const next = {
            id: String((inserted as { id: string }).id),
            name,
            group_id: currentGroupId,
          };
          setData((current) => ({
            ...current,
            pendingMembers: [next, ...current.pendingMembers],
          }));
          setCharacterValue(`${REQ_PREFIX}${next.id}`);
        } catch (requestErr) {
          setError(
            requestErr instanceof Error
              ? requestErr.message
              : "追加リクエストに失敗しました",
          );
        }
      },
    );
  }

  function navigateBackToList() {
    const refresh = String(Date.now());
    if (isWish) {
      router.replace({
        pathname: "/(tabs)/wishes",
        params: { tab: "wish", refresh },
      });
      return;
    }
    router.replace({
      pathname: "/(tabs)/inventory",
      params: { refresh },
    });
  }

  const previewGlyph = characterValue
    ? characterLabel(characterValue, data.characters, data.pendingMembers).slice(0, 1)
    : selectedGroup?.name.slice(0, 1) || one(params.glyph) || "iH";
  const previewHue = one(params.hue) ?? "#cbbcf4";

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
          <Text style={styles.kicker}>{isWish ? "WISH" : "INVENTORY"}</Text>
          <Text style={styles.title}>{screenTitle}</Text>
        </View>
        <StatusPill
          label={itemIsReadOnly ? "詳細のみ" : mode === "create" ? "NEW" : "EDIT"}
          tone={isWish ? "pink" : "lavender"}
        />
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={ihubColors.lavender} />
          <Text style={styles.loadingText}>マスタと登録内容を読み込み中…</Text>
        </View>
      ) : null}

      {loadError ? <Notice tone="danger">{loadError}</Notice> : null}

      {itemIsReadOnly && !isWish ? (
        <Notice>
          <Text style={styles.noticeStrong}>過去に譲った履歴</Text>
          {"\n"}取引履歴の整合性を保つため、このグッズは詳細確認のみできます。内容の更新や削除はできません。
        </Notice>
      ) : null}

      <View style={itemIsReadOnly ? styles.formReadonly : styles.form}>
        <Section label={isWish ? "推し" : "写真"}>
          {isWish ? (
            <MasterBlock
              groupId={groupId}
              groups={data.groups}
              onGroupSelect={handleGroupSelect}
              readonly={itemIsReadOnly}
            />
          ) : (
            <PhotoEditor
              badge={one(params.badge) ?? (mode === "create" ? "NEW" : "譲る候補")}
              glyph={previewGlyph}
              hue={previewHue}
              isWish={false}
              lockRemoval={false}
              photoUploading={photoUploading}
              photoUrls={photoUrls}
              readonly={itemIsReadOnly}
              title={buildFinalTitle() || initialTitle}
              onPick={handlePickPhoto}
              onRemove={undefined}
            />
          )}
        </Section>

        {!isWish ? (
          <Section label="グループ" required>
            <MasterBlock
              groupId={groupId}
              groups={data.groups}
              onGroupSelect={handleGroupSelect}
              readonly={itemIsReadOnly}
            />
          </Section>
        ) : null}

        <Section label="メンバー / キャラ" hint={isWish ? "任意" : "任意・空 = 共通"}>
          <CharacterChips
            value={characterValue}
            characters={filteredCharacters}
            pendingMembers={filteredPending}
            readonly={itemIsReadOnly}
            onChange={setCharacterValue}
          />
          {!isWish && groupId && !itemIsReadOnly ? (
            <Pressable style={styles.requestButton} onPress={handleMemberRequest}>
              <Text style={styles.requestButtonText}>+ メンバーが見つからない場合は追加リクエスト</Text>
            </Pressable>
          ) : null}
        </Section>

        <Section label="グッズ種別" required>
          <GoodsTypeChips
            value={goodsTypeId}
            goodsTypes={data.goodsTypes}
            readonly={itemIsReadOnly}
            onChange={setGoodsTypeId}
          />
        </Section>

        {isOther ? (
          <Section label="タイトル" required>
            <TextInput
              value={title}
              editable={!itemIsReadOnly}
              onChangeText={setTitle}
              maxLength={100}
              placeholder={isWish ? "例: 公式ステッカー" : "例: 公式ステッカー"}
              placeholderTextColor="rgba(58,50,74,0.35)"
              style={styles.input}
            />
          </Section>
        ) : null}

        <Section label="数量" required>
          <QuantityStepper
            value={quantity}
            readonly={itemIsReadOnly}
            onChange={setQuantity}
          />
        </Section>

        {isWish ? (
          <Section
            label="画像"
            hint={photoUrls.length > 0 ? "1枚登録済" : "任意"}
          >
            <PhotoEditor
              badge={one(params.badge) ?? "未紐付け"}
              glyph={previewGlyph}
              hue={previewHue}
              isWish
              lockRemoval={data.lockPhotoRemoval}
              photoUploading={photoUploading}
              photoUrls={photoUrls}
              readonly={itemIsReadOnly}
              title={buildFinalTitle() || initialTitle}
              onPick={handlePickPhoto}
              onRemove={handleRemoveWishPhoto}
            />
          </Section>
        ) : (
          <Pressable
            disabled={itemIsReadOnly}
            onPress={() => setStartCarrying((current) => !current)}
            style={styles.carryToggle}
          >
            <View style={[styles.checkbox, startCarrying ? styles.checkboxActive : null]}>
              {startCarrying ? <Text style={styles.checkboxText}>✓</Text> : null}
            </View>
            <View style={styles.carryCopy}>
              <Text style={styles.carryTitle}>今日から持参中にする</Text>
              <Text style={styles.carryText}>会場で交換可能な状態にする</Text>
            </View>
          </Pressable>
        )}

        <Section label="タグ" hint="マッチ優先度に使用">
          <TagEditor
            value={tags}
            draft={tagDraft}
            suggestions={tagSuggestions}
            readonly={itemIsReadOnly}
            onChangeDraft={setTagDraft}
            onAdd={addTag}
            onRemove={removeTag}
          />
        </Section>

        <Section
          label={isWish ? "メモ" : "説明 / メモ"}
          hint={`${description.length} / ${isWish ? 200 : 500}`}
        >
          <TextInput
            value={description}
            editable={!itemIsReadOnly}
            multiline
            maxLength={isWish ? 200 : 500}
            onChangeText={setDescription}
            placeholder={isWish ? "例: 4/27 横アリで取引できる人優先" : "補足やコンディションの詳細"}
            placeholderTextColor="rgba(58,50,74,0.35)"
            style={styles.noteInput}
            textAlignVertical="top"
          />
        </Section>
      </View>

      {error ? <Notice tone="danger">{error}</Notice> : null}

      <View style={styles.actions}>
        {itemIsReadOnly ? (
          <PrimaryButton onPress={() => router.back()}>戻る</PrimaryButton>
        ) : (
          <>
            <PrimaryButton loading={saving} onPress={handleSave}>
              {mode === "edit"
                ? isWish
                  ? "ウィッシュを更新"
                  : "変更を保存"
                : isWish
                  ? "ウィッシュを登録"
                  : "登録する"}
            </PrimaryButton>
            {!isWish && mode === "edit" ? (
              <PrimaryButton
                variant="secondary"
                loading={deleting}
                onPress={handleDeleteInventory}
              >
                この在庫を削除
              </PrimaryButton>
            ) : null}
          </>
        )}
      </View>
    </Screen>
  );
}

function MasterBlock({
  groupId,
  groups,
  readonly,
  onGroupSelect,
}: {
  groupId: string;
  groups: Master[];
  readonly: boolean;
  onGroupSelect: (groupId: string) => void;
}) {
  if (groups.length === 0) {
    return (
      <View style={styles.emptyMasterBox}>
        <Text style={styles.emptyMasterText}>推し設定に登録済みのグループがありません</Text>
      </View>
    );
  }

  return (
    <View style={styles.groupGrid}>
      {groups.map((group) => {
        const active = group.id === groupId;
        return (
          <Pressable
            key={group.id}
            disabled={readonly}
            onPress={() => onGroupSelect(group.id)}
            style={[styles.groupChip, active ? styles.groupChipActive : null]}
          >
            <Text
              numberOfLines={1}
              style={[styles.groupChipText, active ? styles.groupChipTextActive : null]}
            >
              {group.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function CharacterChips({
  value,
  characters,
  pendingMembers,
  readonly,
  onChange,
}: {
  value: string;
  characters: CharacterMaster[];
  pendingMembers: PendingMember[];
  readonly: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.chipWrap}>
      <SelectableChip active={!value} label="指定なし" readonly={readonly} onPress={() => onChange("")} />
      {characters.map((character) => (
        <SelectableChip
          key={character.id}
          active={value === character.id}
          label={character.name}
          readonly={readonly}
          onPress={() => onChange(character.id)}
        />
      ))}
      {pendingMembers.map((member) => {
        const packed = `${REQ_PREFIX}${member.id}`;
        return (
          <SelectableChip
            key={packed}
            active={value === packed}
            dashed
            label={`${member.name}（審査中）`}
            readonly={readonly}
            onPress={() => onChange(packed)}
          />
        );
      })}
    </View>
  );
}

function GoodsTypeChips({
  value,
  goodsTypes,
  readonly,
  onChange,
}: {
  value: string;
  goodsTypes: Master[];
  readonly: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.chipWrap}>
      {goodsTypes.map((goodsType) => (
        <SelectableChip
          key={goodsType.id}
          active={value === goodsType.id}
          label={goodsType.name}
          readonly={readonly}
          onPress={() => onChange(goodsType.id)}
        />
      ))}
    </View>
  );
}

function SelectableChip({
  active,
  dashed,
  label,
  readonly,
  onPress,
}: {
  active: boolean;
  dashed?: boolean;
  label: string;
  readonly: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={readonly}
      onPress={onPress}
      style={[
        styles.selectChip,
        dashed ? styles.selectChipDashed : null,
        active ? styles.selectChipActive : null,
      ]}
    >
      <Text
        numberOfLines={1}
        style={[styles.selectChipText, active ? styles.selectChipTextActive : null]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function PhotoEditor({
  badge,
  glyph,
  hue,
  isWish,
  lockRemoval,
  photoUploading,
  photoUrls,
  readonly,
  title,
  onPick,
  onRemove,
}: {
  badge: string;
  glyph: string;
  hue: string;
  isWish: boolean;
  lockRemoval: boolean;
  photoUploading: boolean;
  photoUrls: string[];
  readonly: boolean;
  title: string;
  onPick: () => void;
  onRemove?: () => void;
}) {
  const photoUrl = photoUrls[0] ?? null;

  if (!isWish) {
    return (
      <View style={styles.inventoryPhotoBox}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} resizeMode="cover" style={styles.inventoryPhoto} />
        ) : (
          <View style={[styles.inventoryPhotoFallback, { backgroundColor: hue }]}>
            <Text style={styles.inventoryPhotoGlyph}>{glyph.slice(0, 2)}</Text>
          </View>
        )}
        {!readonly ? (
          <Pressable disabled={photoUploading} onPress={onPick} style={styles.photoOverlayButton}>
            {photoUploading ? (
              <ActivityIndicator color={ihubColors.lavender} size="small" />
            ) : (
              <Text style={styles.photoOverlayText}>
                {photoUrl ? "撮り直す / 差し替え" : "写真を追加"}
              </Text>
            )}
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.wishPhotoCard}>
      <View style={styles.wishPhotoThumb}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} resizeMode="cover" style={styles.wishPhotoImage} />
        ) : (
          <View style={[styles.wishPhotoFallback, { backgroundColor: hue }]}>
            <Text style={styles.wishPhotoGlyph}>{glyph.slice(0, 2)}</Text>
          </View>
        )}
      </View>
      <View style={styles.wishPhotoCopy}>
        <Text numberOfLines={1} style={styles.photoTitle}>{title || "ウィッシュ画像"}</Text>
        <Text numberOfLines={1} style={styles.photoMeta}>
          {photoUrl ? "画像を登録しました" : badge}
        </Text>
        {!readonly ? (
          <View style={styles.photoMiniActions}>
            <Pressable disabled={photoUploading} onPress={onPick} style={styles.photoMiniButton}>
              <Text style={styles.photoMiniButtonText}>
                {photoUploading ? "アップ中…" : photoUrl ? "差し替え" : "+ 画像を選択"}
              </Text>
            </Pressable>
            {photoUrl ? (
              <Pressable
                disabled={lockRemoval}
                onPress={onRemove}
                style={[styles.photoMiniButton, lockRemoval ? styles.photoMiniButtonDisabled : null]}
              >
                <Text style={styles.photoMiniMutedText}>削除</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {lockRemoval && photoUrl ? (
          <Text style={styles.lockText}>個別募集で使用中のため削除できません。差し替えは可能です。</Text>
        ) : null}
      </View>
    </View>
  );
}

function QuantityStepper({
  value,
  readonly,
  onChange,
}: {
  value: number;
  readonly: boolean;
  onChange: (value: number | ((current: number) => number)) => void;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable
        disabled={readonly || value <= 1}
        onPress={() => onChange((current) => Math.max(1, current - 1))}
        style={styles.stepButton}
      >
        <Text style={styles.stepButtonText}>−</Text>
      </Pressable>
      <TextInput
        editable={!readonly}
        keyboardType="number-pad"
        value={String(value)}
        onChangeText={(next) => onChange(Math.max(1, Math.min(999, Number(next) || 1)))}
        style={styles.stepInput}
      />
      <Pressable
        disabled={readonly || value >= 999}
        onPress={() => onChange((current) => Math.min(999, current + 1))}
        style={styles.stepButton}
      >
        <Text style={styles.stepButtonText}>＋</Text>
      </Pressable>
    </View>
  );
}

function TagEditor({
  value,
  draft,
  suggestions,
  readonly,
  onChangeDraft,
  onAdd,
  onRemove,
}: {
  value: TagValue[];
  draft: string;
  suggestions: TagSuggestion[];
  readonly: boolean;
  onChangeDraft: (value: string) => void;
  onAdd: (label: string, id?: string | null) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <View style={styles.tagEditor}>
      <View style={styles.selectedTags}>
        {value.length > 0 ? (
          value.map((tag, index) => (
            <Pressable
              key={`${tag.id ?? "new"}-${tag.label}-${index}`}
              disabled={readonly}
              onPress={() => onRemove(index)}
              style={styles.selectedTag}
            >
              <Text style={styles.selectedTagText}>#{tag.label}</Text>
              {!readonly ? <Text style={styles.selectedTagClose}>×</Text> : null}
            </Pressable>
          ))
        ) : (
          <Text style={styles.noTagText}>タグなし</Text>
        )}
      </View>
      {!readonly ? (
        <>
          <View style={styles.tagInputRow}>
            <TextInput
              value={draft}
              maxLength={40}
              onChangeText={onChangeDraft}
              onSubmitEditing={() => onAdd(draft)}
              placeholder="例：LUMENA Debut Album、Type A など"
              placeholderTextColor="rgba(58,50,74,0.35)"
              style={styles.tagInput}
            />
            <Pressable
              disabled={!draft.trim() || value.length >= TAG_LIMIT}
              onPress={() => onAdd(draft)}
              style={styles.tagAddButton}
            >
              <Text style={styles.tagAddText}>追加</Text>
            </Pressable>
          </View>
          {suggestions.length > 0 ? (
            <View style={styles.suggestionWrap}>
              {suggestions.map((suggestion) => (
                <Pressable
                  key={suggestion.id}
                  onPress={() => onAdd(suggestion.label, suggestion.id)}
                  style={styles.suggestionChip}
                >
                  <Text style={styles.suggestionText}>{suggestion.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <Text style={styles.tagHelper}>
            同じシリーズ・イベントを探している相手とマッチが上位に出やすくなります。
          </Text>
        </>
      ) : null}
    </View>
  );
}

function Section({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
        {hint ? <Text style={styles.sectionRight}>{hint}</Text> : null}
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Notice({ children, tone }: { children: ReactNode; tone?: "danger" }) {
  return (
    <View style={[styles.notice, tone === "danger" ? styles.noticeDanger : null]}>
      <Text style={[styles.noticeText, tone === "danger" ? styles.noticeDangerText : null]}>
        {children}
      </Text>
    </View>
  );
}

async function fetchEditorData({
  userId,
  kind,
  id,
}: {
  userId: string;
  kind: GoodsKind;
  id: string | null;
}): Promise<EditorData> {
  if (!supabase) throw new Error("Supabaseが未設定です");
  const dbKind: DbKind = kind === "wish" ? "wanted" : "for_trade";
  const itemPromise = id
    ? supabase
        .from("goods_inventory")
        .select(
          "id, kind, group_id, character_id, character_request_id, goods_type_id, title, description, quantity, photo_urls, carrying, status, group:groups_master(name), character:characters_master(name), character_request:character_requests(requested_name, status), goods_type:goods_types_master(name)",
        )
        .eq("id", id)
        .eq("user_id", userId)
        .eq("kind", dbKind)
        .maybeSingle()
    : Promise.resolve({ data: null, error: null });

  const [
    { data: itemRaw, error: itemError },
    { data: userOshi, error: oshiError },
    { data: goodsTypes, error: goodsTypesError },
    { data: characters, error: charactersError },
    { data: pendingRequests, error: pendingError },
    { data: tagRows, error: tagError },
  ] = await Promise.all([
    itemPromise,
    supabase
      .from("user_oshi")
      .select("group_id, group:groups_master(id, name)")
      .eq("user_id", userId)
      .not("group_id", "is", null),
    supabase.from("goods_types_master").select("id, name").order("display_order", { ascending: true }),
    supabase.from("characters_master").select("id, name, group_id").order("display_order", { ascending: true }),
    supabase
      .from("character_requests")
      .select("id, group_id, requested_name")
      .eq("user_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    id
      ? supabase
          .from("goods_inventory_tags")
          .select("tag:tags_master(id, label)")
          .eq("inventory_id", id)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (itemError) throw itemError;
  if (oshiError) throw oshiError;
  if (goodsTypesError) throw goodsTypesError;
  if (charactersError) throw charactersError;
  if (pendingError) throw pendingError;
  if (tagError) throw tagError;

  const item = itemRaw ? normalizeEditorItem(itemRaw as Record<string, unknown>) : null;
  const groupMap = new Map<string, Master>();
  for (const entry of (userOshi as { group_id?: string | null; group?: unknown }[] | null) ?? []) {
    if (!entry.group_id) continue;
    const group = pickOne(entry.group as { id?: string; name?: string } | { id?: string; name?: string }[] | null);
    if (group?.id && group.name) groupMap.set(group.id, { id: group.id, name: group.name });
  }

  if (item?.groupId && !groupMap.has(item.groupId)) {
    const { data: extraGroup } = await supabase
      .from("groups_master")
      .select("id, name")
      .eq("id", item.groupId)
      .maybeSingle();
    if (extraGroup?.id && extraGroup?.name) {
      groupMap.set(String(extraGroup.id), {
        id: String(extraGroup.id),
        name: String(extraGroup.name),
      });
    }
  }

  const groups = Array.from(groupMap.values());
  const groupIds = new Set(groups.map((group) => group.id));
  const filteredCharacters = ((characters as CharacterMaster[] | null) ?? []).filter(
    (character) => character.group_id && groupIds.has(character.group_id),
  );
  const pendingMembers = kind === "wish"
    ? []
    : ((pendingRequests as { id: string; group_id: string | null; requested_name: string }[] | null) ?? [])
        .filter((request) => request.group_id && groupIds.has(request.group_id))
        .map((request) => ({
          id: request.id,
          name: request.requested_name,
          group_id: request.group_id!,
        }));

  let lockPhotoRemoval = false;
  if (kind === "wish" && id) {
    const { data: linkedOpts } = await supabase
      .from("listing_wish_options")
      .select("id, listing:listings!inner(status)")
      .contains("wish_ids", [id]);
    lockPhotoRemoval = ((linkedOpts as { listing?: { status?: string } | { status?: string }[] | null }[] | null) ?? [])
      .some((option) => {
        const listing = pickOne(option.listing ?? null);
        return !!listing && listing.status !== "closed";
      });
  }

  return {
    groups,
    characters: filteredCharacters,
    goodsTypes: ((goodsTypes as Master[] | null) ?? []).map((goodsType) => ({
      id: goodsType.id,
      name: goodsType.name,
    })),
    pendingMembers,
    tags: extractTags(tagRows),
    item,
    lockPhotoRemoval,
  };
}

function normalizeEditorItem(row: Record<string, unknown>): EditorItem {
  return {
    id: String(row.id),
    kind: row.kind === "wanted" ? "wanted" : "for_trade",
    groupId: typeof row.group_id === "string" ? row.group_id : "",
    characterId: typeof row.character_id === "string" ? row.character_id : null,
    characterRequestId:
      typeof row.character_request_id === "string" ? row.character_request_id : null,
    goodsTypeId: typeof row.goods_type_id === "string" ? row.goods_type_id : "",
    title: typeof row.title === "string" ? row.title : "",
    description: typeof row.description === "string" ? row.description : "",
    quantity: Math.max(1, Number(row.quantity) || 1),
    photoUrls: Array.isArray(row.photo_urls)
      ? row.photo_urls.filter((url): url is string => typeof url === "string")
      : [],
    carrying: Boolean(row.carrying),
    status: normalizeStatus(row.status),
  };
}

function fallbackEditorData(
  params: ReturnType<typeof useLocalSearchParams>,
  kind: GoodsKind,
  mode: EditorMode,
): EditorData {
  const groupName = one((params as { group?: string | string[] }).group) ?? "";
  const typeName = one((params as { goodsType?: string | string[] }).goodsType) ?? "";
  const title = one((params as { title?: string | string[] }).title) ?? "";
  const group = groupName ? [{ id: "preview-group", name: groupName }] : [];
  const goodsType = typeName ? [{ id: "preview-type", name: typeName }] : [];
  return {
    groups: group,
    characters: [],
    goodsTypes: goodsType,
    pendingMembers: [],
    tags: [],
    item:
      mode === "create"
        ? null
        : {
            id: "preview",
            kind: kind === "wish" ? "wanted" : "for_trade",
            groupId: group[0]?.id ?? "",
            characterId: null,
            characterRequestId: null,
            goodsTypeId: goodsType[0]?.id ?? "",
            title,
            description: one((params as { note?: string | string[] }).note) ?? "",
            quantity: Math.max(1, Number(one((params as { quantity?: string | string[] }).quantity) ?? "1") || 1),
            photoUrls: [],
            carrying: false,
            status: mode === "readonly" ? "traded" : "active",
          },
    lockPhotoRemoval: false,
  };
}

async function uploadGoodsPhoto(input: {
  userId: string;
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
}) {
  if (!supabase) throw new Error("Supabaseが未設定です");
  const ext = extensionFrom(input.fileName ?? input.uri, input.mimeType);
  const path = `${input.userId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const response = await fetch(input.uri);
  const body = await response.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from("goods-photos")
    .upload(path, body, {
      contentType: input.mimeType ?? "image/jpeg",
      upsert: false,
    });
  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from("goods-photos").getPublicUrl(path);
  return data.publicUrl;
}

async function deleteGoodsPhoto(url: string) {
  if (!supabase) return;
  const path = extractStoragePath(url);
  if (!path) return;
  await supabase.storage.from("goods-photos").remove([path]).catch(() => undefined);
}

async function loadCurrentStatus(id: string, userId: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("goods_inventory")
    .select("id, status")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as { id: string; status: DbStatus } | null;
}

async function removeUnavailableHavesFromListings(userId: string, inventoryIds: string[]) {
  if (!supabase || inventoryIds.length === 0) return;
  const removeSet = new Set(inventoryIds);
  const { data: listings } = await supabase
    .from("listings")
    .select("id, have_ids, have_qtys, status")
    .eq("user_id", userId)
    .in("status", ["active", "paused"]);

  for (const listing of
    (listings as {
      id: string;
      have_ids: string[] | null;
      have_qtys: number[] | null;
    }[] | null) ?? []) {
    const haveIds = listing.have_ids ?? [];
    if (!haveIds.some((itemId) => removeSet.has(itemId))) continue;

    const nextIds: string[] = [];
    const nextQtys: number[] = [];
    for (let i = 0; i < haveIds.length; i++) {
      const itemId = haveIds[i];
      if (removeSet.has(itemId)) continue;
      nextIds.push(itemId);
      nextQtys.push(listing.have_qtys?.[i] ?? 1);
    }

    if (nextIds.length === 0) {
      await supabase
        .from("listings")
        .update({ status: "closed" })
        .eq("id", listing.id)
        .eq("user_id", userId);
      continue;
    }

    await supabase
      .from("listings")
      .update({ have_ids: nextIds, have_qtys: nextQtys })
      .eq("id", listing.id)
      .eq("user_id", userId);
  }
}

async function searchTags(q: string): Promise<TagSuggestion[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("search_tags", {
    p_q: q,
    p_limit: 8,
  });
  if (error) return [];
  return ((data as {
    id: string;
    label: string;
    user_count: number;
  }[] | null) ?? []).map((tag) => ({
    id: tag.id,
    label: tag.label,
    userCount: tag.user_count,
  }));
}

async function syncTags(inventoryId: string, currentTags: TagValue[], existingTags: TagValue[]) {
  if (!supabase) return;
  const currentIds = new Set(
    currentTags.map((tag) => tag.id).filter((tagId): tagId is string => !!tagId),
  );
  for (const existing of existingTags) {
    if (existing.id && !currentIds.has(existing.id)) {
      await supabase.rpc("detach_inventory_tag", {
        p_inventory_id: inventoryId,
        p_tag_id: existing.id,
      });
    }
  }

  const existingIds = new Set(existingTags.map((tag) => tag.id).filter(Boolean));
  for (const current of currentTags) {
    if (current.id && existingIds.has(current.id)) continue;
    const { error } = await supabase.rpc("attach_inventory_tag", {
      p_inventory_id: inventoryId,
      p_raw_label: current.label,
    });
    if (error) throw error;
  }
}

function extractTags(rows: unknown): TagValue[] {
  return ((rows as { tag?: { id?: string; label?: string } | { id?: string; label?: string }[] | null }[] | null) ?? [])
    .map((row) => pickOne(row.tag ?? null))
    .filter((tag): tag is { id: string; label: string } => !!tag?.id && !!tag?.label)
    .map((tag) => ({ id: tag.id, label: tag.label }));
}

function packCharacterValue(characterId: string | null, characterRequestId: string | null) {
  if (characterRequestId) return `${REQ_PREFIX}${characterRequestId}`;
  if (characterId) return characterId;
  return "";
}

function splitCharacterValue(value: string): {
  characterId: string | null;
  characterRequestId: string | null;
} {
  if (!value) return { characterId: null, characterRequestId: null };
  if (value.startsWith(REQ_PREFIX)) {
    return { characterId: null, characterRequestId: value.slice(REQ_PREFIX.length) };
  }
  return { characterId: value, characterRequestId: null };
}

function isCharacterValidForGroup(
  value: string,
  groupId: string,
  characters: CharacterMaster[],
  pendingMembers: PendingMember[],
) {
  if (!value) return true;
  if (value.startsWith(REQ_PREFIX)) {
    const requestId = value.slice(REQ_PREFIX.length);
    return pendingMembers.some((member) => member.id === requestId && member.group_id === groupId);
  }
  return characters.some((character) => character.id === value && character.group_id === groupId);
}

function characterLabel(
  value: string,
  characters: CharacterMaster[],
  pendingMembers: PendingMember[],
) {
  if (!value) return "";
  if (value.startsWith(REQ_PREFIX)) {
    const requestId = value.slice(REQ_PREFIX.length);
    return pendingMembers.find((member) => member.id === requestId)?.name ?? "";
  }
  return characters.find((character) => character.id === value)?.name ?? "";
}

function one(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function normalizeStatus(value: unknown): DbStatus {
  if (
    value === "active" ||
    value === "keep" ||
    value === "traded" ||
    value === "reserved" ||
    value === "archived"
  ) {
    return value;
  }
  return "active";
}

function extensionFrom(fileNameOrUri?: string | null, mimeType?: string | null) {
  const fromMime = mimeType?.split("/")[1];
  if (fromMime) return fromMime === "jpeg" ? "jpg" : fromMime;
  const clean = fileNameOrUri?.split("?")[0] ?? "";
  const ext = clean.includes(".") ? clean.split(".").pop() : null;
  return ext && ext.length <= 5 ? ext : "jpg";
}

function extractStoragePath(url: string) {
  const marker = "/object/public/goods-photos/";
  const index = url.indexOf(marker);
  if (index < 0) return null;
  return url.slice(index + marker.length);
}

const styles = StyleSheet.create({
  screen: {
    gap: 16,
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
    fontWeight: "700",
    lineHeight: 34,
  },
  headerCopy: {
    flex: 1,
  },
  kicker: {
    color: ihubColors.lavender,
    fontSize: 10.5,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  title: {
    color: ihubColors.ink,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 25,
  },
  loadingBox: {
    alignItems: "center",
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.08)",
    borderRadius: ihubRadii.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 14,
  },
  loadingText: {
    color: ihubColors.mutedInk,
    fontSize: 12,
    fontWeight: "800",
  },
  form: {
    gap: 14,
  },
  formReadonly: {
    gap: 14,
    opacity: 0.86,
  },
  section: {
    gap: 7,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  sectionLabel: {
    color: ihubColors.lavender,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  required: {
    color: ihubColors.warn,
  },
  sectionRight: {
    color: ihubColors.mutedInk,
    fontSize: 10,
    fontWeight: "800",
  },
  sectionBody: {
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.08)",
    borderRadius: ihubRadii.lg,
    borderWidth: 1,
    gap: 12,
    padding: 13,
  },
  groupGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  groupChip: {
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.08)",
    borderRadius: ihubRadii.md,
    borderWidth: 1,
    maxWidth: "48%",
    minWidth: "30%",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  groupChipActive: {
    backgroundColor: ihubColors.lavender,
    borderColor: ihubColors.lavender,
    shadowColor: ihubColors.lavender,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 2,
  },
  groupChipText: {
    color: ihubColors.ink,
    fontSize: 12.5,
    fontWeight: "900",
    textAlign: "center",
  },
  groupChipTextActive: {
    color: ihubColors.surface,
  },
  emptyMasterBox: {
    backgroundColor: "rgba(166,149,216,0.08)",
    borderColor: "rgba(166,149,216,0.25)",
    borderRadius: ihubRadii.md,
    borderWidth: 1,
    padding: 12,
  },
  emptyMasterText: {
    color: ihubColors.mutedInk,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  selectChip: {
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.10)",
    borderRadius: ihubRadii.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  selectChipDashed: {
    borderColor: ihubColors.lavender,
    borderStyle: "dashed",
  },
  selectChipActive: {
    backgroundColor: ihubColors.lavender,
    borderColor: ihubColors.lavender,
  },
  selectChipText: {
    color: ihubColors.ink,
    fontSize: 11.5,
    fontWeight: "900",
  },
  selectChipTextActive: {
    color: ihubColors.surface,
  },
  requestButton: {
    alignSelf: "flex-start",
    borderColor: "rgba(166,149,216,0.52)",
    borderRadius: ihubRadii.md,
    borderStyle: "dashed",
    borderWidth: 1,
    marginTop: 2,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  requestButtonText: {
    color: ihubColors.lavender,
    fontSize: 11.5,
    fontWeight: "900",
  },
  inventoryPhotoBox: {
    alignSelf: "center",
    backgroundColor: ihubColors.ink,
    borderColor: "rgba(58,50,74,0.08)",
    borderRadius: 22,
    borderWidth: 1,
    height: 306,
    overflow: "hidden",
    width: 230,
    ...ihubShadow,
  },
  inventoryPhoto: {
    height: "100%",
    width: "100%",
  },
  inventoryPhotoFallback: {
    alignItems: "center",
    height: "100%",
    justifyContent: "center",
    width: "100%",
  },
  inventoryPhotoGlyph: {
    color: ihubColors.surface,
    fontSize: 48,
    fontWeight: "900",
  },
  photoOverlayButton: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: ihubRadii.pill,
    bottom: 12,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: 16,
    position: "absolute",
  },
  photoOverlayText: {
    color: ihubColors.ink,
    fontSize: 12,
    fontWeight: "900",
  },
  wishPhotoCard: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
  },
  wishPhotoThumb: {
    backgroundColor: ihubColors.background,
    borderColor: "rgba(58,50,74,0.08)",
    borderRadius: 10,
    borderWidth: 1,
    height: 88,
    overflow: "hidden",
    width: 68,
  },
  wishPhotoImage: {
    height: "100%",
    width: "100%",
  },
  wishPhotoFallback: {
    alignItems: "center",
    height: "100%",
    justifyContent: "center",
    width: "100%",
  },
  wishPhotoGlyph: {
    color: ihubColors.surface,
    fontSize: 21,
    fontWeight: "900",
  },
  wishPhotoCopy: {
    flex: 1,
    gap: 6,
  },
  photoTitle: {
    color: ihubColors.ink,
    fontSize: 12.5,
    fontWeight: "900",
  },
  photoMeta: {
    color: ihubColors.mutedInk,
    fontSize: 11,
    fontWeight: "800",
  },
  photoMiniActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  photoMiniButton: {
    borderColor: "rgba(166,149,216,0.35)",
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  photoMiniButtonDisabled: {
    opacity: 0.42,
  },
  photoMiniButtonText: {
    color: ihubColors.lavender,
    fontSize: 11,
    fontWeight: "900",
  },
  photoMiniMutedText: {
    color: ihubColors.mutedInk,
    fontSize: 11,
    fontWeight: "900",
  },
  lockText: {
    backgroundColor: "rgba(166,149,216,0.06)",
    borderRadius: 8,
    color: ihubColors.mutedInk,
    fontSize: 10.5,
    fontWeight: "800",
    lineHeight: 15,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  stepper: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 10,
  },
  stepButton: {
    alignItems: "center",
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.10)",
    borderRadius: ihubRadii.pill,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  stepButtonText: {
    color: ihubColors.ink,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 22,
  },
  stepInput: {
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.10)",
    borderRadius: ihubRadii.md,
    borderWidth: 1,
    color: ihubColors.ink,
    fontSize: 16,
    fontWeight: "900",
    height: 42,
    minWidth: 76,
    paddingHorizontal: 12,
    textAlign: "center",
  },
  carryToggle: {
    alignItems: "flex-start",
    backgroundColor: "rgba(168,212,230,0.18)",
    borderRadius: ihubRadii.md,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  checkbox: {
    alignItems: "center",
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.18)",
    borderRadius: 5,
    borderWidth: 1,
    height: 18,
    justifyContent: "center",
    marginTop: 1,
    width: 18,
  },
  checkboxActive: {
    backgroundColor: ihubColors.lavender,
    borderColor: ihubColors.lavender,
  },
  checkboxText: {
    color: ihubColors.surface,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 14,
  },
  carryCopy: {
    flex: 1,
    gap: 2,
  },
  carryTitle: {
    color: ihubColors.ink,
    fontSize: 12.5,
    fontWeight: "900",
  },
  carryText: {
    color: ihubColors.mutedInk,
    fontSize: 11,
    fontWeight: "700",
  },
  input: {
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.12)",
    borderRadius: ihubRadii.md,
    borderWidth: 1,
    color: ihubColors.ink,
    fontSize: 15,
    fontWeight: "700",
    minHeight: 48,
    paddingHorizontal: 14,
  },
  noteInput: {
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.12)",
    borderRadius: ihubRadii.md,
    borderWidth: 1,
    color: ihubColors.ink,
    fontSize: 14,
    fontWeight: "700",
    minHeight: 96,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  tagEditor: {
    gap: 9,
  },
  selectedTags: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    minHeight: 32,
  },
  selectedTag: {
    alignItems: "center",
    backgroundColor: "rgba(166,149,216,0.08)",
    borderColor: "rgba(166,149,216,0.35)",
    borderRadius: ihubRadii.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  selectedTagText: {
    color: ihubColors.lavender,
    fontSize: 11,
    fontWeight: "900",
  },
  selectedTagClose: {
    color: ihubColors.lavender,
    fontSize: 12,
    fontWeight: "900",
  },
  noTagText: {
    color: ihubColors.mutedInk,
    fontSize: 12,
    fontWeight: "800",
  },
  tagInputRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  tagInput: {
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.12)",
    borderRadius: ihubRadii.md,
    borderWidth: 1,
    color: ihubColors.ink,
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    minHeight: 44,
    paddingHorizontal: 12,
  },
  tagAddButton: {
    alignItems: "center",
    backgroundColor: ihubColors.lavender,
    borderRadius: ihubRadii.md,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 14,
  },
  tagAddText: {
    color: ihubColors.surface,
    fontSize: 12,
    fontWeight: "900",
  },
  suggestionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  suggestionChip: {
    backgroundColor: ihubColors.background,
    borderRadius: ihubRadii.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  suggestionText: {
    color: ihubColors.ink,
    fontSize: 10.5,
    fontWeight: "800",
  },
  tagHelper: {
    color: ihubColors.mutedInk,
    fontSize: 10.5,
    fontWeight: "700",
    lineHeight: 16,
  },
  notice: {
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.08)",
    borderRadius: ihubRadii.lg,
    borderWidth: 1,
    padding: 14,
  },
  noticeDanger: {
    backgroundColor: "rgba(217,130,107,0.10)",
    borderColor: "rgba(217,130,107,0.25)",
  },
  noticeText: {
    color: ihubColors.mutedInk,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
  },
  noticeStrong: {
    color: ihubColors.ink,
    fontWeight: "900",
  },
  noticeDangerText: {
    color: ihubColors.warn,
  },
  actions: {
    gap: 10,
    marginTop: 2,
  },
});
