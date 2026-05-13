import { useEffect, useMemo, useRef, useState } from "react";
import { router } from "expo-router";
import {
  Animated,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Screen } from "../../src/components/Screen";
import { useAuth } from "../../src/auth/AuthProvider";
import { IconSymbol, type IconSymbolName } from "../../src/components/IconSymbol";
import { hasSupabaseConfig, supabase } from "../../src/lib/supabase";
import {
  MATCH_SECTIONS,
  buildMatchDetailParams,
  type Candidate,
  type CandidatePriority,
  type ShelfRow,
  type ShelfSection,
} from "../../src/data/homeMatches";
import { fetchHomeSupabaseSections } from "../../src/data/homeSupabase";
import { ihubColors, ihubRadii, ihubShadow } from "../../src/theme/tokens";

export default function HomeScreen() {
  const { previewMode, user } = useAuth();
  const [localMode, setLocalMode] = useState(true);
  const [sections, setSections] = useState<ShelfSection[]>(MATCH_SECTIONS);
  const [placeName, setPlaceName] = useState("守口市地区 豊秀町一丁目");
  const [unreadCount, setUnreadCount] = useState(0);
  const [homeLoading, setHomeLoading] = useState(false);
  const [homeError, setHomeError] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const tileWidth = Math.max(128, Math.min(148, (width - 54) / 2.55));
  const placeLabel = localMode
    ? truncateLocation(placeName || "場所未設定")
    : "現地交換OFF";

  useEffect(() => {
    if (!hasSupabaseConfig || !user) {
      setSections(MATCH_SECTIONS);
      setPlaceName("守口市地区 豊秀町一丁目");
      setUnreadCount(0);
      setHomeError(null);
      return;
    }

    let active = true;
    setHomeLoading(true);
    setHomeError(null);
    fetchHomeSupabaseSections(user.id)
      .then((result) => {
        if (!active) return;
        setSections(result.sections.length > 0 ? result.sections : []);
        setLocalMode(result.localModeEnabled);
        setPlaceName(result.placeLabel ?? "場所未設定");
        setUnreadCount(result.unreadNotificationCount);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setSections(MATCH_SECTIONS);
        setHomeError(error instanceof Error ? error.message : "読み込みに失敗しました");
      })
      .finally(() => {
        if (active) setHomeLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  function handleLocalModeChange(next: boolean) {
    setLocalMode(next);
    if (!supabase || !user) return;
    supabase
      .from("user_local_mode_settings")
      .update({ enabled: next })
      .eq("user_id", user.id)
      .then(({ error }) => {
        if (error) setHomeError(error.message);
      });
  }

  return (
    <Screen scroll={false} contentStyle={styles.screenContent}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.homeScroll}
        contentContainerStyle={styles.homeScrollContent}
      >
        <View style={styles.topBar}>
          <View style={styles.topLeft}>
            <CircleIconButton
              icon="notifications-outline"
              accessibilityLabel="通知"
              badge={unreadCount > 0 ? String(Math.min(unreadCount, 9)) : undefined}
              onPress={() => router.push("/notifications")}
            />
          </View>
          <View style={styles.topRight}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/schedules")}
              style={styles.placeButton}
            >
              <Text numberOfLines={1} style={styles.placeText}>
                {placeLabel}
              </Text>
            </Pressable>
            <TinyLocalToggle
              value={localMode}
              onChange={() => handleLocalModeChange(!localMode)}
            />
          </View>
        </View>

        <ModeSwitch
          localMode={localMode}
          width={width}
          onChange={handleLocalModeChange}
        />

        <View style={styles.sections}>
          {homeError ? <Text style={styles.inlineError}>{homeError}</Text> : null}
          {homeLoading ? <Text style={styles.loadingText}>マッチを読み込み中…</Text> : null}
          {sections.length > 0 ? (
            sections.map((section, sectionIndex) => (
              <ShelfSectionView
                key={section.id}
                section={section}
                sectionIndex={sectionIndex}
                tileWidth={tileWidth}
                localMode={localMode}
                onCandidatePress={openMatchDetail}
              />
            ))
          ) : (
            <View style={styles.emptyMatches}>
              <Text style={styles.emptyMatchesTitle}>まだ候補がありません</Text>
              <Text style={styles.emptyMatchesText}>
                Wish と譲る候補が増えると、ここに交換候補が並びます。
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
      <FloatingSearchButton />
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

function CircleIconButton({
  icon,
  accessibilityLabel,
  badge,
  onPress,
}: {
  icon: IconSymbolName;
  accessibilityLabel: string;
  badge?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.circleButton}
    >
      <IconSymbol name={icon} size={20} color={ihubColors.ink} />
      {badge ? (
        <View style={styles.notificationBadge}>
          <Text style={styles.notificationBadgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function FloatingSearchButton() {
  return (
    <Pressable
      accessibilityLabel="検索"
      accessibilityRole="button"
      onPress={() => router.push("/search")}
      style={styles.floatingSearchButton}
    >
      <IconSymbol name="search" size={24} color={ihubColors.ink} />
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
          {candidate.photoUrl ? (
            <Image source={{ uri: candidate.photoUrl }} style={styles.realImage} />
          ) : (
            <>
              <View style={styles.fakeImageGlow} />
              <Text style={styles.fakeImageLetter}>{candidate.member}</Text>
            </>
          )}
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
    params: buildMatchDetailParams(row, candidate),
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
    flex: 1,
    paddingHorizontal: 18,
  },
  homeScroll: {
    flex: 1,
    marginHorizontal: -18,
  },
  homeScrollContent: {
    paddingBottom: 24,
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
  notificationBadge: {
    alignItems: "center",
    backgroundColor: ihubColors.pink,
    borderColor: ihubColors.surface,
    borderRadius: 999,
    borderWidth: 1,
    height: 17,
    justifyContent: "center",
    minWidth: 17,
    paddingHorizontal: 4,
    position: "absolute",
    right: -2,
    top: -2,
  },
  notificationBadgeText: {
    color: ihubColors.surface,
    fontSize: 9,
    fontWeight: "900",
    lineHeight: 11,
  },
  floatingSearchButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.90)",
    borderColor: "rgba(255,255,255,0.86)",
    borderRadius: 999,
    borderWidth: 1,
    bottom: 104,
    height: 54,
    justifyContent: "center",
    left: 18,
    position: "absolute",
    shadowColor: ihubColors.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    width: 54,
    zIndex: 20,
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
  inlineError: {
    color: ihubColors.warn,
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 16,
  },
  loadingText: {
    color: ihubColors.mutedInk,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
  },
  emptyMatches: {
    backgroundColor: "rgba(255,255,255,0.86)",
    borderColor: "rgba(58,50,74,0.08)",
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 22,
  },
  emptyMatchesTitle: {
    color: ihubColors.ink,
    fontSize: 15,
    fontWeight: "900",
  },
  emptyMatchesText: {
    color: ihubColors.mutedInk,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 6,
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
  realImage: {
    height: "100%",
    width: "100%",
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
