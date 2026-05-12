import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { Screen } from "../src/components/Screen";
import { StatusPill } from "../src/components/StatusPill";
import { TextField } from "../src/components/TextField";
import { ihubColors, ihubRadii, ihubShadow } from "../src/theme/tokens";

type GoodsKind = "inventory" | "wish";
type EditorMode = "create" | "edit" | "readonly";
type Condition = "sealed" | "mint" | "good" | "fair" | "poor";

const TAG_OPTIONS = ["ラキドロ", "会場限定", "通常盤", "同種優先", "現地OK"];
const CONDITIONS: { value: Condition; label: string }[] = [
  { value: "sealed", label: "未開封" },
  { value: "mint", label: "極美" },
  { value: "good", label: "良好" },
  { value: "fair", label: "普通" },
  { value: "poor", label: "難あり" },
];

export default function GoodsEditorScreen() {
  const params = useLocalSearchParams<{
    kind?: GoodsKind | GoodsKind[];
    mode?: EditorMode | EditorMode[];
    title?: string | string[];
    subtitle?: string | string[];
    group?: string | string[];
    goodsType?: string | string[];
    note?: string | string[];
    glyph?: string | string[];
    hue?: string | string[];
    badge?: string | string[];
    quantity?: string | string[];
  }>();
  const kind = (one(params.kind) as GoodsKind | undefined) ?? "inventory";
  const mode = (one(params.mode) as EditorMode | undefined) ?? "edit";
  const readonly = mode === "readonly";
  const isWish = kind === "wish";
  const initialTitle = one(params.title) ?? (isWish ? "追加Wish" : "追加グッズ");
  const initialGroup = one(params.group) ?? "";
  const initialType = one(params.goodsType) ?? "";
  const [title, setTitle] = useState(initialTitle);
  const [group, setGroup] = useState(initialGroup);
  const [goodsType, setGoodsType] = useState(initialType);
  const [member, setMember] = useState("");
  const [series, setSeries] = useState("");
  const [condition, setCondition] = useState<Condition>("good");
  const [startCarrying, setStartCarrying] = useState(false);
  const [quantity, setQuantity] = useState(() =>
    Math.max(1, Number(one(params.quantity) ?? "1") || 1),
  );
  const [note, setNote] = useState(one(params.note) ?? "");
  const [tags, setTags] = useState<string[]>(() =>
    (one(params.note) ?? "")
      .split(/[、,\s]+/)
      .filter((tag) => TAG_OPTIONS.includes(tag)),
  );
  const hue = one(params.hue) ?? (isWish ? "#f3c5d4" : "#cbbcf4");
  const glyph = one(params.glyph) ?? title.slice(0, 1) ?? "?";
  const badge = one(params.badge) ?? (isWish ? "未紐付け" : "譲る候補");
  const screenTitle = useMemo(() => {
    if (readonly) return isWish ? "ウィッシュ詳細" : "譲渡履歴";
    if (mode === "create") return isWish ? "wish を追加" : "グッズを登録";
    return isWish ? "ウィッシュを編集" : "在庫を編集";
  }, [isWish, mode, readonly]);

  function toggleTag(tag: string) {
    if (readonly) return;
    setTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag],
    );
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
          <Text style={styles.kicker}>{isWish ? "WISH" : "INVENTORY"}</Text>
          <Text style={styles.title}>{screenTitle}</Text>
        </View>
        <StatusPill
          label={readonly ? "詳細のみ" : mode === "create" ? "NEW" : "EDIT"}
          tone={isWish ? "pink" : "lavender"}
        />
      </View>

      {readonly ? (
        <View style={styles.readonlyNotice}>
          <Text style={styles.readonlyTitle}>過去に譲ったグッズです</Text>
          <Text style={styles.readonlyText}>
            取引履歴の整合性を保つため、このグッズは詳細確認のみできます。
          </Text>
        </View>
      ) : null}

      <View style={readonly ? styles.formReadonly : styles.form}>
        {!isWish ? (
          <Section label="写真" right={readonly ? "詳細のみ" : "準備中"}>
            <PhotoPlaceholder
              badge={badge}
              glyph={glyph}
              hue={hue}
              readonly={readonly}
              title={title || initialTitle}
            />
          </Section>
        ) : null}

        <Section label="推し">
          <TextField
            label="グループ"
            value={group}
            editable={!readonly}
            onChangeText={setGroup}
            placeholder="選択してください"
          />
          <TextField
            label={isWish ? "メンバー（任意）" : "メンバー（任意・空 = 箱推し / 共通）"}
            value={member}
            editable={!readonly}
            onChangeText={setMember}
            placeholder="指定なし"
          />
        </Section>

        <Section label="グッズ">
          <TextField
            label="種別"
            value={goodsType}
            editable={!readonly}
            onChangeText={setGoodsType}
            placeholder="選択してください"
          />
          <TextField
            label="タイトル"
            value={title}
            editable={!readonly}
            onChangeText={setTitle}
            placeholder={isWish ? "例: 公式ステッカー" : "例: スア トレカ（カムバ盤）"}
          />
          {!isWish ? (
            <TextField
              label="シリーズ・弾名（任意）"
              value={series}
              editable={!readonly}
              onChangeText={setSeries}
              placeholder="例: WORLD TOUR / 5th Mini / 公式"
            />
          ) : null}
          {isWish ? (
            <QuantityStepper
              value={quantity}
              readonly={readonly}
              onChange={setQuantity}
            />
          ) : null}
        </Section>

        {isWish ? (
          <Section label="画像" right="任意">
            <PhotoPlaceholder
              badge={badge}
              glyph={glyph}
              hue={hue}
              readonly={readonly}
              title={title || initialTitle}
            />
          </Section>
        ) : (
          <Section label="状態">
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>コンディション</Text>
              <View style={styles.conditionGrid}>
                {CONDITIONS.map((item) => {
                  const active = item.value === condition;
                  return (
                    <Pressable
                      key={item.value}
                      disabled={readonly}
                      onPress={() => setCondition(item.value)}
                      style={[
                        styles.conditionButton,
                        active ? styles.conditionButtonActive : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.conditionText,
                          active ? styles.conditionTextActive : null,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <QuantityStepper
              value={quantity}
              readonly={readonly}
              onChange={setQuantity}
            />
          </Section>
        )}

        {!isWish ? (
          <Pressable
            disabled={readonly}
            onPress={() => setStartCarrying((current) => !current)}
            style={styles.carryToggle}
          >
            <View
              style={[
                styles.checkbox,
                startCarrying ? styles.checkboxActive : null,
              ]}
            >
              {startCarrying ? <Text style={styles.checkboxText}>✓</Text> : null}
            </View>
            <View style={styles.carryCopy}>
              <Text style={styles.carryTitle}>今日から持参中にする</Text>
              <Text style={styles.carryText}>
                会場で交換可能な状態にする
              </Text>
            </View>
          </Pressable>
        ) : null}

        <Section label={isWish ? "タグ（任意）" : "タグ（任意）"} right="マッチ優先度に使用">
          <View style={styles.tagWrap}>
            {TAG_OPTIONS.map((tag) => {
              const active = tags.includes(tag);
              return (
                <Pressable
                  key={tag}
                  disabled={readonly}
                  onPress={() => toggleTag(tag)}
                  style={[styles.tagChip, active ? styles.tagChipActive : null]}
                >
                  <Text
                    style={[
                      styles.tagChipText,
                      active ? styles.tagChipTextActive : null,
                    ]}
                  >
                    {tag}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section label="メモ" right={isWish ? `${note.length} / 200` : `${note.length} / 1000`}>
          <TextInput
            value={note}
            editable={!readonly}
            multiline
            onChangeText={setNote}
            placeholder={isWish ? "例: 4/27 横アリで取引できる人優先" : "状態の補足、入手経路など"}
            placeholderTextColor="rgba(58,50,74,0.35)"
            style={styles.noteInput}
            textAlignVertical="top"
          />
        </Section>
      </View>

      <View style={styles.actions}>
        {readonly ? (
          <PrimaryButton onPress={() => router.back()}>戻る</PrimaryButton>
        ) : (
          <>
            {mode === "edit" ? (
              <PrimaryButton variant="secondary" onPress={() => router.back()}>
                削除
              </PrimaryButton>
            ) : null}
            <PrimaryButton onPress={() => router.back()}>
              保存して戻る
            </PrimaryButton>
          </>
        )}
      </View>
    </Screen>
  );
}

function Section({
  label,
  right,
  children,
}: {
  label: string;
  right?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>{label}</Text>
        {right ? <Text style={styles.sectionRight}>{right}</Text> : null}
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function PhotoPlaceholder({
  badge,
  glyph,
  hue,
  readonly,
  title,
}: {
  badge: string;
  glyph: string;
  hue: string;
  readonly: boolean;
  title: string;
}) {
  return (
    <View style={styles.photoRow}>
      <View style={[styles.photoThumb, { backgroundColor: hue }]}>
        <Text style={styles.photoGlyph}>{glyph.slice(0, 2)}</Text>
      </View>
      <View style={styles.photoCopy}>
        <Text numberOfLines={1} style={styles.photoTitle}>
          {title}
        </Text>
        <Text numberOfLines={1} style={styles.photoMeta}>
          {badge}
        </Text>
        {!readonly ? (
          <Pressable style={styles.photoButton}>
            <Text style={styles.photoButtonText}>+ 画像を選択</Text>
          </Pressable>
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
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>数量</Text>
      <View style={styles.stepper}>
        <Pressable
          disabled={readonly || value <= 1}
          onPress={() => onChange((current) => Math.max(1, current - 1))}
          style={styles.stepButton}
        >
          <Text style={styles.stepButtonText}>−</Text>
        </Pressable>
        <Text style={styles.stepValue}>{value}</Text>
        <Pressable
          disabled={readonly}
          onPress={() => onChange((current) => Math.min(999, current + 1))}
          style={styles.stepButton}
        >
          <Text style={styles.stepButtonText}>＋</Text>
        </Pressable>
      </View>
    </View>
  );
}

function one(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
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
  readonlyNotice: {
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.08)",
    borderRadius: ihubRadii.lg,
    borderWidth: 1,
    padding: 14,
  },
  readonlyTitle: {
    color: ihubColors.ink,
    fontSize: 13,
    fontWeight: "900",
  },
  readonlyText: {
    color: ihubColors.mutedInk,
    fontSize: 11.5,
    fontWeight: "800",
    lineHeight: 18,
    marginTop: 5,
  },
  photoRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  photoThumb: {
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.92)",
    borderRadius: 13,
    borderWidth: 2,
    height: 88,
    justifyContent: "center",
    overflow: "hidden",
    width: 68,
  },
  photoGlyph: {
    color: ihubColors.surface,
    fontSize: 22,
    fontWeight: "900",
  },
  photoCopy: {
    flex: 1,
    gap: 6,
  },
  photoTitle: {
    color: ihubColors.ink,
    fontSize: 13,
    fontWeight: "900",
  },
  photoMeta: {
    color: ihubColors.mutedInk,
    fontSize: 11,
    fontWeight: "800",
  },
  photoButton: {
    alignSelf: "flex-start",
    backgroundColor: ihubColors.background,
    borderColor: "rgba(166,149,216,0.35)",
    borderRadius: 10,
    borderStyle: "dashed",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  photoButtonText: {
    color: ihubColors.lavender,
    fontSize: 11.5,
    fontWeight: "900",
  },
  previewCard: {
    alignItems: "center",
  },
  previewImage: {
    borderColor: "rgba(255,255,255,0.92)",
    borderRadius: 22,
    borderWidth: 2,
    height: 250,
    overflow: "hidden",
    width: 188,
    ...ihubShadow,
  },
  previewShine: {
    backgroundColor: "rgba(255,255,255,0.26)",
    borderRadius: 999,
    height: 96,
    position: "absolute",
    right: -25,
    top: -18,
    width: 96,
  },
  previewGlyph: {
    color: ihubColors.surface,
    fontSize: 50,
    fontWeight: "900",
    left: 0,
    position: "absolute",
    right: 0,
    textAlign: "center",
    textShadowColor: "rgba(58,50,74,0.18)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    top: 88,
  },
  previewTop: {
    flexDirection: "row",
    gap: 6,
    left: 9,
    position: "absolute",
    right: 9,
    top: 9,
  },
  previewTitlePlate: {
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: 8,
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  previewTitleText: {
    color: ihubColors.ink,
    fontSize: 11,
    fontWeight: "900",
  },
  previewBadge: {
    backgroundColor: ihubColors.lavender,
    borderRadius: 8,
    maxWidth: 78,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  previewBadgeWarn: {
    backgroundColor: ihubColors.warn,
  },
  previewBadgeText: {
    color: ihubColors.surface,
    fontSize: 10,
    fontWeight: "900",
  },
  previewBottom: {
    alignItems: "flex-end",
    backgroundColor: "rgba(255,255,255,0.93)",
    bottom: 0,
    flexDirection: "row",
    gap: 8,
    left: 0,
    paddingHorizontal: 10,
    paddingBottom: 9,
    paddingTop: 18,
    position: "absolute",
    right: 0,
  },
  previewBottomText: {
    color: ihubColors.ink,
    flex: 1,
    fontSize: 12,
    fontWeight: "900",
  },
  quantityPill: {
    backgroundColor: ihubColors.lavender,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  quantityPillText: {
    color: ihubColors.surface,
    fontSize: 11,
    fontWeight: "900",
  },
  form: {
    gap: 14,
  },
  formReadonly: {
    gap: 14,
    opacity: 0.82,
  },
  fieldBlock: {
    gap: 7,
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
    gap: 13,
    padding: 13,
  },
  fieldLabel: {
    color: ihubColors.ink,
    fontSize: 12,
    fontWeight: "900",
  },
  conditionGrid: {
    flexDirection: "row",
    gap: 6,
  },
  conditionButton: {
    alignItems: "center",
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.10)",
    borderRadius: ihubRadii.md,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 40,
  },
  conditionButtonActive: {
    backgroundColor: "rgba(166,149,216,0.08)",
    borderColor: ihubColors.lavender,
  },
  conditionText: {
    color: ihubColors.ink,
    fontSize: 10.5,
    fontWeight: "800",
  },
  conditionTextActive: {
    color: ihubColors.ink,
    fontWeight: "900",
  },
  stepper: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.10)",
    borderRadius: ihubRadii.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 5,
  },
  stepButton: {
    alignItems: "center",
    backgroundColor: "rgba(166,149,216,0.14)",
    borderRadius: ihubRadii.pill,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  stepButtonText: {
    color: ihubColors.lavender,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 20,
  },
  stepValue: {
    color: ihubColors.ink,
    fontSize: 17,
    fontWeight: "900",
    minWidth: 28,
    textAlign: "center",
  },
  tagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tagChip: {
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.10)",
    borderRadius: ihubRadii.pill,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  tagChipActive: {
    backgroundColor: ihubColors.lavender,
    borderColor: ihubColors.lavender,
  },
  tagChipText: {
    color: ihubColors.ink,
    fontSize: 11,
    fontWeight: "900",
  },
  tagChipTextActive: {
    color: ihubColors.surface,
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
  actions: {
    gap: 10,
    marginTop: 2,
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
});
