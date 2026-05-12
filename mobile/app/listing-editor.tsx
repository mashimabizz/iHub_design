import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
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
import { ihubColors, ihubRadii, ihubShadow } from "../src/theme/tokens";

type ListingMode = "create" | "edit";
type ListingLogic = "すべて" | "1pick";
type ListingStatus = "ACTIVE" | "PAUSED";

export default function ListingEditorScreen() {
  const params = useLocalSearchParams<{
    mode?: ListingMode | ListingMode[];
    status?: ListingStatus | ListingStatus[];
    logic?: ListingLogic | ListingLogic[];
    give?: string | string[];
    want?: string | string[];
  }>();
  const mode = (one(params.mode) as ListingMode | undefined) ?? "create";
  const [status, setStatus] = useState<ListingStatus>(
    (one(params.status) as ListingStatus | undefined) ?? "ACTIVE",
  );
  const [logic, setLogic] = useState<ListingLogic>(
    (one(params.logic) as ListingLogic | undefined) ?? "1pick",
  );
  const [give, setGive] = useState(one(params.give) ?? "");
  const [want, setWant] = useState(one(params.want) ?? "");
  const [note, setNote] = useState("");
  const giveItems = splitItems(give);
  const wantItems = splitItems(want);

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
          <Text style={styles.kicker}>LISTING</Text>
          <Text style={styles.title}>
            {mode === "create" ? "個別募集を作成" : "個別募集を編集"}
          </Text>
        </View>
        <StatusPill
          label={status === "ACTIVE" ? "ACTIVE" : "一時停止"}
          tone={status === "ACTIVE" ? "ok" : "lavender"}
        />
      </View>

      <View style={styles.preview}>
        <View style={styles.previewTop}>
          <Segmented
            value={status}
            options={[
              { value: "ACTIVE", label: "ACTIVE" },
              { value: "PAUSED", label: "一時停止" },
            ]}
            onChange={setStatus}
          />
        </View>
        <View style={styles.tradeLine}>
          <PreviewSide label="譲る" values={giveItems} color={ihubColors.lavender} />
          <View style={styles.cord}>
            <View style={styles.cordLine} />
            <View style={styles.knot}>
              <Text style={styles.knotText}>∿</Text>
            </View>
          </View>
          <PreviewSide label="求める" values={wantItems} color={ihubColors.pink} />
        </View>
      </View>

      <View style={styles.form}>
        <Section label="譲る条件" right={giveItems.length > 0 ? `${giveItems.length}点` : undefined}>
          <Text style={styles.label}>譲る候補</Text>
          <TextInput
            value={give}
            onChangeText={setGive}
            multiline
            placeholder="例: スア 春ver.、ジョンウ ラキドロ"
            placeholderTextColor="rgba(58,50,74,0.35)"
            style={styles.textArea}
            textAlignVertical="top"
          />
        </Section>

        <Section label="求める条件" right={logic}>
          <View style={styles.fieldHeader}>
            <Text style={styles.label}>求めるもの</Text>
            <Segmented
              compact
              value={logic}
              options={[
                { value: "1pick", label: "1pick" },
                { value: "すべて", label: "すべて" },
              ]}
              onChange={setLogic}
            />
          </View>
          <TextInput
            value={want}
            onChangeText={setWant}
            multiline
            placeholder="例: スア ラキドロ、ニンニン 制服"
            placeholderTextColor="rgba(58,50,74,0.35)"
            style={styles.textArea}
            textAlignVertical="top"
          />
        </Section>

        <Section label="メモ">
          <Text style={styles.label}>メモ</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            multiline
            placeholder="メモ"
            placeholderTextColor="rgba(58,50,74,0.35)"
            style={styles.noteArea}
            textAlignVertical="top"
          />
        </Section>
      </View>

      <View style={styles.actions}>
        {mode === "edit" ? (
          <PrimaryButton variant="secondary" onPress={() => router.back()}>
            削除
          </PrimaryButton>
        ) : null}
        <PrimaryButton onPress={() => router.back()}>
          保存して戻る
        </PrimaryButton>
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

function Segmented<T extends string>({
  value,
  options,
  onChange,
  compact,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  compact?: boolean;
}) {
  return (
    <View style={[styles.segmented, compact ? styles.segmentedCompact : null]}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.segment, active ? styles.segmentActive : null]}
          >
            <Text
              style={[
                styles.segmentText,
                active ? styles.segmentTextActive : null,
                compact ? styles.segmentTextCompact : null,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function PreviewSide({
  label,
  values,
  color,
}: {
  label: string;
  values: string[];
  color: string;
}) {
  const display = values.length > 0 ? values.slice(0, 3) : ["?"];
  return (
    <View style={styles.previewSide}>
      <Text style={styles.sideLabel}>{label}</Text>
      <View style={styles.previewBubbles}>
        {display.map((value, index) => (
          <View
            key={`${value}-${index}`}
            style={[
              styles.previewBubble,
              {
                backgroundColor: color,
                marginTop: index === 1 ? -7 : index === 2 ? 5 : 0,
              },
            ]}
          >
            <Text style={styles.previewBubbleText}>{value[0] ?? "?"}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function splitItems(value: string) {
  return value
    .split(/[、,\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
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
  preview: {
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(166,149,216,0.28)",
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    padding: 14,
    ...ihubShadow,
  },
  previewTop: {
    alignItems: "flex-start",
  },
  tradeLine: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: 14,
    minHeight: 160,
  },
  previewSide: {
    alignItems: "center",
    flex: 1,
    gap: 9,
  },
  sideLabel: {
    backgroundColor: "rgba(58,50,74,0.05)",
    borderRadius: ihubRadii.pill,
    color: ihubColors.mutedInk,
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  previewBubbles: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    minHeight: 116,
  },
  previewBubble: {
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.92)",
    borderRadius: 18,
    borderWidth: 2,
    height: 94,
    justifyContent: "center",
    marginHorizontal: -16,
    shadowColor: ihubColors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    width: 70,
  },
  previewBubbleText: {
    color: ihubColors.surface,
    fontSize: 25,
    fontWeight: "900",
  },
  cord: {
    alignItems: "center",
    height: 90,
    justifyContent: "center",
    width: 50,
  },
  cordLine: {
    backgroundColor: "rgba(166,149,216,0.34)",
    height: 2,
    position: "absolute",
    width: 64,
  },
  knot: {
    alignItems: "center",
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(166,149,216,0.42)",
    borderRadius: ihubRadii.pill,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  knotText: {
    color: ihubColors.lavender,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 22,
  },
  form: {
    gap: 14,
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
    gap: 8,
    padding: 13,
  },
  field: {
    gap: 7,
  },
  fieldHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  label: {
    color: ihubColors.ink,
    fontSize: 12,
    fontWeight: "900",
  },
  textArea: {
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.12)",
    borderRadius: ihubRadii.md,
    borderWidth: 1,
    color: ihubColors.ink,
    fontSize: 14,
    fontWeight: "700",
    minHeight: 88,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  noteArea: {
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.12)",
    borderRadius: ihubRadii.md,
    borderWidth: 1,
    color: ihubColors.ink,
    fontSize: 14,
    fontWeight: "700",
    minHeight: 76,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  segmented: {
    backgroundColor: "rgba(58,50,74,0.06)",
    borderRadius: ihubRadii.pill,
    flexDirection: "row",
    gap: 3,
    padding: 3,
  },
  segmentedCompact: {
    flexShrink: 0,
  },
  segment: {
    borderRadius: ihubRadii.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  segmentActive: {
    backgroundColor: ihubColors.surface,
    shadowColor: ihubColors.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 7,
  },
  segmentText: {
    color: ihubColors.mutedInk,
    fontSize: 11.5,
    fontWeight: "900",
  },
  segmentTextCompact: {
    fontSize: 10.5,
  },
  segmentTextActive: {
    color: ihubColors.lavender,
  },
  actions: {
    gap: 10,
  },
});
