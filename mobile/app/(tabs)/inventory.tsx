import { useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from "react-native";
import {
  BottomOptionSheet,
  ColumnSwitcher,
  FloatingAddButton,
  GoodsGrid,
  type ColumnCount,
  type GoodsGridItem,
  type SheetAction,
  SectionTabs,
} from "../../src/components/GoodsGrid";
import { Screen } from "../../src/components/Screen";
import { ihubColors, ihubRadii } from "../../src/theme/tokens";

type InventoryStatus = "active" | "keep" | "traded";

type InventoryItem = GoodsGridItem & {
  status: InventoryStatus;
  group: string;
  type: string;
};

const INITIAL_ITEMS: InventoryItem[] = [
  {
    id: "inv-01",
    title: "スア 春ver.",
    subtitle: "LUMENA / トレカ",
    glyph: "S",
    hue: "#cbbcf4",
    badge: "譲る候補",
    note: "同種優先",
    status: "active",
    group: "LUMENA",
    type: "トレカ",
  },
  {
    id: "inv-02",
    title: "ジョンウ ラキドロ",
    subtitle: "NCT / トレカ",
    glyph: "J",
    hue: "#a8d4e6",
    badge: "残 1",
    note: "タグ: ラキドロ",
    status: "active",
    group: "NCT",
    type: "トレカ",
  },
  {
    id: "inv-03",
    title: "ニンニン アクスタ",
    subtitle: "aespa / アクスタ",
    glyph: "N",
    hue: "#f3c5d4",
    badge: "現地OK",
    note: "会場持参予定",
    status: "active",
    group: "aespa",
    type: "アクスタ",
  },
  {
    id: "inv-04",
    title: "カリナ 缶バッジ",
    subtitle: "aespa / 缶バッジ",
    glyph: "K",
    hue: "#d5cff4",
    badge: "残 2",
    status: "active",
    group: "aespa",
    type: "缶バッジ",
  },
  {
    id: "inv-05",
    title: "V トレカ",
    subtitle: "BTS / トレカ",
    glyph: "V",
    hue: "#b7dceb",
    badge: "キープ",
    note: "自分用",
    status: "keep",
    group: "BTS",
    type: "トレカ",
  },
  {
    id: "inv-06",
    title: "リノ 通常盤",
    subtitle: "SKZ / トレカ",
    glyph: "R",
    hue: "#f7d5df",
    badge: "キープ",
    status: "keep",
    group: "SKZ",
    type: "トレカ",
  },
  {
    id: "inv-07",
    title: "ミンギュ 会場",
    subtitle: "SVT / トレカ",
    glyph: "M",
    hue: "#c8e8f2",
    badge: "譲渡済",
    note: "2026/05/08",
    status: "traded",
    group: "SVT",
    type: "トレカ",
  },
];

const STATUS_TABS: {
  id: InventoryStatus;
  label: string;
  color: string;
}[] = [
  { id: "active", label: "譲る候補", color: ihubColors.lavender },
  { id: "keep", label: "自分用キープ", color: ihubColors.pink },
  { id: "traded", label: "過去に譲った", color: "#9aa3b0" },
];
const STATUS_ORDER: InventoryStatus[] = ["active", "keep", "traded"];

export default function InventoryScreen() {
  const [items, setItems] = useState<InventoryItem[]>(INITIAL_ITEMS);
  const [status, setStatus] = useState<InventoryStatus>("active");
  const [columns, setColumns] = useState<ColumnCount>(3);
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);
  const tabSwipeRef = useRef<{
    startX: number;
    startY: number;
    tracking: boolean;
    swiping: boolean;
  } | null>(null);

  const groupOptions = useMemo(() => {
    const values = new Set<string>();
    for (const item of items) values.add(item.group);
    return Array.from(values).sort((a, b) => a.localeCompare(b, "ja"));
  }, [items]);
  const typeOptions = useMemo(() => {
    const values = new Set<string>();
    for (const item of items) values.add(item.type);
    return Array.from(values).sort((a, b) => a.localeCompare(b, "ja"));
  }, [items]);
  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        if (activeGroup && item.group !== activeGroup) return false;
        if (activeType && item.type !== activeType) return false;
        return true;
      }),
    [activeGroup, activeType, items],
  );
  const visibleItems = useMemo(
    () => filteredItems.filter((item) => item.status === status),
    [filteredItems, status],
  );
  const counts = useMemo(
    () => ({
      active: filteredItems.filter((item) => item.status === "active").length,
      keep: filteredItems.filter((item) => item.status === "keep").length,
      traded: filteredItems.filter((item) => item.status === "traded").length,
    }),
    [filteredItems],
  );
  const tabs = STATUS_TABS.map((tab) => ({
    ...tab,
    count: counts[tab.id],
  }));
  const selectedActions = selected
    ? buildActions({
        item: selected,
        onClose: () => setSelected(null),
        onMove: (nextStatus) => {
          setItems((current) =>
            current.map((item) =>
              item.id === selected.id
                ? {
                    ...item,
                    status: nextStatus,
                    badge: nextStatus === "active" ? "譲る候補" : "キープ",
                  }
                : item,
            ),
          );
          setSelected(null);
        },
        onDelete: () => {
          setItems((current) =>
            current.filter((item) => item.id !== selected.id),
          );
          setSelected(null);
        },
      })
    : [];

  return (
    <Screen scroll={false} contentStyle={styles.screenContent}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>INVENTORY</Text>
          <Text style={styles.title}>マイ在庫</Text>
        </View>
        <ColumnSwitcher value={columns} onChange={setColumns} />
      </View>

      <SectionTabs
        value={status}
        tabs={tabs}
        onChange={(next) => {
          setStatus(next);
          setSelected(null);
        }}
      />

      <View style={styles.filters}>
        <FilterRow
          label="推し"
          options={groupOptions}
          active={activeGroup}
          onChange={(next) => {
            setActiveGroup(next);
            setSelected(null);
          }}
        />
        <FilterRow
          label="種別"
          options={typeOptions}
          active={activeType}
          onChange={(next) => {
            setActiveType(next);
            setSelected(null);
          }}
        />
      </View>

      <View
        style={styles.contentHost}
        onTouchStart={handleSwipeStart}
        onTouchMove={handleSwipeMove}
        onTouchEnd={handleSwipeEnd}
        onTouchCancel={handleSwipeCancel}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.gridScroll}
        >
          <GoodsGrid
            items={visibleItems}
            columns={columns}
            emptyLabel={
              status === "active"
                ? "譲る候補のグッズはまだありません"
                : status === "keep"
                  ? "自分用キープのグッズはまだありません"
                  : "過去に譲ったグッズはまだありません"
            }
            onPressItem={(gridItem) => {
              const item = items.find((current) => current.id === gridItem.id);
              if (item) setSelected(item);
            }}
          />
        </ScrollView>
      </View>

      <FloatingAddButton
        label="グッズを追加"
        onPress={() => {
          // Supabase連携前のプレビューなので、仮カードを手元に追加する。
          const index = items.length + 1;
          setItems((current) => [
            {
              id: `inv-preview-${index}`,
              title: `追加グッズ ${index}`,
              subtitle: "プレビュー / トレカ",
              glyph: `${index}`,
              hue: "#cbbcf4",
              badge: "NEW",
              status: "active",
              group: "preview",
              type: "トレカ",
            },
            ...current,
          ]);
          setStatus("active");
          setActiveGroup(null);
          setActiveType(null);
        }}
      />

      <BottomOptionSheet
        visible={!!selected}
        title={selected?.title ?? ""}
        subtitle={
          selected
            ? selected.status === "traded"
              ? "過去に譲ったグッズです。編集や削除はできません。"
              : selected.note ?? selected.subtitle
            : undefined
        }
        actions={selectedActions}
        onClose={() => setSelected(null)}
      />
    </Screen>
  );

  function moveTabBySwipe(direction: 1 | -1) {
    const currentIndex = STATUS_ORDER.indexOf(status);
    const next = STATUS_ORDER[currentIndex + direction];
    if (!next) return;
    setStatus(next);
    setSelected(null);
  }

  function handleSwipeStart(event: GestureResponderEvent) {
    const { pageX, pageY } = event.nativeEvent;
    tabSwipeRef.current = {
      startX: pageX,
      startY: pageY,
      tracking: true,
      swiping: false,
    };
  }

  function handleSwipeMove(event: GestureResponderEvent) {
    const state = tabSwipeRef.current;
    if (!state?.tracking) return;
    const { pageX, pageY } = event.nativeEvent;
    const dx = pageX - state.startX;
    const dy = pageY - state.startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (!state.swiping) {
      if (absX > 14 && absX > absY * 1.25) {
        state.swiping = true;
      } else if (absY > 14 && absY > absX * 1.1) {
        state.tracking = false;
      }
    }
  }

  function handleSwipeEnd(event: GestureResponderEvent) {
    const state = tabSwipeRef.current;
    tabSwipeRef.current = null;
    if (!state?.tracking || !state.swiping) return;
    const { pageX, pageY } = event.nativeEvent;
    const dx = pageX - state.startX;
    const dy = pageY - state.startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (absX < 58 || absX < absY * 1.35) return;
    moveTabBySwipe(dx < 0 ? 1 : -1);
  }

  function handleSwipeCancel() {
    tabSwipeRef.current = null;
  }
}

function FilterRow({
  label,
  options,
  active,
  onChange,
}: {
  label: string;
  options: string[];
  active: string | null;
  onChange: (next: string | null) => void;
}) {
  if (options.length === 0) return null;

  return (
    <View style={styles.filterRow}>
      <Text style={styles.filterLabel}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterChips}
      >
        <FilterChip
          label="すべて"
          active={active === null}
          onPress={() => onChange(null)}
        />
        {options.map((option) => (
          <FilterChip
            key={option}
            label={option}
            active={active === option}
            onPress={() => onChange(option)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.filterChip, active ? styles.filterChipActive : null]}
    >
      <Text
        numberOfLines={1}
        style={[styles.filterChipText, active ? styles.filterChipTextActive : null]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function buildActions({
  item,
  onClose,
  onMove,
  onDelete,
}: {
  item: InventoryItem;
  onClose: () => void;
  onMove: (status: InventoryStatus) => void;
  onDelete: () => void;
}): SheetAction[] {
  if (item.status === "traded") {
    return [
      {
        id: "close",
        label: "閉じる",
        tone: "muted",
        onPress: onClose,
      },
    ];
  }

  return [
    {
      id: "edit",
      label: "編集する",
      onPress: onClose,
    },
    {
      id: "move",
      label: item.status === "keep" ? "譲る候補へ" : "自分キープへ",
      onPress: () => onMove(item.status === "keep" ? "active" : "keep"),
    },
    {
      id: "delete",
      label: "削除",
      tone: "danger",
      onPress: onDelete,
    },
    {
      id: "close",
      label: "閉じる",
      tone: "muted",
      onPress: onClose,
    },
  ];
}

const styles = StyleSheet.create({
  screenContent: {
    gap: 14,
    paddingHorizontal: 18,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  kicker: {
    color: ihubColors.lavender,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  title: {
    color: ihubColors.ink,
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 30,
  },
  filters: {
    marginHorizontal: -18,
    paddingLeft: 18,
  },
  filterRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginBottom: 6,
  },
  filterLabel: {
    color: ihubColors.mutedInk,
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 0.4,
    textAlign: "right",
    width: 30,
  },
  filterChips: {
    gap: 6,
    paddingRight: 18,
  },
  filterChip: {
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.08)",
    borderRadius: ihubRadii.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  filterChipActive: {
    backgroundColor: ihubColors.lavender,
    borderColor: ihubColors.lavender,
  },
  filterChipText: {
    color: ihubColors.ink,
    fontSize: 11,
    fontWeight: "800",
  },
  filterChipTextActive: {
    color: ihubColors.surface,
  },
  contentHost: {
    flex: 1,
  },
  gridScroll: {
    paddingBottom: 24,
  },
});
