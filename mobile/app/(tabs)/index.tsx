import { useEffect, useMemo, useRef, useState } from "react";
import { router } from "expo-router";
import {
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
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
import {
  NativeMapPreview,
  type MapCoordinate,
} from "../../src/components/NativeMapPreview";
import { ihubColors, ihubRadii } from "../../src/theme/tokens";

const FALLBACK_LOCAL_CENTER: MapCoordinate = {
  latitude: 35.6595,
  longitude: 139.7005,
};
const LOCAL_DURATION_OPTIONS = [
  { label: "1時間", value: 60 },
  { label: "2時間", value: 120 },
  { label: "3時間", value: 180 },
  { label: "6時間", value: 360 },
];
const LOCAL_RADIUS_OPTIONS = [300, 500, 1000, 2000];
const PREVIEW_CARRYING_ITEMS: LocalCarryingItem[] = [
  {
    id: "preview-carry-1",
    title: "スア 春ver.",
    subtitle: "LUMENA / トレカ",
    photoUrl: null,
    hue: "#cbbcf4",
  },
  {
    id: "preview-carry-2",
    title: "ジョンウ ラキドロ",
    subtitle: "LUMENA / トレカ",
    photoUrl: null,
    hue: "#a8d4e6",
  },
  {
    id: "preview-carry-3",
    title: "ニンニン アクスタ",
    subtitle: "aespa / アクスタ",
    photoUrl: null,
    hue: "#f3c5d4",
  },
];
type HomeModeView = "national" | "local";
type LocalCarryingItem = {
  id: string;
  title: string;
  subtitle: string;
  photoUrl: string | null;
  hue: string;
};

export default function HomeScreen() {
  const { previewMode, user } = useAuth();
  const usePreviewData = previewMode || !hasSupabaseConfig;
  const [localMode, setLocalMode] = useState(usePreviewData);
  const [viewMode, setViewMode] = useState<HomeModeView>(
    usePreviewData ? "local" : "national",
  );
  const viewModeTouchedRef = useRef(usePreviewData);
  const [sections, setSections] = useState<ShelfSection[]>(() =>
    usePreviewData ? MATCH_SECTIONS : [],
  );
  const [placeName, setPlaceName] = useState(
    usePreviewData ? "守口市地区 豊秀町一丁目" : "",
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const [homeLoading, setHomeLoading] = useState(!usePreviewData);
  const [homeError, setHomeError] = useState<string | null>(null);
  const [localSheetOpen, setLocalSheetOpen] = useState(false);
  const [revertLocalOnSheetClose, setRevertLocalOnSheetClose] = useState(false);
  const { width } = useWindowDimensions();
  const tileWidth = Math.max(128, Math.min(148, (width - 54) / 2.55));
  const placeLabel = localMode
    ? truncateLocation(placeName || "場所未設定")
    : "現地交換OFF";
  const visibleSections = useMemo(() => {
    if (viewMode !== "local") return sections;
    return sections
      .map((section) => ({
        ...section,
        rows: section.rows
          .map((row) => ({
            ...row,
            candidates: row.candidates.filter((candidate) => candidate.local),
          }))
          .filter((row) => row.candidates.length > 0),
      }))
      .filter((section) => section.rows.length > 0);
  }, [sections, viewMode]);

  function refreshHomeData() {
    if (previewMode || !hasSupabaseConfig) {
      setSections(MATCH_SECTIONS);
      setLocalMode(usePreviewData);
      if (!viewModeTouchedRef.current) {
        setViewMode(usePreviewData ? "local" : "national");
      }
      setPlaceName("守口市地区 豊秀町一丁目");
      setUnreadCount(0);
      setHomeLoading(false);
      setHomeError(null);
      return () => {};
    }
    if (!user) {
      setSections([]);
      setLocalMode(false);
      setViewMode("national");
      viewModeTouchedRef.current = false;
      setPlaceName("");
      setUnreadCount(0);
      setHomeLoading(false);
      setHomeError(null);
      return () => {};
    }

    let active = true;
    setHomeLoading(true);
    setHomeError(null);
    fetchHomeSupabaseSections(user.id)
      .then((result) => {
        if (!active) return;
        setSections(result.sections.length > 0 ? result.sections : []);
        const nextLocalMode = result.localModeEnabled;
        setLocalMode(nextLocalMode);
        if (!nextLocalMode) {
          setViewMode("national");
          viewModeTouchedRef.current = false;
        } else if (!viewModeTouchedRef.current) {
          setViewMode("local");
        }
        setPlaceName(result.placeLabel ?? "場所未設定");
        setUnreadCount(result.unreadNotificationCount);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setSections([]);
        setHomeError(error instanceof Error ? error.message : "読み込みに失敗しました");
      })
      .finally(() => {
        if (active) setHomeLoading(false);
      });

    return () => {
      active = false;
    };
  }

  useEffect(() => {
    return refreshHomeData();
  }, [previewMode, user]);

  function openLocalModeSheetForEnable() {
    setLocalMode(true);
    setViewMode("local");
    viewModeTouchedRef.current = true;
    setHomeError(null);
    setRevertLocalOnSheetClose(true);
    setLocalSheetOpen(true);
  }

  async function handleLocalEnabledChange(next: boolean) {
    setLocalMode(next);
    setHomeError(null);
    if (next) {
      openLocalModeSheetForEnable();
      return;
    }

    setViewMode("national");
    viewModeTouchedRef.current = false;
    setLocalSheetOpen(false);
    setRevertLocalOnSheetClose(false);
    if (!supabase || !user || usePreviewData) return;
    const { error } = await supabase
      .from("user_local_mode_settings")
      .upsert({ user_id: user.id, enabled: false }, { onConflict: "user_id" });
    if (error) setHomeError(error.message);
  }

  function handleViewModeChange(next: HomeModeView) {
    viewModeTouchedRef.current = true;
    if (next === "national") {
      setViewMode("national");
      return;
    }
    if (localMode) {
      setViewMode("local");
      return;
    }
    openLocalModeSheetForEnable();
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
              onPress={() => {
                if (localMode) {
                  setRevertLocalOnSheetClose(false);
                  setLocalSheetOpen(true);
                } else {
                  handleLocalEnabledChange(true);
                }
              }}
              style={styles.placeButton}
            >
              <Text numberOfLines={1} style={styles.placeText}>
                {placeLabel}
              </Text>
            </Pressable>
            <Switch
              value={localMode}
              onValueChange={handleLocalEnabledChange}
              ios_backgroundColor="rgba(58,50,74,0.14)"
              thumbColor={ihubColors.surface}
              trackColor={{
                false: "rgba(58,50,74,0.14)",
                true: "rgba(166,149,216,0.78)",
              }}
            />
          </View>
        </View>

        <ModeSwitch
          viewMode={viewMode}
          width={width}
          onChange={handleViewModeChange}
        />

        <View style={styles.sections}>
          {homeError ? <Text style={styles.inlineError}>{homeError}</Text> : null}
          {homeLoading ? <Text style={styles.loadingText}>マッチを読み込み中…</Text> : null}
          {visibleSections.length > 0 ? (
            visibleSections.map((section, sectionIndex) => (
              <ShelfSectionView
                key={section.id}
                section={section}
                sectionIndex={sectionIndex}
                tileWidth={tileWidth}
                localMode={viewMode === "local"}
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
      <LocalModeSheet
        open={localSheetOpen}
        previewMode={usePreviewData}
        userId={user?.id ?? null}
        placeName={placeName}
        onClose={() => {
          setLocalSheetOpen(false);
          if (revertLocalOnSheetClose) {
            setRevertLocalOnSheetClose(false);
            handleLocalEnabledChange(false);
          }
        }}
        onApplied={(nextPlace) => {
          setRevertLocalOnSheetClose(false);
          setLocalSheetOpen(false);
          setLocalMode(true);
          setViewMode("local");
          viewModeTouchedRef.current = true;
          setPlaceName(nextPlace);
          refreshHomeData();
        }}
        onError={setHomeError}
      />
    </Screen>
  );
}

function LocalModeSheet({
  open,
  previewMode,
  userId,
  placeName,
  onClose,
  onApplied,
  onError,
}: {
  open: boolean;
  previewMode: boolean;
  userId: string | null;
  placeName: string;
  onClose: () => void;
  onApplied: (placeName: string) => void;
  onError: (message: string | null) => void;
}) {
  const initialVenue = placeName === "場所未設定" ? "" : placeName;
  const [venue, setVenue] = useState(initialVenue);
  const [center, setCenter] = useState<MapCoordinate>(FALLBACK_LOCAL_CENTER);
  const [radiusM, setRadiusM] = useState(500);
  const [durationMin, setDurationMin] = useState(120);
  const [carryingItems, setCarryingItems] = useState<LocalCarryingItem[]>([]);
  const [selectedCarryingIds, setSelectedCarryingIds] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [locating, setLocating] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setVenue(initialVenue);
    setSheetError(null);
    setPending(false);

    async function loadLocalMode() {
      if (!supabase || !userId || previewMode) {
        setCarryingItems(PREVIEW_CARRYING_ITEMS);
        setSelectedCarryingIds(PREVIEW_CARRYING_ITEMS.slice(0, 2).map((item) => item.id));
        if (!initialVenue) {
          const coordinate = await getCurrentCoordinate();
          if (!active || !coordinate) return;
          setCenter(coordinate);
          const label = await reverseGeocodeLabel(coordinate);
          if (active && label) setVenue(label);
        }
        return;
      }
      let resolvedCenter: MapCoordinate | null = null;
      const { data: settings } = await supabase
        .from("user_local_mode_settings")
        .select("aw_id, radius_m, last_lat, last_lng, selected_carrying_ids")
        .eq("user_id", userId)
        .maybeSingle();
      if (!active) return;

      const settingsRow = settings as
        | {
            aw_id?: string | null;
            radius_m?: number | null;
            last_lat?: number | string | null;
            last_lng?: number | string | null;
            selected_carrying_ids?: string[] | null;
          }
        | null;
      if (settingsRow?.radius_m) setRadiusM(settingsRow.radius_m);
      setSelectedCarryingIds(settingsRow?.selected_carrying_ids ?? []);
      const lastLat = toNumber(settingsRow?.last_lat);
      const lastLng = toNumber(settingsRow?.last_lng);
      if (lastLat != null && lastLng != null) {
        resolvedCenter = { latitude: lastLat, longitude: lastLng };
        setCenter(resolvedCenter);
      }

      if (settingsRow?.aw_id) {
        const { data: aw } = await supabase
          .from("activity_windows")
          .select("venue, start_at, end_at, radius_m, center_lat, center_lng")
          .eq("id", settingsRow.aw_id)
          .eq("user_id", userId)
          .maybeSingle();
        if (!active) return;
        if (aw) {
          const awRow = aw as {
            venue?: string | null;
            start_at?: string | null;
            end_at?: string | null;
            radius_m?: number | null;
            center_lat?: number | string | null;
            center_lng?: number | string | null;
          };
          if (awRow.venue) setVenue(awRow.venue);
          if (awRow.radius_m) setRadiusM(awRow.radius_m);
          const lat = toNumber(awRow.center_lat);
          const lng = toNumber(awRow.center_lng);
          if (lat != null && lng != null) {
            resolvedCenter = { latitude: lat, longitude: lng };
            setCenter(resolvedCenter);
          }
          if (awRow.start_at && awRow.end_at) {
            const minutes = Math.max(
              30,
              Math.round(
                (new Date(awRow.end_at).getTime() -
                  new Date(awRow.start_at).getTime()) /
                  60_000,
              ),
            );
            setDurationMin(minutes);
          }
        }
      }

      if (!resolvedCenter) {
        const coordinate = await getCurrentCoordinate();
        if (!active || !coordinate) return;
        setCenter(coordinate);
        const label = await reverseGeocodeLabel(coordinate);
        if (active && label && !initialVenue) setVenue(label);
      }

      const items = await fetchLocalCarryingItems(userId);
      if (active) setCarryingItems(items);
    }

    loadLocalMode();
    return () => {
      active = false;
    };
  }, [open, initialVenue, previewMode, userId]);

  async function useCurrentLocation() {
    setLocating(true);
    setSheetError(null);
    const coordinate = await getCurrentCoordinate();
    setLocating(false);
    if (!coordinate) {
      setSheetError("現在地を取得できませんでした");
      return;
    }
    setCenter(coordinate);
    const label = await reverseGeocodeLabel(coordinate);
    if (label) setVenue(label);
  }

  async function applySettings() {
    const trimmedVenue = venue.trim();
    if (!trimmedVenue) {
      setSheetError("交換場所を入力してください");
      return;
    }
    if (!supabase || !userId || previewMode) {
      onApplied(trimmedVenue);
      return;
    }
    setPending(true);
    setSheetError(null);
    const result = await applyLocalModeSettings({
      userId,
      venue: trimmedVenue,
      center,
      radiusM,
      durationMin,
      selectedCarryingIds,
    });
    setPending(false);
    if (result?.error) {
      setSheetError(result.error);
      onError(result.error);
      return;
    }
    onError(null);
    onApplied(trimmedVenue);
  }

  const radiusLabel = radiusM >= 1000 ? `${radiusM / 1000}km` : `${radiusM}m`;
  const selectedCarryingCount = selectedCarryingIds.length;

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={open}
    >
      <View style={styles.localSheetLayer}>
        <Pressable
          accessibilityLabel="閉じる"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.localSheetBackdrop}
        />
        <View style={styles.localSheet}>
          <View style={styles.localSheetHandle} />
          <View style={styles.localSheetHeader}>
            <View>
              <Text style={styles.localSheetKicker}>LOCAL MODE</Text>
              <Text style={styles.localSheetTitle}>現地交換モード</Text>
            </View>
            <Pressable
              accessibilityLabel="閉じる"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.localSheetClose}
            >
              <Text style={styles.localSheetCloseText}>×</Text>
            </Pressable>
          </View>
          <Text style={styles.localSheetLead}>
            場所・時間・範囲を設定して、近くで交換できる候補を探します。
          </Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.localSheetBody}
          >
            <View style={styles.localSection}>
              <View style={styles.localSectionHeader}>
                <Text style={styles.localSectionTitle}>交換場所</Text>
                <Pressable
                  disabled={locating}
                  onPress={useCurrentLocation}
                  style={styles.currentLocationButton}
                >
                  <Text style={styles.currentLocationText}>
                    {locating ? "取得中…" : "現在地"}
                  </Text>
                </Pressable>
              </View>
              <NativeMapPreview
                key={`${center.latitude}-${center.longitude}`}
                center={center}
                height={184}
                interactive
                markers={[
                  {
                    id: "local-center",
                    coordinate: center,
                    label: "●",
                    title: venue || "交換場所",
                  },
                ]}
                onPress={async (coordinate) => {
                  setCenter(coordinate);
                  const label = await reverseGeocodeLabel(coordinate);
                  if (label) setVenue(label);
                }}
                style={styles.localMap}
              />
              <TextInput
                onChangeText={setVenue}
                placeholder="場所を選ぶと自動で入ります"
                placeholderTextColor="rgba(58,50,74,0.38)"
                style={styles.localInput}
                value={venue}
              />
            </View>

            <View style={styles.localSection}>
              <Text style={styles.localSectionTitle}>
                有効時間 / {durationMin}分
              </Text>
              <View style={styles.localChipRow}>
                {LOCAL_DURATION_OPTIONS.map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() => setDurationMin(option.value)}
                    style={[
                      styles.localChip,
                      durationMin === option.value ? styles.localChipActive : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.localChipText,
                        durationMin === option.value
                          ? styles.localChipTextActive
                          : null,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.localSection}>
              <Text style={styles.localSectionTitle}>
                マッチ範囲 / {radiusLabel}
              </Text>
              <View style={styles.localChipRow}>
                {LOCAL_RADIUS_OPTIONS.map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => setRadiusM(option)}
                    style={[
                      styles.localChip,
                      radiusM === option ? styles.localChipActive : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.localChipText,
                        radiusM === option ? styles.localChipTextActive : null,
                      ]}
                    >
                      {option >= 1000 ? `${option / 1000}km` : `${option}m`}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.localSection}>
              <View style={styles.localSectionHeader}>
                <Text style={styles.localSectionTitle}>持参するグッズ</Text>
                <Text style={styles.localSectionMeta}>
                  {selectedCarryingCount} / {carryingItems.length}
                </Text>
              </View>
              {carryingItems.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.carryingScroller}
                >
                  {carryingItems.map((item) => {
                    const selected = selectedCarryingIds.includes(item.id);
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => {
                          setSelectedCarryingIds((current) =>
                            current.includes(item.id)
                              ? current.filter((id) => id !== item.id)
                              : [...current, item.id],
                          );
                        }}
                        style={[
                          styles.carryingCard,
                          selected ? styles.carryingCardActive : null,
                        ]}
                      >
                        <View
                          style={[
                            styles.carryingThumb,
                            { backgroundColor: item.photoUrl ? ihubColors.ink : item.hue },
                          ]}
                        >
                          {item.photoUrl ? (
                            <Image
                              source={{ uri: item.photoUrl }}
                              resizeMode="cover"
                              style={styles.carryingImage}
                            />
                          ) : (
                            <Text style={styles.carryingGlyph}>
                              {item.title.slice(0, 1)}
                            </Text>
                          )}
                          <View
                            style={[
                              styles.carryingCheck,
                              selected ? styles.carryingCheckActive : null,
                            ]}
                          >
                            <Text
                              style={[
                                styles.carryingCheckText,
                                selected ? styles.carryingCheckTextActive : null,
                              ]}
                            >
                              {selected ? "✓" : "+"}
                            </Text>
                          </View>
                        </View>
                        <Text numberOfLines={1} style={styles.carryingTitle}>
                          {item.title}
                        </Text>
                        <Text numberOfLines={1} style={styles.carryingSub}>
                          {item.subtitle}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              ) : (
                <View style={styles.carryingEmpty}>
                  <Text style={styles.carryingEmptyText}>
                    譲る候補の在庫を登録すると、ここで持参グッズを選べます。
                  </Text>
                </View>
              )}
            </View>

            {sheetError ? (
              <View style={styles.localSheetError}>
                <Text style={styles.localSheetErrorText}>{sheetError}</Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.localSheetActions}>
            <Pressable
              disabled={pending}
              onPress={onClose}
              style={styles.localCancelButton}
            >
              <Text style={styles.localCancelText}>キャンセル</Text>
            </Pressable>
            <Pressable
              disabled={pending || !venue.trim()}
              onPress={applySettings}
              style={[
                styles.localApplyButton,
                pending || !venue.trim() ? styles.localApplyButtonDisabled : null,
              ]}
            >
              <Text style={styles.localApplyText}>
                {pending ? "適用中…" : "この設定で表示"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ModeSwitch({
  viewMode,
  width,
  onChange,
}: {
  viewMode: HomeModeView;
  width: number;
  onChange: (next: HomeModeView) => void;
}) {
  const progress = useRef(new Animated.Value(viewMode === "local" ? 1 : 0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const switchWidth = Math.max(280, width - 36);
  const thumbWidth = (switchWidth - 8) / 2;

  useEffect(() => {
    pulse.setValue(0);
    Animated.parallel([
      Animated.spring(progress, {
        toValue: viewMode === "local" ? 1 : 0,
        damping: 22,
        stiffness: 190,
        mass: 0.72,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 130,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 210,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [progress, pulse, viewMode]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, thumbWidth],
  });
  const stretch = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.035],
  });
  const glossOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.32, 0.55],
  });
  const nationalActive = viewMode === "national";
  const localActive = viewMode === "local";

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
      </Animated.View>
      <Pressable
        style={styles.modeButton}
        onPress={() => onChange("national")}
      >
        <Text
          style={[
            styles.modeText,
            nationalActive ? styles.modeTextActive : styles.modeTextInactive,
          ]}
        >
          全国交換モード
        </Text>
      </Pressable>
      <Pressable style={styles.modeButton} onPress={() => onChange("local")}>
        <Text
          style={[
            styles.modeText,
            localActive ? styles.modeTextActive : styles.modeTextInactive,
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
  if (!candidate.listingIds?.length && (candidate.giveIds?.length || candidate.receiveIds?.length)) {
    router.push({
      pathname: "/proposal-select",
      params: {
        tab: "meetup",
        candidateId: candidate.id,
        partnerId: candidate.partnerId ?? "",
        partnerHandle: candidate.partnerHandle ?? "",
        matchType: candidate.matchType ?? "",
        gives: candidate.giveIds?.join(",") ?? "",
        receives: candidate.receiveIds?.join(",") ?? "",
      },
    });
    return;
  }

  router.push({
    pathname: "/match-detail",
    params: buildMatchDetailParams(row, candidate),
  });
}

type LocalModeActionResult = { error?: string } | undefined;

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

async function getCurrentCoordinate(): Promise<MapCoordinate | null> {
  try {
    const Location = await import("expo-location");
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") return null;
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch {
    return null;
  }
}

async function reverseGeocodeLabel(coordinate: MapCoordinate) {
  try {
    const Location = await import("expo-location");
    const results = await Location.reverseGeocodeAsync(coordinate);
    const first = results[0];
    if (!first) return null;
    return (
      first.name ||
      first.street ||
      first.district ||
      first.subregion ||
      first.city ||
      first.region ||
      null
    );
  } catch {
    return null;
  }
}

async function applyLocalModeSettings(input: {
  userId: string;
  venue: string;
  center: MapCoordinate;
  radiusM: number;
  durationMin: number;
  selectedCarryingIds: string[];
}): Promise<LocalModeActionResult> {
  if (!supabase) return undefined;
  const venue = input.venue.trim();
  if (!venue || venue.length > 100) {
    return { error: "場所名を入力してください（1〜100文字）" };
  }
  if (input.radiusM < 50 || input.radiusM > 5000) {
    return { error: "半径は50m〜5000mで指定してください" };
  }

  const start = new Date();
  const end = new Date(
    start.getTime() + Math.max(30, input.durationMin) * 60_000,
  );
  const { data: settings } = await supabase
    .from("user_local_mode_settings")
    .select("aw_id")
    .eq("user_id", input.userId)
    .maybeSingle();
  const settingsRow = settings as { aw_id?: string | null } | null;
  let awId = settingsRow?.aw_id ?? null;

  const awFields = {
    venue,
    event_name: null,
    eventless: true,
    start_at: start.toISOString(),
    end_at: end.toISOString(),
    radius_m: input.radiusM,
    center_lat: input.center.latitude,
    center_lng: input.center.longitude,
    status: "enabled" as const,
  };

  if (awId) {
    const { error } = await supabase
      .from("activity_windows")
      .update(awFields)
      .eq("id", awId)
      .eq("user_id", input.userId);
    if (error) awId = null;
  }

  if (!awId) {
    const { data: created, error } = await supabase
      .from("activity_windows")
      .insert({ ...awFields, user_id: input.userId })
      .select("id")
      .single();
    if (error || !created) {
      return { error: error?.message ?? "AW の作成に失敗しました" };
    }
    awId = (created as { id: string }).id;
  }

  await supabase
    .from("activity_windows")
    .update({ status: "disabled" })
    .eq("user_id", input.userId)
    .eq("status", "enabled")
    .neq("id", awId);

  const { error: upsertError } = await supabase
    .from("user_local_mode_settings")
    .upsert(
      {
        user_id: input.userId,
        enabled: true,
        aw_id: awId,
        radius_m: input.radiusM,
        last_lat: input.center.latitude,
        last_lng: input.center.longitude,
        selected_carrying_ids: input.selectedCarryingIds,
      },
      { onConflict: "user_id" },
    );

  if (upsertError) return { error: upsertError.message };
  return undefined;
}

async function fetchLocalCarryingItems(userId: string): Promise<LocalCarryingItem[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("goods_inventory")
    .select(
      "id, title, photo_urls, hue, group:groups_master(name), character:characters_master(name), goods_type:goods_types_master(name)",
    )
    .eq("user_id", userId)
    .eq("kind", "for_trade")
    .eq("status", "active")
    .order("created_at", { ascending: false });
  return ((data as {
    id: string;
    title: string;
    photo_urls: string[] | null;
    hue: number | string | null;
    group: LocalNameRelation;
    character: LocalNameRelation;
    goods_type: LocalNameRelation;
  }[] | null) ?? []).map((row) => {
    const label = pickLocalName(row.character) ?? pickLocalName(row.group) ?? row.title;
    const goodsType = pickLocalName(row.goods_type) ?? "グッズ";
    return {
      id: row.id,
      title: row.title || label,
      subtitle: `${pickLocalName(row.group) ?? "未設定"} / ${goodsType}`,
      photoUrl: row.photo_urls?.[0] ?? null,
      hue: normalizeLocalHue(row.hue, label),
    };
  });
}

type LocalNameRelation =
  | { name: string | null }
  | { name: string | null }[]
  | null
  | undefined;

function pickLocalName(value: LocalNameRelation) {
  if (!value) return null;
  return Array.isArray(value) ? value[0]?.name ?? null : value.name;
}

function normalizeLocalHue(value: number | string | null | undefined, seed: string) {
  if (typeof value === "number") return `hsl(${value}, 62%, 78%)`;
  if (typeof value === "string" && value.trim()) {
    return value.startsWith("#") || value.startsWith("hsl")
      ? value
      : `hsl(${Number(value) || localNameToHue(seed)}, 62%, 78%)`;
  }
  return `hsl(${localNameToHue(seed)}, 62%, 78%)`;
}

function localNameToHue(name: string) {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash << 5) - hash + name.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash) % 360;
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
  localSheetLayer: {
    backgroundColor: "rgba(20,18,28,0.28)",
    flex: 1,
    justifyContent: "flex-end",
  },
  localSheetBackdrop: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  localSheet: {
    backgroundColor: "rgba(255,255,255,0.97)",
    borderColor: "rgba(255,255,255,0.92)",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    maxHeight: "86%",
    paddingBottom: 18,
    paddingHorizontal: 20,
    paddingTop: 10,
    shadowColor: ihubColors.ink,
    shadowOffset: { width: 0, height: -16 },
    shadowOpacity: 0.16,
    shadowRadius: 34,
  },
  localSheetHandle: {
    alignSelf: "center",
    backgroundColor: "rgba(58,50,74,0.14)",
    borderRadius: 999,
    height: 5,
    marginBottom: 15,
    width: 42,
  },
  localSheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  localSheetKicker: {
    color: ihubColors.lavender,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  localSheetTitle: {
    color: ihubColors.ink,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 27,
    marginTop: 3,
  },
  localSheetClose: {
    alignItems: "center",
    backgroundColor: "rgba(58,50,74,0.07)",
    borderRadius: 999,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  localSheetCloseText: {
    color: "rgba(58,50,74,0.62)",
    fontSize: 24,
    fontWeight: "600",
    lineHeight: 27,
  },
  localSheetLead: {
    color: ihubColors.mutedInk,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
    marginTop: 9,
  },
  localSheetBody: {
    gap: 16,
    paddingBottom: 16,
    paddingTop: 17,
  },
  localSection: {
    gap: 10,
  },
  localSectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  localSectionTitle: {
    color: ihubColors.ink,
    fontSize: 13,
    fontWeight: "900",
  },
  localSectionMeta: {
    color: ihubColors.mutedInk,
    fontSize: 11,
    fontWeight: "900",
  },
  carryingScroller: {
    gap: 10,
    paddingRight: 12,
  },
  carryingCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderColor: "rgba(58,50,74,0.10)",
    borderRadius: 16,
    borderWidth: 1,
    padding: 8,
    width: 104,
  },
  carryingCardActive: {
    borderColor: "rgba(166,149,216,0.72)",
    shadowColor: ihubColors.lavender,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
  },
  carryingThumb: {
    alignItems: "center",
    aspectRatio: 3 / 4,
    borderRadius: 12,
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  carryingImage: {
    height: "100%",
    width: "100%",
  },
  carryingGlyph: {
    color: ihubColors.surface,
    fontSize: 26,
    fontWeight: "900",
    textShadowColor: "rgba(58,50,74,0.24)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5,
  },
  carryingCheck: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.74)",
    borderColor: "rgba(255,255,255,0.86)",
    borderRadius: 999,
    borderWidth: 1,
    height: 24,
    justifyContent: "center",
    position: "absolute",
    right: 6,
    top: 6,
    width: 24,
  },
  carryingCheckActive: {
    backgroundColor: ihubColors.lavender,
    borderColor: ihubColors.surface,
  },
  carryingCheckText: {
    color: ihubColors.lavender,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 16,
  },
  carryingCheckTextActive: {
    color: ihubColors.surface,
  },
  carryingTitle: {
    color: ihubColors.ink,
    fontSize: 11,
    fontWeight: "900",
    marginTop: 7,
  },
  carryingSub: {
    color: ihubColors.mutedInk,
    fontSize: 9.5,
    fontWeight: "800",
    marginTop: 2,
  },
  carryingEmpty: {
    backgroundColor: "rgba(58,50,74,0.045)",
    borderColor: "rgba(58,50,74,0.08)",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  carryingEmptyText: {
    color: ihubColors.mutedInk,
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 16,
  },
  currentLocationButton: {
    backgroundColor: "rgba(166,149,216,0.13)",
    borderColor: "rgba(166,149,216,0.32)",
    borderRadius: ihubRadii.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  currentLocationText: {
    color: ihubColors.lavender,
    fontSize: 11,
    fontWeight: "900",
  },
  localMap: {
    borderRadius: 20,
    overflow: "hidden",
  },
  localInput: {
    backgroundColor: "rgba(58,50,74,0.05)",
    borderColor: "rgba(58,50,74,0.08)",
    borderRadius: 17,
    borderWidth: 1,
    color: ihubColors.ink,
    fontSize: 13,
    fontWeight: "800",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  localChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
  localChip: {
    backgroundColor: "rgba(58,50,74,0.055)",
    borderColor: "rgba(58,50,74,0.08)",
    borderRadius: ihubRadii.pill,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  localChipActive: {
    backgroundColor: "rgba(166,149,216,0.18)",
    borderColor: "rgba(166,149,216,0.48)",
  },
  localChipText: {
    color: "rgba(58,50,74,0.60)",
    fontSize: 11,
    fontWeight: "900",
  },
  localChipTextActive: {
    color: ihubColors.ink,
  },
  localSheetError: {
    backgroundColor: "rgba(239,68,68,0.09)",
    borderColor: "rgba(239,68,68,0.16)",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  localSheetErrorText: {
    color: ihubColors.warn,
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 16,
  },
  localSheetActions: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 2,
  },
  localCancelButton: {
    alignItems: "center",
    backgroundColor: "rgba(58,50,74,0.06)",
    borderRadius: 18,
    flex: 0.36,
    justifyContent: "center",
    paddingVertical: 14,
  },
  localCancelText: {
    color: "rgba(58,50,74,0.62)",
    fontSize: 13,
    fontWeight: "900",
  },
  localApplyButton: {
    alignItems: "center",
    backgroundColor: ihubColors.lavender,
    borderRadius: 18,
    flex: 0.64,
    justifyContent: "center",
    paddingVertical: 14,
    shadowColor: ihubColors.lavender,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
  },
  localApplyButtonDisabled: {
    opacity: 0.45,
  },
  localApplyText: {
    color: ihubColors.surface,
    fontSize: 13,
    fontWeight: "900",
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
    backgroundColor: "rgba(118,112,134,0.12)",
    borderColor: "rgba(255,255,255,0.72)",
    borderRadius: ihubRadii.pill,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 11,
    overflow: "hidden",
    padding: 4,
    position: "relative",
    shadowColor: ihubColors.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  modeThumb: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderColor: "rgba(255,255,255,0.88)",
    borderRadius: ihubRadii.pill,
    borderWidth: 1,
    bottom: 4,
    left: 4,
    overflow: "hidden",
    position: "absolute",
    top: 4,
    shadowColor: ihubColors.ink,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
  },
  modeThumbGloss: {
    backgroundColor: "rgba(255,255,255,0.62)",
    borderRadius: 999,
    height: "54%",
    left: 12,
    position: "absolute",
    right: 12,
    top: 5,
  },
  modeButton: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: 38,
    paddingVertical: 8,
    zIndex: 1,
  },
  modeText: {
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 16,
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
