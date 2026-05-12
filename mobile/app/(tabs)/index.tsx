import { useEffect, useMemo, useRef, useState } from "react";
import { router } from "expo-router";
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { IHubLogo } from "../../src/components/IHubLogo";
import { Screen } from "../../src/components/Screen";
import { StatusPill } from "../../src/components/StatusPill";
import { useAuth } from "../../src/auth/AuthProvider";
import { hasSupabaseConfig } from "../../src/lib/supabase";
import { ihubColors, ihubRadii, ihubShadow } from "../../src/theme/tokens";

type CandidatePriority = "both" | "oneSide" | "wish";

type Candidate = {
  id: string;
  label: string;
  member: string;
  type: string;
  hue: string;
  tag?: string;
  local: boolean;
  priority: CandidatePriority;
};

type ShelfRow = {
  id: string;
  character: string;
  goodsType: string;
  candidates: Candidate[];
};

type ShelfSection = {
  id: string;
  title: string;
  rows: ShelfRow[];
};

const MATCH_SECTIONS: ShelfSection[] = [
  {
    id: "listing",
    title: "マッチしてるよ！",
    rows: [
      {
        id: "sua-card",
        character: "スア",
        goodsType: "トレカ",
        candidates: [
          {
            id: "sua-card-01",
            label: "スア 春ver.",
            member: "S",
            type: "トレカ",
            hue: "#cbbcf4",
            tag: "双方条件",
            local: true,
            priority: "both",
          },
          {
            id: "sua-card-02",
            label: "スア ラキドロ",
            member: "S",
            type: "トレカ",
            hue: "#a8d4e6",
            tag: "タグ一致",
            local: false,
            priority: "both",
          },
          {
            id: "sua-card-03",
            label: "スア 会場限定",
            member: "S",
            type: "トレカ",
            hue: "#f3c5d4",
            tag: "相手条件",
            local: true,
            priority: "oneSide",
          },
          {
            id: "sua-card-04",
            label: "スア 通常盤",
            member: "S",
            type: "トレカ",
            hue: "#d9eef5",
            tag: "候補",
            local: false,
            priority: "oneSide",
          },
        ],
      },
      {
        id: "nin-acrylic",
        character: "ニンニン",
        goodsType: "アクスタ",
        candidates: [
          {
            id: "nin-acrylic-01",
            label: "ニンニン アクスタ",
            member: "N",
            type: "アクスタ",
            hue: "#bcd8fa",
            tag: "自分条件",
            local: false,
            priority: "oneSide",
          },
          {
            id: "nin-acrylic-02",
            label: "ニンニン 制服",
            member: "N",
            type: "アクスタ",
            hue: "#f7d5df",
            tag: "現地OK",
            local: true,
            priority: "oneSide",
          },
          {
            id: "nin-acrylic-03",
            label: "ニンニン ライブ",
            member: "N",
            type: "アクスタ",
            hue: "#d5cff4",
            tag: "タグ一致",
            local: false,
            priority: "oneSide",
          },
        ],
      },
    ],
  },
  {
    id: "possible",
    title: "交換できるかも",
    rows: [
      {
        id: "karina-card",
        character: "カリナ",
        goodsType: "トレカ",
        candidates: [
          {
            id: "karina-card-01",
            label: "カリナ トレカ",
            member: "K",
            type: "トレカ",
            hue: "#c8e8f2",
            tag: "wish一致",
            local: false,
            priority: "wish",
          },
          {
            id: "karina-card-02",
            label: "カリナ 初回盤",
            member: "K",
            type: "トレカ",
            hue: "#f2c6d7",
            tag: "現地OK",
            local: true,
            priority: "wish",
          },
          {
            id: "karina-card-03",
            label: "カリナ 店舗特典",
            member: "K",
            type: "トレカ",
            hue: "#cabcf1",
            tag: "衣装",
            local: false,
            priority: "wish",
          },
          {
            id: "karina-card-04",
            label: "カリナ ラントレ",
            member: "K",
            type: "トレカ",
            hue: "#b7dceb",
            tag: "候補",
            local: false,
            priority: "wish",
          },
        ],
      },
      {
        id: "winter-badge",
        character: "ウィンター",
        goodsType: "缶バッジ",
        candidates: [
          {
            id: "winter-badge-01",
            label: "ウィンター 缶バッジ",
            member: "W",
            type: "缶バッジ",
            hue: "#d8cef6",
            tag: "wish一致",
            local: false,
            priority: "wish",
          },
          {
            id: "winter-badge-02",
            label: "ウィンター 会場",
            member: "W",
            type: "缶バッジ",
            hue: "#acd8e7",
            tag: "近い",
            local: true,
            priority: "wish",
          },
          {
            id: "winter-badge-03",
            label: "ウィンター 通常",
            member: "W",
            type: "缶バッジ",
            hue: "#f3c9d6",
            tag: "候補",
            local: false,
            priority: "wish",
          },
        ],
      },
    ],
  },
];

export default function HomeScreen() {
  const { previewMode, user } = useAuth();
  const [localMode, setLocalMode] = useState(true);
  const { width } = useWindowDimensions();
  const tileWidth = Math.max(128, Math.min(148, (width - 54) / 2.55));
  const placeLabel = localMode
    ? truncateLocation("守口市地区 豊秀町一丁目")
    : "現地交換OFF";

  const statusLabel = hasSupabaseConfig && user
    ? "ログイン中"
    : previewMode
      ? "プレビュー中"
      : hasSupabaseConfig
        ? "Supabase接続可"
        : "環境変数待ち";

  return (
    <Screen contentStyle={styles.screenContent}>
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <CircleButton label="⌕" accessibilityLabel="検索" />
          <CircleButton label="!" accessibilityLabel="通知" />
        </View>
        <View style={styles.topRight}>
          <Pressable style={styles.placeButton}>
            <Text numberOfLines={1} style={styles.placeText}>
              {placeLabel}
            </Text>
          </Pressable>
          <TinyLocalToggle
            value={localMode}
            onChange={() => setLocalMode((current) => !current)}
          />
        </View>
      </View>

      <View style={styles.identityRow}>
        <IHubLogo />
        <View style={styles.identityText}>
          <Text style={styles.kicker}>推し活グッズ交換</Text>
          <Text style={styles.title}>iHub</Text>
        </View>
        <StatusPill
          label={statusLabel}
          tone={hasSupabaseConfig ? "ok" : previewMode ? "pink" : "lavender"}
        />
      </View>

      <ModeSwitch
        localMode={localMode}
        width={width}
        onChange={setLocalMode}
      />

      <View style={styles.sections}>
        {MATCH_SECTIONS.map((section, sectionIndex) => (
          <ShelfSectionView
            key={section.id}
            section={section}
            sectionIndex={sectionIndex}
            tileWidth={tileWidth}
            localMode={localMode}
            onCandidatePress={openMatchDetail}
          />
        ))}
      </View>
    </Screen>
  );
}

function TinyLocalToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: () => void;
}) {
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: value ? 1 : 0,
      damping: 16,
      stiffness: 210,
      mass: 0.74,
      useNativeDriver: true,
    }).start();
  }, [progress, value]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20],
  });

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={onChange}
      style={[
        styles.localToggle,
        value ? styles.localToggleOn : styles.localToggleOff,
      ]}
    >
      <Animated.View
        style={[
          styles.localToggleKnob,
          {
            transform: [{ translateX }],
          },
        ]}
      />
    </Pressable>
  );
}

function ModeSwitch({
  localMode,
  width,
  onChange,
}: {
  localMode: boolean;
  width: number;
  onChange: (next: boolean) => void;
}) {
  const progress = useRef(new Animated.Value(localMode ? 1 : 0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const switchWidth = Math.max(280, width - 36);
  const thumbWidth = (switchWidth - 8) / 2;

  useEffect(() => {
    pulse.setValue(0);
    Animated.parallel([
      Animated.spring(progress, {
        toValue: localMode ? 1 : 0,
        damping: 19,
        stiffness: 176,
        mass: 0.76,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 170,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 260,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [localMode, progress, pulse]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, thumbWidth],
  });
  const stretch = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.09],
  });
  const glossOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.26, 0.64],
  });
  const blobScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.86, 1.18],
  });

  return (
    <View style={styles.modeSwitch}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.modeThumb,
          {
            width: thumbWidth,
            transform: [{ translateX }, { scaleX: stretch }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.modeThumbGloss,
            {
              opacity: glossOpacity,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.modeThumbBlob,
            styles.modeThumbBlobLeft,
            {
              opacity: glossOpacity,
              transform: [{ scale: blobScale }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.modeThumbBlob,
            styles.modeThumbBlobRight,
            {
              opacity: glossOpacity,
              transform: [{ scale: blobScale }],
            },
          ]}
        />
      </Animated.View>
      <Pressable
        style={styles.modeButton}
        onPress={() => onChange(false)}
      >
        <Text
          style={[
            styles.modeText,
            !localMode ? styles.modeTextActive : styles.modeTextInactive,
          ]}
        >
          全国交換モード
        </Text>
      </Pressable>
      <Pressable style={styles.modeButton} onPress={() => onChange(true)}>
        <Text
          style={[
            styles.modeText,
            localMode ? styles.modeTextActive : styles.modeTextInactive,
          ]}
        >
          今すぐ現地交換
        </Text>
      </Pressable>
    </View>
  );
}

function CircleButton({
  label,
  accessibilityLabel,
}: {
  label: string;
  accessibilityLabel: string;
}) {
  return (
    <Pressable accessibilityLabel={accessibilityLabel} style={styles.circleButton}>
      <Text style={styles.circleButtonText}>{label}</Text>
    </Pressable>
  );
}

function ShelfSectionView({
  section,
  sectionIndex,
  tileWidth,
  localMode,
  onCandidatePress,
}: {
  section: ShelfSection;
  sectionIndex: number;
  tileWidth: number;
  localMode: boolean;
  onCandidatePress: (row: ShelfRow, candidate: Candidate) => void;
}) {
  return (
    <View style={styles.shelfSection}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      {section.rows.map((row, rowIndex) => (
        <ShelfRowView
          key={row.id}
          row={row}
          rowIndex={rowIndex}
          sectionIndex={sectionIndex}
          tileWidth={tileWidth}
          localMode={localMode}
          onCandidatePress={onCandidatePress}
        />
      ))}
    </View>
  );
}

function ShelfRowView({
  row,
  rowIndex,
  sectionIndex,
  tileWidth,
  localMode,
  onCandidatePress,
}: {
  row: ShelfRow;
  rowIndex: number;
  sectionIndex: number;
  tileWidth: number;
  localMode: boolean;
  onCandidatePress: (row: ShelfRow, candidate: Candidate) => void;
}) {
  const baseDelay = sectionIndex * 190 + rowIndex * 95;

  return (
    <View style={styles.shelfRow}>
      <View style={styles.rowTitleLine}>
        <Text numberOfLines={1} style={styles.rowCharacter}>
          {row.character}
        </Text>
        <Text style={styles.rowGoods}>× {row.goodsType}</Text>
      </View>
      <ScrollView
        horizontal
        alwaysBounceHorizontal
        bounces
        decelerationRate="normal"
        showsHorizontalScrollIndicator={false}
        directionalLockEnabled
        scrollEventThrottle={16}
        contentContainerStyle={styles.rowScroller}
      >
        {row.candidates.map((candidate, index) => (
          <AnimatedCandidateTile
            key={candidate.id}
            candidate={candidate}
            delayMs={baseDelay + index * 82}
            width={tileWidth}
            localMode={localMode}
            onPress={() => onCandidatePress(row, candidate)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function AnimatedCandidateTile({
  candidate,
  delayMs,
  width,
  localMode,
  onPress,
}: {
  candidate: Candidate;
  delayMs: number;
  width: number;
  localMode: boolean;
  onPress: () => void;
}) {
  const appear = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(appear, {
        toValue: 1,
        duration: 520,
        useNativeDriver: true,
      }).start();
    }, delayMs);

    return () => clearTimeout(timer);
  }, [appear, delayMs]);

  const translateX = appear.interpolate({
    inputRange: [0, 1],
    outputRange: [52, 0],
  });

  return (
    <Animated.View
      style={{
        opacity: appear,
        transform: [{ translateX }],
      }}
    >
      <CandidateTile
        candidate={candidate}
        width={width}
        localMode={localMode}
        onPress={onPress}
      />
    </Animated.View>
  );
}

function CandidateTile({
  candidate,
  width,
  localMode,
  onPress,
}: {
  candidate: Candidate;
  width: number;
  localMode: boolean;
  onPress: () => void;
}) {
  const showLocal = localMode && candidate.local;
  const frameStyle = useMemo(
    () => getPriorityFrameStyle(candidate.priority),
    [candidate.priority],
  );

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.tileHitArea,
        showLocal ? styles.tileHitAreaLocal : null,
        { width },
      ]}
    >
      {showLocal ? <LocalAura /> : null}
      <View style={[styles.tileCard, frameStyle, { width, height: width * 1.16 }]}>
        <View
          style={[
            styles.fakeImage,
            {
              backgroundColor: candidate.hue,
            },
          ]}
        >
          <View style={styles.fakeImageGlow} />
          <Text style={styles.fakeImageLetter}>{candidate.member}</Text>
          <Text numberOfLines={1} style={styles.fakeImageCaption}>
            {candidate.type}
          </Text>
        </View>
        {showLocal ? (
          <View style={styles.liveBadge}>
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
        ) : null}
        {candidate.tag ? (
          <View style={styles.tagOverlay}>
            <Text numberOfLines={1} style={styles.tagText}>
              {truncateTag(candidate.tag)}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function openMatchDetail(row: ShelfRow, candidate: Candidate) {
  router.push({
    pathname: "/match-detail",
    params: {
      title: candidate.label,
      subtitle: `${row.character} × ${row.goodsType} / ${candidate.tag ?? "候補"}`,
      member: candidate.member,
      hue: candidate.hue,
      priority: candidate.priority,
      local: candidate.local ? "true" : "false",
      tag: candidate.tag ?? "",
    },
  });
}

function LocalAura() {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();

    return () => animation.stop();
  }, [pulse]);

  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.04],
  });
  const opacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 0.72],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.localAura,
        {
          opacity,
          transform: [{ scale }],
        },
      ]}
    />
  );
}

function truncateLocation(value: string) {
  const chars = Array.from(value.replace(/\s+/g, ""));
  return chars.length > 8 ? `${chars.slice(0, 8).join("")}…` : value;
}

function truncateTag(value: string) {
  const chars = Array.from(value);
  return chars.length > 8 ? `${chars.slice(0, 8).join("")}...` : value;
}

function getPriorityFrameStyle(priority: CandidatePriority) {
  if (priority === "both") {
    return {
      borderColor: "rgba(166,149,216,0.72)",
      borderWidth: 2,
      shadowColor: ihubColors.lavender,
      shadowOpacity: 0.22,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    };
  }

  if (priority === "oneSide") {
    return {
      borderColor: "rgba(168,212,230,0.78)",
      borderWidth: 1.5,
      shadowColor: ihubColors.sky,
      shadowOpacity: 0.18,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 7 },
      elevation: 3,
    };
  }

  return {
    borderColor: "rgba(58,50,74,0.10)",
    borderWidth: 1,
    shadowColor: ihubColors.ink,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 4, height: 8 },
    elevation: 2,
  };
}

const styles = StyleSheet.create({
  screenContent: {
    paddingHorizontal: 18,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  topLeft: {
    flexDirection: "row",
    gap: 9,
  },
  topRight: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  circleButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.82)",
    borderColor: "rgba(255,255,255,0.78)",
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    shadowColor: ihubColors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    width: 40,
  },
  circleButtonText: {
    color: ihubColors.ink,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 20,
  },
  placeButton: {
    backgroundColor: "rgba(255,255,255,0.86)",
    borderColor: "rgba(58,50,74,0.09)",
    borderRadius: ihubRadii.pill,
    borderWidth: 1,
    maxWidth: 126,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  placeText: {
    color: ihubColors.ink,
    fontSize: 11.5,
    fontWeight: "900",
  },
  localToggle: {
    borderRadius: ihubRadii.pill,
    height: 28,
    justifyContent: "center",
    paddingHorizontal: 3,
    width: 48,
  },
  localToggleOn: {
    backgroundColor: "rgba(166,149,216,0.95)",
  },
  localToggleOff: {
    backgroundColor: "rgba(58,50,74,0.16)",
  },
  localToggleKnob: {
    backgroundColor: ihubColors.surface,
    borderRadius: 11,
    height: 22,
    shadowColor: ihubColors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    width: 22,
  },
  identityRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  identityText: {
    flex: 1,
  },
  kicker: {
    color: ihubColors.lavender,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  title: {
    color: ihubColors.ink,
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 29,
  },
  modeSwitch: {
    backgroundColor: "rgba(58,50,74,0.05)",
    borderColor: "rgba(255,255,255,0.78)",
    borderRadius: ihubRadii.pill,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 11,
    overflow: "hidden",
    padding: 4,
    position: "relative",
  },
  modeThumb: {
    backgroundColor: ihubColors.surface,
    borderRadius: ihubRadii.pill,
    bottom: 4,
    left: 4,
    overflow: "hidden",
    position: "absolute",
    top: 4,
    ...ihubShadow,
  },
  modeThumbGloss: {
    backgroundColor: "rgba(255,255,255,0.62)",
    borderRadius: 999,
    height: "72%",
    left: 8,
    position: "absolute",
    right: 8,
    top: 3,
  },
  modeThumbBlob: {
    backgroundColor: "rgba(166,149,216,0.22)",
    borderRadius: 999,
    height: 52,
    position: "absolute",
    top: -10,
    width: 52,
  },
  modeThumbBlobLeft: {
    left: -16,
  },
  modeThumbBlobRight: {
    right: -16,
  },
  modeButton: {
    alignItems: "center",
    flex: 1,
    paddingVertical: 9,
    zIndex: 1,
  },
  modeText: {
    fontSize: 12,
    fontWeight: "900",
  },
  modeTextActive: {
    color: ihubColors.ink,
  },
  modeTextInactive: {
    color: "rgba(58,50,74,0.55)",
  },
  sections: {
    gap: 20,
    marginTop: 16,
  },
  shelfSection: {
    gap: 10,
  },
  sectionTitle: {
    color: "#111111",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 29,
  },
  shelfRow: {
    gap: 4,
  },
  rowTitleLine: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 1,
  },
  rowCharacter: {
    color: ihubColors.ink,
    fontSize: 13,
    fontWeight: "900",
    maxWidth: 180,
  },
  rowGoods: {
    color: "rgba(58,50,74,0.45)",
    fontSize: 10.5,
    fontWeight: "900",
  },
  rowScroller: {
    gap: 12,
    paddingBottom: 15,
    paddingTop: 9,
  },
  tileHitArea: {
    borderRadius: 18,
    padding: 2,
  },
  tileHitAreaLocal: {
    overflow: "visible",
  },
  tileCard: {
    backgroundColor: ihubColors.surface,
    borderRadius: 16,
    overflow: "hidden",
  },
  fakeImage: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  fakeImageGlow: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 999,
    height: 92,
    position: "absolute",
    right: -18,
    top: -20,
    width: 92,
  },
  fakeImageLetter: {
    color: ihubColors.surface,
    fontSize: 48,
    fontWeight: "900",
    textShadowColor: "rgba(58,50,74,0.16)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 7,
  },
  fakeImageCaption: {
    bottom: 12,
    color: "rgba(255,255,255,0.92)",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.3,
    position: "absolute",
  },
  tagOverlay: {
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: ihubRadii.pill,
    bottom: 8,
    maxWidth: "82%",
    paddingHorizontal: 9,
    paddingVertical: 4,
    position: "absolute",
    shadowColor: ihubColors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 7,
  },
  tagText: {
    color: ihubColors.ink,
    fontSize: 9,
    fontWeight: "900",
  },
  liveBadge: {
    backgroundColor: ihubColors.lavender,
    borderRadius: ihubRadii.pill,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    position: "absolute",
    top: 8,
  },
  liveBadgeText: {
    color: ihubColors.surface,
    fontSize: 9,
    fontWeight: "900",
  },
  localAura: {
    backgroundColor: "rgba(166,149,216,0.16)",
    borderColor: "rgba(166,149,216,0.52)",
    borderRadius: 22,
    borderWidth: 1,
    bottom: -5,
    left: -5,
    position: "absolute",
    right: -5,
    shadowColor: ihubColors.lavender,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.42,
    shadowRadius: 18,
    top: -5,
  },
});
