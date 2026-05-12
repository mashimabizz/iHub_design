import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { Screen } from "../src/components/Screen";
import { StatusPill } from "../src/components/StatusPill";
import { ihubColors, ihubRadii, ihubShadow } from "../src/theme/tokens";

type Priority = "both" | "oneSide" | "wish";

type MiniCandidate = {
  id: string;
  label: string;
  glyph: string;
  hue: string;
  available: boolean;
};

const GIVE_ITEMS: MiniCandidate[] = [
  { id: "give-1", label: "カリナ 春ver.", glyph: "K", hue: "#f3c5d4", available: true },
  { id: "give-2", label: "ジョンウ ラキドロ", glyph: "J", hue: "#a8d4e6", available: true },
  { id: "give-3", label: "V トレカ", glyph: "V", hue: "#b7dceb", available: false },
];

const RECEIVE_ITEMS: MiniCandidate[] = [
  { id: "receive-1", label: "選択した譲", glyph: "S", hue: "#cbbcf4", available: true },
  { id: "receive-2", label: "同条件候補", glyph: "N", hue: "#d5cff4", available: true },
  { id: "receive-3", label: "条件外候補", glyph: "W", hue: "#c8e8f2", available: false },
];

export default function MatchDetailScreen() {
  const params = useLocalSearchParams<{
    title?: string | string[];
    subtitle?: string | string[];
    member?: string | string[];
    hue?: string | string[];
    priority?: Priority | Priority[];
    local?: string | string[];
  }>();
  const [showUnavailable, setShowUnavailable] = useState(false);
  const title = one(params.title) || "マッチ候補";
  const subtitle = one(params.subtitle) || "選んだグッズから交換候補を確認します。";
  const member = one(params.member) || title.slice(0, 1);
  const hue = one(params.hue) || "#cbbcf4";
  const priority = ((one(params.priority) as Priority | "") || "wish") as Priority;
  const local = one(params.local) === "true";

  const giveVisible = GIVE_ITEMS.filter((item) => item.available || showUnavailable);
  const receiveVisible = RECEIVE_ITEMS.map((item, index) =>
    index === 0 ? { ...item, label: title, glyph: member, hue } : item,
  ).filter((item) => item.available || showUnavailable);

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
        <StatusPill label={priorityLabel(priority)} tone={priorityTone(priority)} />
      </View>

      <View style={styles.hero}>
        {local ? <View style={styles.liveAura} /> : null}
        <View style={[styles.selectedTile, priorityFrame(priority)]}>
          <View style={[styles.selectedImage, { backgroundColor: hue }]}>
            <View style={styles.selectedGlow} />
            <Text style={styles.selectedGlyph}>{member}</Text>
          </View>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {local ? (
          <View style={styles.localBadge}>
            <Text style={styles.localBadgeText}>現地交換できる可能性あり</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.diagram}>
        <CandidateColumn title="相手の譲" items={receiveVisible} selectedId="receive-1" />
        <View style={styles.linkColumn}>
          <View style={styles.linkDot} />
          <View style={styles.linkLine} />
          <Text style={styles.linkText}>結ばれる候補</Text>
          <View style={styles.linkLine} />
          <View style={styles.linkDotAlt} />
        </View>
        <CandidateColumn title="私が出す" items={giveVisible} />
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => setShowUnavailable((current) => !current)}
        style={styles.unavailableButton}
      >
        <Text style={styles.unavailablePlus}>
          {showUnavailable ? "−" : "+"}
        </Text>
        <Text style={styles.unavailableText}>
          交換できなさそうな候補を{showUnavailable ? "隠す" : "見る"}
        </Text>
      </Pressable>

      <PrimaryButton onPress={() => router.push("/preview-detail")}>
        提示物の選択へ進む
      </PrimaryButton>
    </Screen>
  );
}

function CandidateColumn({
  title,
  items,
  selectedId,
}: {
  title: string;
  items: MiniCandidate[];
  selectedId?: string;
}) {
  return (
    <View style={styles.candidateColumn}>
      <Text style={styles.columnTitle}>{title}</Text>
      <View style={styles.candidateList}>
        {items.map((item) => (
          <View
            key={item.id}
            style={[
              styles.smallItem,
              !item.available ? styles.smallItemDisabled : null,
              selectedId === item.id ? styles.smallItemSelected : null,
            ]}
          >
            <View style={[styles.smallImage, { backgroundColor: item.hue }]}>
              <Text style={styles.smallGlyph}>{item.glyph}</Text>
            </View>
            <Text numberOfLines={1} style={styles.smallLabel}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function one(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function priorityLabel(priority: Priority) {
  if (priority === "both") return "双方条件";
  if (priority === "oneSide") return "一方条件";
  return "Wish一致";
}

function priorityTone(priority: Priority) {
  if (priority === "both") return "lavender" as const;
  if (priority === "oneSide") return "sky" as const;
  return "pink" as const;
}

function priorityFrame(priority: Priority) {
  if (priority === "both") {
    return {
      borderColor: "rgba(166,149,216,0.72)",
      shadowColor: ihubColors.lavender,
      shadowOpacity: 0.32,
      shadowRadius: 22,
    };
  }

  if (priority === "oneSide") {
    return {
      borderColor: "rgba(168,212,230,0.76)",
      shadowColor: ihubColors.sky,
      shadowOpacity: 0.24,
      shadowRadius: 18,
    };
  }

  return {
    borderColor: "rgba(58,50,74,0.12)",
    shadowColor: ihubColors.ink,
    shadowOpacity: 0.10,
    shadowRadius: 14,
  };
}

const styles = StyleSheet.create({
  screen: {
    gap: 15,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
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
  hero: {
    alignItems: "center",
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.08)",
    borderRadius: 28,
    borderWidth: 1,
    overflow: "hidden",
    padding: 18,
    ...ihubShadow,
  },
  liveAura: {
    backgroundColor: "rgba(166,149,216,0.18)",
    borderRadius: 999,
    height: 210,
    position: "absolute",
    top: -74,
    width: 210,
  },
  selectedTile: {
    backgroundColor: ihubColors.surface,
    borderRadius: 24,
    borderWidth: 2,
    padding: 7,
    shadowOffset: { width: 0, height: 14 },
  },
  selectedImage: {
    alignItems: "center",
    borderRadius: 19,
    height: 118,
    justifyContent: "center",
    overflow: "hidden",
    width: 104,
  },
  selectedGlow: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 999,
    height: 82,
    position: "absolute",
    right: -18,
    top: -14,
    width: 82,
  },
  selectedGlyph: {
    color: ihubColors.surface,
    fontSize: 44,
    fontWeight: "900",
  },
  title: {
    color: ihubColors.ink,
    fontSize: 23,
    fontWeight: "900",
    marginTop: 14,
    textAlign: "center",
  },
  subtitle: {
    color: ihubColors.mutedInk,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
    marginTop: 5,
    textAlign: "center",
  },
  localBadge: {
    backgroundColor: "rgba(166,149,216,0.14)",
    borderRadius: ihubRadii.pill,
    marginTop: 10,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  localBadgeText: {
    color: ihubColors.lavender,
    fontSize: 11,
    fontWeight: "900",
  },
  diagram: {
    alignItems: "stretch",
    flexDirection: "row",
    gap: 8,
  },
  candidateColumn: {
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.08)",
    borderRadius: ihubRadii.lg,
    borderWidth: 1,
    flex: 1,
    padding: 10,
  },
  columnTitle: {
    color: ihubColors.ink,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 8,
  },
  candidateList: {
    gap: 8,
  },
  smallItem: {
    backgroundColor: "rgba(58,50,74,0.035)",
    borderColor: "rgba(58,50,74,0.08)",
    borderRadius: 14,
    borderWidth: 1,
    padding: 7,
  },
  smallItemSelected: {
    backgroundColor: "rgba(166,149,216,0.12)",
    borderColor: "rgba(166,149,216,0.54)",
  },
  smallItemDisabled: {
    opacity: 0.42,
  },
  smallImage: {
    alignItems: "center",
    borderRadius: 11,
    height: 54,
    justifyContent: "center",
  },
  smallGlyph: {
    color: ihubColors.surface,
    fontSize: 19,
    fontWeight: "900",
  },
  smallLabel: {
    color: ihubColors.ink,
    fontSize: 10,
    fontWeight: "900",
    marginTop: 5,
  },
  linkColumn: {
    alignItems: "center",
    justifyContent: "center",
    width: 54,
  },
  linkDot: {
    backgroundColor: ihubColors.pink,
    borderRadius: 999,
    height: 12,
    width: 12,
  },
  linkDotAlt: {
    backgroundColor: ihubColors.sky,
    borderRadius: 999,
    height: 12,
    width: 12,
  },
  linkLine: {
    backgroundColor: "rgba(166,149,216,0.36)",
    flex: 1,
    width: 2,
  },
  linkText: {
    color: ihubColors.lavender,
    fontSize: 9,
    fontWeight: "900",
    paddingVertical: 8,
    textAlign: "center",
  },
  unavailableButton: {
    alignItems: "center",
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.08)",
    borderRadius: ihubRadii.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    padding: 13,
  },
  unavailablePlus: {
    color: ihubColors.lavender,
    fontSize: 19,
    fontWeight: "900",
    lineHeight: 21,
  },
  unavailableText: {
    color: ihubColors.ink,
    fontSize: 13,
    fontWeight: "900",
  },
});
