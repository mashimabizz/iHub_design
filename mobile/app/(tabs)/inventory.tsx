import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  BottomOptionSheet,
  ColumnSwitcher,
  GoodsGrid,
  type ColumnCount,
  type GoodsGridItem,
  type SheetAction,
  SectionTabs,
} from "../../src/components/GoodsGrid";
import { useAuth } from "../../src/auth/AuthProvider";
import { Screen } from "../../src/components/Screen";
import { supabase } from "../../src/lib/supabase";
import { ihubColors, ihubRadii } from "../../src/theme/tokens";

type InventoryStatus = "active" | "keep" | "traded";

type InventoryItem = GoodsGridItem & {
  status: InventoryStatus;
  group: string;
  type: string;
  quantity?: number;
};

type InventoryRow = {
  id: string;
  title: string;
  quantity: number;
  status: "active" | "keep" | "traded" | "reserved" | "archived";
  hue: number | string | null;
  photo_urls: string[] | null;
  group: { name: string | null } | { name: string | null }[] | null;
  character: { name: string | null } | { name: string | null }[] | null;
  character_request:
    | { requested_name: string | null; status: string | null }
    | { requested_name: string | null; status: string | null }[]
    | null;
  goods_type: { name: string | null } | { name: string | null }[] | null;
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
  const { user, previewMode } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>(INITIAL_ITEMS);
  const [status, setStatus] = useState<InventoryStatus>("active");
  const [columns, setColumns] = useState<ColumnCount>(3);
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const pagerRef = useRef<ScrollView>(null);
  const { width: windowWidth } = useWindowDimensions();
  const pageWidth = Math.max(1, windowWidth - 36);

  useEffect(() => {
    if (!supabase || !user || previewMode) {
      setItems(INITIAL_ITEMS);
      setLoadError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setLoadError(null);
    fetchInventoryItems(user.id)
      .then((next) => {
        if (active) setItems(next);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setItems(INITIAL_ITEMS);
        setLoadError(error instanceof Error ? error.message : "読み込みに失敗しました");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [previewMode, user]);

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
  const itemsByStatus = useMemo(
    () =>
      filteredItems.reduce<Record<InventoryStatus, InventoryItem[]>>(
        (acc, item) => {
          acc[item.status].push(item);
          return acc;
        },
        { active: [], keep: [], traded: [] },
      ),
    [filteredItems],
  );
  const counts = useMemo(
    () => ({
      active: itemsByStatus.active.length,
      keep: itemsByStatus.keep.length,
      traded: itemsByStatus.traded.length,
    }),
    [itemsByStatus],
  );
  const tabs = STATUS_TABS.map((tab) => ({
    ...tab,
    count: counts[tab.id],
  }));
  const selectedActions = selected
    ? buildActions({
        item: selected,
        onClose: () => setSelected(null),
        onEdit: () => {
          const item = selected;
          setSelected(null);
          openInventoryEditor(item, "edit");
        },
        onMove: (nextStatus) => {
          const itemId = selected.id;
          setItems((current) =>
            current.map((item) =>
              item.id === itemId
                ? {
                    ...item,
                    status: nextStatus,
                    badge: nextStatus === "active" ? "譲る候補" : "キープ",
                  }
                : item,
            ),
          );
          setSelected(null);
          if (supabase && user && !previewMode) {
            supabase
              .from("goods_inventory")
              .update({ status: nextStatus })
              .eq("id", itemId)
              .eq("user_id", user.id)
              .then(({ error }) => {
                if (error) setLoadError(error.message);
              });
          }
        },
        onDelete: () => {
          const itemId = selected.id;
          setItems((current) =>
            current.filter((item) => item.id !== itemId),
          );
          setSelected(null);
          if (supabase && user && !previewMode) {
            supabase
              .from("goods_inventory")
              .delete()
              .eq("id", itemId)
              .eq("user_id", user.id)
              .then(({ error }) => {
                if (error) setLoadError(error.message);
              });
          }
        },
      })
    : [];

  return (
    <Screen scroll={false} contentStyle={styles.screenContent}>
      <View style={styles.header}>
        <Text style={styles.title}>マイ在庫</Text>
        <View style={styles.headerActions}>
          <ColumnSwitcher value={columns} onChange={setColumns} />
          <HeaderIconButton label="フィルタ" glyph="≡" />
          <HeaderIconButton label="検索" glyph="⌕" />
        </View>
      </View>

      <SectionTabs
        value={status}
        tabs={tabs}
        onChange={selectStatus}
      />

      {loading ? <Text style={styles.inlineNotice}>在庫を読み込み中…</Text> : null}
      {loadError ? <Text style={styles.inlineError}>{loadError}</Text> : null}

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

      <View style={styles.contentHost}>
        <ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          directionalLockEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          style={styles.pager}
          onMomentumScrollEnd={handlePagerSettled}
        >
          {STATUS_ORDER.map((pageStatus) => renderInventoryPage(pageStatus))}
        </ScrollView>
      </View>

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

  function selectStatus(next: InventoryStatus) {
    const nextIndex = STATUS_ORDER.indexOf(next);
    if (nextIndex < 0) return;
    setStatus(next);
    setSelected(null);
    pagerRef.current?.scrollTo({ x: nextIndex * pageWidth, animated: true });
  }

  function handlePagerSettled(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const nextIndex = Math.max(
      0,
      Math.min(
        STATUS_ORDER.length - 1,
        Math.round(event.nativeEvent.contentOffset.x / pageWidth),
      ),
    );
    const next = STATUS_ORDER[nextIndex];
    if (!next || next === status) return;
    setStatus(next);
    setSelected(null);
  }

  function renderInventoryPage(pageStatus: InventoryStatus) {
    return (
      <View key={pageStatus} style={[styles.pagerPage, { width: pageWidth }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.gridScroll}
        >
          <GoodsGrid
            items={itemsByStatus[pageStatus]}
            columns={columns}
            addTileLabel={pageStatus === "active" ? "追加" : undefined}
            onPressAddTile={
              pageStatus === "active"
                ? () => openInventoryEditor(null, "create")
                : undefined
            }
            emptyLabel={
              pageStatus === "active"
                ? "譲る候補のグッズはまだありません"
                : pageStatus === "keep"
                  ? "自分用キープのグッズはまだありません"
                  : "過去に譲ったグッズはまだありません"
            }
            onPressItem={(gridItem) => {
              const item = items.find((current) => current.id === gridItem.id);
              if (!item) return;
              if (item.status === "traded") {
                openInventoryEditor(item, "readonly");
                return;
              }
              setSelected(item);
            }}
          />
        </ScrollView>
      </View>
    );
  }
}

async function fetchInventoryItems(userId: string): Promise<InventoryItem[]> {
  if (!supabase) return INITIAL_ITEMS;
  const { data, error } = await supabase
    .from("goods_inventory")
    .select(
      "id, title, quantity, status, hue, photo_urls, group:groups_master(name), character:characters_master(name), character_request:character_requests(requested_name, status), goods_type:goods_types_master(name)",
    )
    .eq("user_id", userId)
    .eq("kind", "for_trade")
    .neq("status", "archived")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data as InventoryRow[] | null) ?? []).map(toInventoryItem);
}

function toInventoryItem(row: InventoryRow): InventoryItem {
  const groupName = pickName(row.group) ?? "未設定";
  const characterName =
    pickName(row.character) ??
    pickRequestName(row.character_request) ??
    groupName;
  const goodsType = pickName(row.goods_type) ?? "グッズ";
  const status = normalizeInventoryStatus(row.status);
  return {
    id: row.id,
    title: row.title || `${characterName} ${goodsType}`,
    subtitle: `${groupName} / ${goodsType}`,
    glyph: characterName.slice(0, 1),
    hue: normalizeHue(row.hue, characterName),
    badge:
      status === "traded"
        ? "譲渡済"
        : status === "keep"
          ? "キープ"
          : row.quantity > 1
            ? `残 ${row.quantity}`
            : "譲る候補",
    note: row.quantity > 1 ? `交換可能数 ${row.quantity}` : undefined,
    status,
    group: groupName,
    type: goodsType,
    quantity: row.quantity,
    photoUrl: row.photo_urls?.[0] ?? null,
  };
}

function normalizeInventoryStatus(status: InventoryRow["status"]): InventoryStatus {
  if (status === "traded") return "traded";
  if (status === "active") return "active";
  return "keep";
}

function pickName(
  value:
    | { name: string | null }
    | { name: string | null }[]
    | null
    | undefined,
) {
  if (!value) return null;
  return Array.isArray(value) ? value[0]?.name ?? null : value.name;
}

function pickRequestName(
  value:
    | { requested_name: string | null; status: string | null }
    | { requested_name: string | null; status: string | null }[]
    | null
    | undefined,
) {
  if (!value) return null;
  const request = Array.isArray(value) ? value[0] : value;
  return request?.requested_name ?? null;
}

function normalizeHue(value: number | string | null | undefined, seed: string) {
  if (typeof value === "number") return `hsl(${value}, 62%, 78%)`;
  if (typeof value === "string" && value.trim()) {
    return value.startsWith("#") || value.startsWith("hsl")
      ? value
      : `hsl(${Number(value) || nameToHue(seed)}, 62%, 78%)`;
  }
  return `hsl(${nameToHue(seed)}, 62%, 78%)`;
}

function nameToHue(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 360;
}

function HeaderIconButton({ label, glyph }: { label: string; glyph: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.headerIconButton}
    >
      <Text style={styles.headerIconText}>{glyph}</Text>
    </Pressable>
  );
}

function openInventoryEditor(
  item: InventoryItem | null,
  mode: "create" | "edit" | "readonly",
) {
  router.push({
    pathname: "/goods-editor",
    params: {
      kind: "inventory",
      mode,
      title: item?.title ?? "",
      subtitle: item?.subtitle ?? "",
      group: item?.group ?? "",
      goodsType: item?.type ?? "",
      note: item?.note ?? "",
      glyph: item?.glyph ?? "",
      hue: item?.hue ?? "#cbbcf4",
      badge: item?.badge ?? (mode === "create" ? "NEW" : "譲る候補"),
      quantity: item?.badge?.match(/\d+/)?.[0] ?? "1",
    },
  });
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
  onEdit,
  onMove,
  onDelete,
}: {
  item: InventoryItem;
  onClose: () => void;
  onEdit: () => void;
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
      onPress: onEdit,
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
    gap: 12,
    paddingHorizontal: 18,
  },
  header: {
    alignItems: "center",
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.08)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: -2,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  title: {
    color: ihubColors.ink,
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 24,
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  headerIconButton: {
    alignItems: "center",
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.08)",
    borderRadius: 10,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  headerIconText: {
    color: ihubColors.ink,
    fontSize: 12,
    fontWeight: "900",
  },
  inlineNotice: {
    color: ihubColors.mutedInk,
    fontSize: 11.5,
    fontWeight: "800",
  },
  inlineError: {
    color: ihubColors.warn,
    fontSize: 11.5,
    fontWeight: "800",
    lineHeight: 17,
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
  pager: {
    flex: 1,
  },
  pagerPage: {
    flex: 1,
  },
  gridScroll: {
    paddingBottom: 24,
  },
});
