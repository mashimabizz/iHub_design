import { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ihubColors, ihubRadii } from "../theme/tokens";

export type ColumnCount = 3 | 4 | 5;

export type GoodsGridItem = {
  id: string;
  title: string;
  subtitle: string;
  glyph: string;
  hue: string;
  badge?: string;
  note?: string;
};

export type SheetAction = {
  id: string;
  label: string;
  tone?: "default" | "danger" | "muted";
  onPress: () => void;
};

export function ColumnSwitcher({
  value,
  onChange,
}: {
  value: ColumnCount;
  onChange: (next: ColumnCount) => void;
}) {
  const values: ColumnCount[] = [3, 4, 5];

  return (
    <View style={styles.columnSwitcher}>
      {values.map((count) => {
        const active = value === count;
        return (
          <Pressable
            key={count}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(count)}
            style={[
              styles.columnButton,
              active ? styles.columnButtonActive : styles.columnButtonInactive,
            ]}
          >
            <Text
              style={[
                styles.columnButtonText,
                active
                  ? styles.columnButtonTextActive
                  : styles.columnButtonTextInactive,
              ]}
            >
              {count}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SectionTabs<T extends string>({
  value,
  tabs,
  onChange,
}: {
  value: T;
  tabs: { id: T; label: string; count: number; color: string }[];
  onChange: (next: T) => void;
}) {
  return (
    <View style={styles.sectionTabs}>
      {tabs.map((tab) => {
        const active = value === tab.id;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            style={[
              styles.sectionTab,
              active ? styles.sectionTabActive : styles.sectionTabInactive,
              active ? { borderColor: tab.color } : null,
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.sectionTabLabel,
                active
                  ? styles.sectionTabLabelActive
                  : styles.sectionTabLabelInactive,
              ]}
            >
              {tab.label}
            </Text>
            <Text style={[styles.sectionTabCount, { color: tab.color }]}>
              {tab.count}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function GoodsGrid({
  items,
  columns,
  onPressItem,
  emptyLabel,
  addTileLabel,
  onPressAddTile,
}: {
  items: GoodsGridItem[];
  columns: ColumnCount;
  onPressItem: (item: GoodsGridItem) => void;
  emptyLabel: string;
  addTileLabel?: string;
  onPressAddTile?: () => void;
}) {
  const { width } = useWindowDimensions();
  const screenPadding = 36;
  const gap = columns === 3 ? 10 : columns === 4 ? 8 : 6;
  const tileWidth = (width - screenPadding - gap * (columns - 1)) / columns;
  const showAddTile = !!onPressAddTile;

  if (items.length === 0 && !showAddTile) {
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyText}>{emptyLabel}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.grid, { gap }]}>
      {showAddTile ? (
        <AnimatedAddTile
          width={tileWidth}
          label={addTileLabel ?? "追加"}
          onPress={onPressAddTile}
        />
      ) : null}
      {items.map((item, index) => (
        <AnimatedGoodsTile
          key={item.id}
          item={item}
          width={tileWidth}
          delayMs={(showAddTile ? index + 1 : index) * 35}
          onPress={() => onPressItem(item)}
        />
      ))}
    </View>
  );
}

function AnimatedAddTile({
  width,
  label,
  onPress,
}: {
  width: number;
  label: string;
  onPress: () => void;
}) {
  const appear = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(appear, {
      toValue: 1,
      damping: 18,
      stiffness: 160,
      mass: 0.72,
      useNativeDriver: true,
    }).start();
  }, [appear]);

  const translateY = appear.interpolate({
    inputRange: [0, 1],
    outputRange: [14, 0],
  });
  const scale = appear.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1],
  });

  return (
    <Animated.View
      style={{
        opacity: appear,
        transform: [{ translateY }, { scale }],
        width,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={[styles.addTile, { height: width * 1.34 }]}
      >
        <Text style={styles.addTilePlus}>＋</Text>
        <Text style={styles.addTileText}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

function AnimatedGoodsTile({
  item,
  width,
  delayMs,
  onPress,
}: {
  item: GoodsGridItem;
  width: number;
  delayMs: number;
  onPress: () => void;
}) {
  const appear = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.spring(appear, {
        toValue: 1,
        damping: 18,
        stiffness: 160,
        mass: 0.72,
        useNativeDriver: true,
      }).start();
    }, delayMs);

    return () => clearTimeout(timer);
  }, [appear, delayMs]);

  const translateY = appear.interpolate({
    inputRange: [0, 1],
    outputRange: [14, 0],
  });
  const scale = appear.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1],
  });

  return (
    <Animated.View
      style={{
        opacity: appear,
        transform: [{ translateY }, { scale }],
        width,
      }}
    >
      <Pressable onPress={onPress} style={styles.tilePressable}>
        <View style={[styles.tileImage, { height: width * 1.34 }]}>
          <View style={[styles.tileImageFill, { backgroundColor: item.hue }]}>
            <View style={styles.tileShine} />
            <Text style={styles.tileGlyph}>{item.glyph}</Text>
          </View>
          <View style={styles.tileTopRow}>
            <View style={styles.tileTitlePlate}>
              <Text numberOfLines={1} style={styles.tileTitlePlateText}>
                {item.title}
              </Text>
            </View>
            {item.badge ? (
              <View
                style={[
                  styles.tileBadge,
                  item.badge === "未紐付け" ? styles.tileBadgeWarn : null,
                ]}
              >
                <Text numberOfLines={1} style={styles.tileBadgeText}>
                  {item.badge}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.tileBottomStrip}>
            <Text numberOfLines={1} style={styles.tileSubtitle}>
              {item.subtitle}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function BottomOptionSheet({
  visible,
  title,
  subtitle,
  actions,
  onClose,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  actions: SheetAction[];
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(220)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : 220,
      damping: 22,
      stiffness: 190,
      mass: 0.78,
      useNativeDriver: true,
    }).start();
  }, [translateY, visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.sheetRoot}>
        <Pressable style={styles.sheetBackdrop} onPress={onClose} />
        <Animated.View
          style={[
            styles.sheetPanel,
            {
              paddingBottom: Math.max(insets.bottom, 12) + 10,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{title}</Text>
          {subtitle ? (
            <Text numberOfLines={2} style={styles.sheetSubtitle}>
              {subtitle}
            </Text>
          ) : null}
          <View style={styles.sheetActions}>
            {actions.map((action) => (
              <Pressable
                key={action.id}
                onPress={action.onPress}
                style={[
                  styles.sheetAction,
                  action.tone === "danger"
                    ? styles.sheetActionDanger
                    : action.tone === "muted"
                      ? styles.sheetActionMuted
                      : styles.sheetActionDefault,
                ]}
              >
                <Text
                  style={[
                    styles.sheetActionText,
                    action.tone === "danger"
                      ? styles.sheetActionTextDanger
                      : action.tone === "muted"
                        ? styles.sheetActionTextMuted
                        : styles.sheetActionTextDefault,
                  ]}
                >
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

export function FloatingAddButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        styles.floatingAdd,
        {
          bottom: Math.max(insets.bottom, 10) + 92,
        },
      ]}
    >
      <Text style={styles.floatingAddText}>+</Text>
    </Pressable>
  );
}

export function FilterChips({
  chips,
}: {
  chips: { id: string; label: string; active?: boolean }[];
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterChips}
    >
      {chips.map((chip) => (
        <View
          key={chip.id}
          style={[
            styles.filterChip,
            chip.active ? styles.filterChipActive : null,
          ]}
        >
          <Text
            style={[
              styles.filterChipText,
              chip.active ? styles.filterChipTextActive : null,
            ]}
          >
            {chip.label}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  columnSwitcher: {
    backgroundColor: "rgba(58,50,74,0.06)",
    borderRadius: ihubRadii.pill,
    flexDirection: "row",
    gap: 3,
    padding: 3,
  },
  columnButton: {
    alignItems: "center",
    borderRadius: ihubRadii.pill,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  columnButtonActive: {
    backgroundColor: ihubColors.surface,
    shadowColor: ihubColors.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 7,
  },
  columnButtonInactive: {
    backgroundColor: "transparent",
  },
  columnButtonText: {
    fontSize: 11,
    fontWeight: "900",
  },
  columnButtonTextActive: {
    color: ihubColors.lavender,
  },
  columnButtonTextInactive: {
    color: "rgba(58,50,74,0.54)",
  },
  sectionTabs: {
    flexDirection: "row",
    gap: 6,
  },
  sectionTab: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
    paddingHorizontal: 6,
    paddingVertical: 9,
  },
  sectionTabActive: {
    backgroundColor: ihubColors.surface,
  },
  sectionTabInactive: {
    backgroundColor: "rgba(58,50,74,0.04)",
    borderColor: "rgba(58,50,74,0.08)",
  },
  sectionTabLabel: {
    fontSize: 11.5,
    fontWeight: "900",
  },
  sectionTabLabelActive: {
    color: ihubColors.ink,
  },
  sectionTabLabelInactive: {
    color: "rgba(58,50,74,0.55)",
  },
  sectionTabCount: {
    fontSize: 10,
    fontWeight: "900",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingBottom: 18,
  },
  addTile: {
    alignItems: "center",
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(166,149,216,0.54)",
    borderRadius: 13,
    borderStyle: "dashed",
    borderWidth: 1.5,
    justifyContent: "center",
    shadowColor: ihubColors.ink,
    shadowOffset: { width: 3, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 9,
  },
  addTilePlus: {
    color: ihubColors.lavender,
    fontSize: 27,
    fontWeight: "800",
    lineHeight: 31,
  },
  addTileText: {
    color: ihubColors.lavender,
    fontSize: 10,
    fontWeight: "900",
    marginTop: 2,
  },
  emptyBox: {
    alignItems: "center",
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.10)",
    borderRadius: ihubRadii.lg,
    borderStyle: "dashed",
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 170,
    padding: 18,
  },
  emptyText: {
    color: ihubColors.mutedInk,
    fontSize: 12,
    fontWeight: "800",
  },
  tilePressable: {
    borderRadius: 13,
  },
  tileImage: {
    backgroundColor: "rgba(58,50,74,0.05)",
    borderColor: "rgba(58,50,74,0.08)",
    borderRadius: 13,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: ihubColors.ink,
    shadowOffset: { width: 3, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 9,
  },
  tileImageFill: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  tileShine: {
    backgroundColor: "rgba(255,255,255,0.26)",
    borderRadius: 999,
    height: 58,
    position: "absolute",
    right: -17,
    top: -12,
    width: 58,
  },
  tileGlyph: {
    color: ihubColors.surface,
    fontSize: 32,
    fontWeight: "900",
    textShadowColor: "rgba(58,50,74,0.16)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5,
  },
  tileTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 4,
    left: 6,
    position: "absolute",
    right: 6,
    top: 6,
  },
  tileTitlePlate: {
    backgroundColor: "rgba(255,255,255,0.86)",
    borderRadius: 6,
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  tileTitlePlateText: {
    color: ihubColors.ink,
    fontSize: 9,
    fontWeight: "900",
  },
  tileBadge: {
    backgroundColor: ihubColors.lavender,
    borderRadius: 6,
    flexShrink: 0,
    maxWidth: "50%",
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  tileBadgeWarn: {
    backgroundColor: ihubColors.warn,
  },
  tileBadgeText: {
    color: ihubColors.surface,
    fontSize: 8.5,
    fontWeight: "900",
  },
  tileBottomStrip: {
    backgroundColor: "rgba(255,255,255,0.92)",
    bottom: 0,
    left: 0,
    paddingHorizontal: 7,
    paddingBottom: 6,
    paddingTop: 14,
    position: "absolute",
    right: 0,
  },
  tileSubtitle: {
    color: ihubColors.ink,
    fontSize: 9.5,
    fontWeight: "900",
  },
  sheetRoot: {
    backgroundColor: "rgba(20,16,29,0.36)",
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetBackdrop: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  sheetPanel: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  sheetHandle: {
    alignSelf: "center",
    backgroundColor: "rgba(58,50,74,0.18)",
    borderRadius: 999,
    height: 4,
    marginBottom: 14,
    width: 42,
  },
  sheetTitle: {
    color: ihubColors.ink,
    fontSize: 16,
    fontWeight: "900",
  },
  sheetSubtitle: {
    color: ihubColors.mutedInk,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: 4,
  },
  sheetActions: {
    gap: 8,
    marginTop: 14,
  },
  sheetAction: {
    alignItems: "center",
    borderRadius: 15,
    paddingVertical: 14,
  },
  sheetActionDefault: {
    backgroundColor: "rgba(166,149,216,0.14)",
  },
  sheetActionDanger: {
    backgroundColor: "rgba(217,130,107,0.12)",
  },
  sheetActionMuted: {
    backgroundColor: "rgba(58,50,74,0.06)",
  },
  sheetActionText: {
    fontSize: 14,
    fontWeight: "900",
  },
  sheetActionTextDefault: {
    color: ihubColors.lavender,
  },
  sheetActionTextDanger: {
    color: ihubColors.warn,
  },
  sheetActionTextMuted: {
    color: ihubColors.ink,
  },
  floatingAdd: {
    alignItems: "center",
    backgroundColor: ihubColors.lavender,
    borderColor: "rgba(255,255,255,0.92)",
    borderRadius: 30,
    borderWidth: 1,
    height: 58,
    justifyContent: "center",
    position: "absolute",
    right: 20,
    shadowColor: ihubColors.lavender,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.32,
    shadowRadius: 22,
    width: 58,
  },
  floatingAddText: {
    color: ihubColors.surface,
    fontSize: 30,
    fontWeight: "700",
    lineHeight: 34,
  },
  filterChips: {
    gap: 7,
    paddingRight: 18,
  },
  filterChip: {
    backgroundColor: "rgba(58,50,74,0.05)",
    borderColor: "rgba(58,50,74,0.08)",
    borderRadius: ihubRadii.pill,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  filterChipActive: {
    backgroundColor: "rgba(166,149,216,0.14)",
    borderColor: "rgba(166,149,216,0.34)",
  },
  filterChipText: {
    color: "rgba(58,50,74,0.58)",
    fontSize: 10.5,
    fontWeight: "900",
  },
  filterChipTextActive: {
    color: ihubColors.lavender,
  },
});
