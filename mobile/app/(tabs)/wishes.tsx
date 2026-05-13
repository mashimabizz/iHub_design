import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
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
  SectionTabs,
  type ColumnCount,
  type GoodsGridItem,
  type SheetAction,
} from "../../src/components/GoodsGrid";
import { useAuth } from "../../src/auth/AuthProvider";
import { Screen } from "../../src/components/Screen";
import { supabase } from "../../src/lib/supabase";
import { ihubColors, ihubRadii } from "../../src/theme/tokens";

type WishItem = GoodsGridItem & {
  priority: "最優先" | "優先" | "ゆる募";
  linkedListings: number;
  quantity?: number;
};

type ListingItem = {
  id: string;
  status: "ACTIVE" | "PAUSED";
  haves: ListingGoodsItem[];
  options: ListingOptionItem[];
  give: string[];
  want: string[];
  logic: "すべて" | "1pick";
  hue: string;
};

type ListingGoodsItem = {
  id: string;
  title: string;
  qty: number;
  photoUrl: string | null;
  groupName: string | null;
  characterName: string | null;
  goodsTypeName: string | null;
  hue: string;
};

type ListingOptionItem = {
  id: string;
  position: number;
  logic: "すべて" | "1pick";
  exchangeType: "same_kind" | "cross_kind" | "any";
  isCashOffer: boolean;
  cashAmount: number | null;
  wishes: ListingGoodsItem[];
};

type ListingWishSlot = {
  key: string;
  option: ListingOptionItem;
  wish: ListingGoodsItem | null;
};

type WishRow = {
  id: string;
  title: string;
  quantity: number;
  priority: number | null;
  hue: number | string | null;
  photo_urls: string[] | null;
  group: { name: string | null } | { name: string | null }[] | null;
  character: { name: string | null } | { name: string | null }[] | null;
  goods_type: { name: string | null } | { name: string | null }[] | null;
};

type ListingRow = {
  id: string;
  have_ids: string[] | null;
  have_qtys: number[] | null;
  have_logic: "and" | "or" | null;
  status: "active" | "paused" | "matched" | "closed";
};

type OptionRow = {
  id: string;
  listing_id: string;
  position: number;
  wish_ids: string[] | null;
  wish_qtys: number[] | null;
  logic: "and" | "or" | null;
  exchange_type: "same_kind" | "cross_kind" | "any" | null;
  is_cash_offer: boolean;
  cash_amount: number | null;
};

type InventoryLookupRow = {
  id: string;
  title: string;
  hue: number | string | null;
  photo_urls: string[] | null;
  group: { name: string | null } | { name: string | null }[] | null;
  character: { name: string | null } | { name: string | null }[] | null;
  goods_type: { name: string | null } | { name: string | null }[] | null;
};

type WishData = {
  wishes: WishItem[];
  listings: ListingItem[];
};

type Tab = "wish" | "listings";
const TAB_ORDER: Tab[] = ["wish", "listings"];

const INITIAL_WISHES: WishItem[] = [
  {
    id: "wish-01",
    title: "スア ラキドロ",
    subtitle: "LUMENA / トレカ",
    glyph: "S",
    hue: "#cbbcf4",
    badge: "最優先",
    priority: "最優先",
    linkedListings: 2,
  },
  {
    id: "wish-02",
    title: "ニンニン 制服",
    subtitle: "aespa / アクスタ",
    glyph: "N",
    hue: "#a8d4e6",
    badge: "個別募集 1",
    priority: "優先",
    linkedListings: 1,
  },
  {
    id: "wish-03",
    title: "カリナ 店舗特典",
    subtitle: "aespa / トレカ",
    glyph: "K",
    hue: "#f3c5d4",
    badge: "未紐付け",
    priority: "ゆる募",
    linkedListings: 0,
  },
  {
    id: "wish-04",
    title: "ウィンター 缶バッジ",
    subtitle: "aespa / 缶バッジ",
    glyph: "W",
    hue: "#d5cff4",
    badge: "個別募集 1",
    priority: "優先",
    linkedListings: 1,
  },
  {
    id: "wish-05",
    title: "リノ トレカ",
    subtitle: "SKZ / トレカ",
    glyph: "R",
    hue: "#b7dceb",
    badge: "ゆる募",
    priority: "ゆる募",
    linkedListings: 0,
  },
];

const INITIAL_LISTINGS: ListingItem[] = [
  {
    id: "listing-01",
    status: "ACTIVE",
    haves: [
      previewListingGoods("preview-have-1", "スア 春ver.", "LUMENA", "スア", "トレカ", "#cbbcf4", 1),
      previewListingGoods("preview-have-2", "ジョンウ ラキドロ", "LUMENA", "ジョンウ", "トレカ", "#a8d4e6", 1),
    ],
    options: [
      {
        id: "listing-01-option-1",
        position: 1,
        logic: "1pick",
        exchangeType: "any",
        isCashOffer: false,
        cashAmount: null,
        wishes: [
          previewListingGoods("preview-wish-1", "スア ラキドロ", "LUMENA", "スア", "トレカ", "#f3c5d4", 1),
        ],
      },
    ],
    give: ["スア 春ver.", "ジョンウ ラキドロ"],
    want: ["スア ラキドロ"],
    logic: "1pick",
    hue: "#cbbcf4",
  },
  {
    id: "listing-02",
    status: "ACTIVE",
    haves: [
      previewListingGoods("preview-have-3", "ニンニン アクスタ", "aespa", "ニンニン", "アクスタ", "#a8d4e6", 1),
    ],
    options: [
      {
        id: "listing-02-option-1",
        position: 1,
        logic: "すべて",
        exchangeType: "same_kind",
        isCashOffer: false,
        cashAmount: null,
        wishes: [
          previewListingGoods("preview-wish-2", "ニンニン 制服", "aespa", "ニンニン", "アクスタ", "#f3c5d4", 1),
          previewListingGoods("preview-wish-4", "ウィンター 缶バッジ", "aespa", "ウィンター", "缶バッジ", "#d5cff4", 1),
        ],
      },
    ],
    give: ["ニンニン アクスタ"],
    want: ["ニンニン 制服", "ウィンター 缶バッジ"],
    logic: "すべて",
    hue: "#a8d4e6",
  },
  {
    id: "listing-03",
    status: "PAUSED",
    haves: [
      previewListingGoods("preview-have-4", "カリナ 缶バッジ", "aespa", "カリナ", "缶バッジ", "#f3c5d4", 1),
    ],
    options: [
      {
        id: "listing-03-option-1",
        position: 1,
        logic: "1pick",
        exchangeType: "any",
        isCashOffer: false,
        cashAmount: null,
        wishes: [
          previewListingGoods("preview-wish-3", "カリナ 店舗特典", "aespa", "カリナ", "トレカ", "#cbbcf4", 1),
        ],
      },
    ],
    give: ["カリナ 缶バッジ"],
    want: ["カリナ 店舗特典"],
    logic: "1pick",
    hue: "#f3c5d4",
  },
];

export default function WishesScreen() {
  const { user, previewMode } = useAuth();
  const params = useLocalSearchParams<{
    tab?: Tab | Tab[];
    refresh?: string | string[];
  }>();
  const routeTab = one(params.tab);
  const routeRefresh = one(params.refresh);
  const [tab, setTab] = useState<Tab>(
    routeTab === "listings" ? "listings" : "wish",
  );
  const [columns, setColumns] = useState<ColumnCount>(3);
  const [wishes, setWishes] = useState<WishItem[]>(() =>
    !supabase || previewMode ? INITIAL_WISHES : [],
  );
  const [listings, setListings] = useState<ListingItem[]>(() =>
    !supabase || previewMode ? INITIAL_LISTINGS : [],
  );
  const [selectedWish, setSelectedWish] = useState<WishItem | null>(null);
  const [selectedListing, setSelectedListing] = useState<ListingItem | null>(
    null,
  );
  const [loading, setLoading] = useState(!!supabase && !previewMode);
  const [loadError, setLoadError] = useState<string | null>(null);
  const tabSwipeRef = useRef<{
    startX: number;
    startY: number;
    tracking: boolean;
    swiping: boolean;
  } | null>(null);

  useEffect(() => {
    if (routeTab === "listings" || routeTab === "wish") {
      setTab(routeTab);
    }
  }, [routeTab]);

  useEffect(() => {
    if (!supabase || previewMode) {
      setWishes(INITIAL_WISHES);
      setListings(INITIAL_LISTINGS);
      setLoading(false);
      setLoadError(null);
      return;
    }
    if (!user) {
      setWishes([]);
      setListings([]);
      setLoading(false);
      setLoadError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setLoadError(null);
    fetchWishData(user.id)
      .then((data) => {
        if (!active) return;
        setWishes(data.wishes);
        setListings(data.listings);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setWishes([]);
        setListings([]);
        setLoadError(error instanceof Error ? error.message : "読み込みに失敗しました");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [previewMode, routeRefresh, user]);

  function toggleListingStatus(id: string) {
    const current = listings.find((item) => item.id === id);
    const nextStatus = current?.status === "ACTIVE" ? "paused" : "active";
    setListings((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              status: item.status === "ACTIVE" ? "PAUSED" : "ACTIVE",
            }
          : item,
      ),
    );
    setSelectedListing(null);
    if (supabase && user && !previewMode) {
      supabase
        .from("listings")
        .update({ status: nextStatus })
        .eq("id", id)
        .eq("user_id", user.id)
        .then(({ error }) => {
          if (error) setLoadError(error.message);
        });
    }
  }

  function deleteListing(id: string) {
    setListings((current) => current.filter((item) => item.id !== id));
    setSelectedListing(null);
    if (supabase && user && !previewMode) {
      supabase
        .from("listings")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id)
        .then(({ error }) => {
          if (error) setLoadError(error.message);
        });
    }
  }

  const tabs = useMemo(
    () => [
      {
        id: "wish" as const,
        label: "Wish",
        count: wishes.length,
        color: ihubColors.lavender,
      },
      {
        id: "listings" as const,
        label: "個別募集",
        count: listings.length,
        color: ihubColors.sky,
      },
    ],
    [listings.length, wishes.length],
  );
  const wishGridItems = useMemo(
    () =>
      wishes.map((wish) => ({
        ...wish,
        badge:
          wish.linkedListings === 0
            ? "未紐付け"
            : `募集 ${wish.linkedListings}`,
      })),
    [wishes],
  );

  const wishActions = selectedWish
    ? buildWishActions({
        item: selectedWish,
        onClose: () => setSelectedWish(null),
        onEdit: () => {
          const wish = selectedWish;
          setSelectedWish(null);
          openWishEditor(wish, "edit");
        },
        onListing: () => {
          const wish = selectedWish;
          setSelectedWish(null);
          openListingEditor(null, "create", wish);
        },
        onDelete: () => {
          const wishId = selectedWish.id;
          setWishes((current) =>
            current.filter((item) => item.id !== wishId),
          );
          setSelectedWish(null);
          if (supabase && user && !previewMode) {
            supabase
              .from("goods_inventory")
              .delete()
              .eq("id", wishId)
              .eq("user_id", user.id)
              .then(({ error }) => {
                if (error) setLoadError(error.message);
              });
          }
        },
      })
    : [];

  const listingActions = selectedListing
    ? buildListingActions({
        item: selectedListing,
        onClose: () => setSelectedListing(null),
        onEdit: () => {
          const listing = selectedListing;
          setSelectedListing(null);
          openListingEditor(listing, "edit");
        },
        onToggle: () => toggleListingStatus(selectedListing.id),
        onDelete: () => deleteListing(selectedListing.id),
      })
    : [];

  return (
    <Screen scroll={false} contentStyle={styles.screenContent}>
      <View style={styles.header}>
        <Text style={styles.title}>ウィッシュ</Text>
        <View style={styles.headerActions}>
          {tab === "wish" ? (
            <ColumnSwitcher value={columns} onChange={setColumns} />
          ) : null}
        </View>
      </View>

      <SectionTabs
        value={tab}
        tabs={tabs}
        onChange={(next) => {
          setTab(next);
          setSelectedWish(null);
          setSelectedListing(null);
        }}
      />

      {loading ? <Text style={styles.inlineNotice}>Wishを読み込み中…</Text> : null}
      {loadError ? <Text style={styles.inlineError}>{loadError}</Text> : null}

      <View
        style={styles.contentHost}
        onTouchStart={handleSwipeStart}
        onTouchMove={handleSwipeMove}
        onTouchEnd={handleSwipeEnd}
        onTouchCancel={handleSwipeCancel}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {tab === "wish" ? (
            <GoodsGrid
              items={wishGridItems}
              columns={columns}
              emptyLabel="まだ Wish がありません"
              onPressItem={(gridItem) => {
                const wish = wishes.find((item) => item.id === gridItem.id);
                if (wish) setSelectedWish(wish);
              }}
            />
          ) : (
            <ListingsPanel
              listings={listings}
              onSelect={setSelectedListing}
              onEdit={(listing) => openListingEditor(listing, "edit")}
              onToggle={toggleListingStatus}
              onDelete={deleteListing}
            />
          )}
        </ScrollView>
      </View>

      <FloatingAddButton
        label={tab === "wish" ? "Wishを追加" : "個別募集を追加"}
        onPress={() => {
          if (tab === "wish") {
            openWishEditor(null, "create");
            return;
          }

          openListingEditor(null, "create");
        }}
      />

      <BottomOptionSheet
        visible={!!selectedWish}
        title={selectedWish?.title ?? ""}
        subtitle={selectedWish?.subtitle}
        actions={wishActions}
        onClose={() => setSelectedWish(null)}
      />

      <BottomOptionSheet
        visible={!!selectedListing}
        title="個別募集"
        subtitle={
          selectedListing
            ? `${selectedListing.status === "ACTIVE" ? "ACTIVE" : "一時停止"} / ${selectedListing.logic}`
            : undefined
        }
        actions={listingActions}
        onClose={() => setSelectedListing(null)}
      />
    </Screen>
  );

  function moveTabBySwipe(direction: 1 | -1) {
    const currentIndex = TAB_ORDER.indexOf(tab);
    const next = TAB_ORDER[currentIndex + direction];
    if (!next) return;
    setTab(next);
    setSelectedWish(null);
    setSelectedListing(null);
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

async function fetchWishData(userId: string): Promise<WishData> {
  if (!supabase) {
    return { wishes: INITIAL_WISHES, listings: INITIAL_LISTINGS };
  }
  const [{ data: wishRowsRaw, error: wishError }, { data: listingRowsRaw, error: listingError }] =
    await Promise.all([
      supabase
        .from("goods_inventory")
        .select(
          "id, title, quantity, priority, hue, photo_urls, group:groups_master(name), character:characters_master(name), goods_type:goods_types_master(name)",
        )
        .eq("user_id", userId)
        .eq("kind", "wanted")
        .neq("status", "archived")
        .order("created_at", { ascending: false }),
      supabase
        .from("listings")
        .select("id, have_ids, have_qtys, have_logic, status")
        .eq("user_id", userId)
        .neq("status", "closed")
        .order("created_at", { ascending: false }),
    ]);
  if (wishError) throw wishError;
  if (listingError) throw listingError;

  const wishRows = (wishRowsRaw as WishRow[] | null) ?? [];
  const listingRows = (listingRowsRaw as ListingRow[] | null) ?? [];
  const listingIds = listingRows.map((listing) => listing.id);
  const { data: optionRowsRaw, error: optionError } =
    listingIds.length > 0
      ? await supabase
          .from("listing_wish_options")
          .select("id, listing_id, position, wish_ids, wish_qtys, logic, exchange_type, is_cash_offer, cash_amount")
          .in("listing_id", listingIds)
          .order("position", { ascending: true })
      : { data: [], error: null };
  if (optionError) throw optionError;
  const optionRows = (optionRowsRaw as OptionRow[] | null) ?? [];
  const optionsByListing = new Map<string, OptionRow[]>();
  for (const option of optionRows) {
    const options = optionsByListing.get(option.listing_id) ?? [];
    options.push(option);
    optionsByListing.set(option.listing_id, options);
  }

  const wishIdsInListings = new Map<string, number>();
  for (const option of optionRows) {
    for (const wishId of option.wish_ids ?? []) {
      wishIdsInListings.set(wishId, (wishIdsInListings.get(wishId) ?? 0) + 1);
    }
  }

  const allItemIds = Array.from(
    new Set([
      ...wishRows.map((wish) => wish.id),
      ...listingRows.flatMap((listing) => listing.have_ids ?? []),
      ...optionRows.flatMap((option) => option.wish_ids ?? []),
    ]),
  );
  const { data: inventoryRowsRaw, error: inventoryError } =
    allItemIds.length > 0
      ? await supabase
          .from("goods_inventory")
          .select(
            "id, title, hue, photo_urls, group:groups_master(name), character:characters_master(name), goods_type:goods_types_master(name)",
          )
          .in("id", allItemIds)
      : { data: [], error: null };
  if (inventoryError) throw inventoryError;
  const inventoryById = new Map(
    ((inventoryRowsRaw as InventoryLookupRow[] | null) ?? []).map((item) => [
      item.id,
      item,
    ]),
  );

  return {
    wishes: wishRows.map((wish) =>
      toWishItem(wish, wishIdsInListings.get(wish.id) ?? 0),
    ),
    listings: listingRows.map((listing) =>
      toListingItem(listing, optionsByListing.get(listing.id) ?? [], inventoryById),
    ),
  };
}

function toWishItem(row: WishRow, linkedListings: number): WishItem {
  const groupName = pickName(row.group) ?? "未設定";
  const characterName = pickName(row.character) ?? groupName;
  const goodsType = pickName(row.goods_type) ?? "グッズ";
  const priority = priorityLabel(row.priority);
  return {
    id: row.id,
    title: row.title || `${characterName} ${goodsType}`,
    subtitle: `${groupName} / ${goodsType}`,
    glyph: characterName.slice(0, 1),
    hue: normalizeHue(row.hue, characterName),
    badge: linkedListings > 0 ? `募集 ${linkedListings}` : "未紐付け",
    priority,
    linkedListings,
    quantity: row.quantity,
    photoUrl: row.photo_urls?.[0] ?? null,
  };
}

function toListingItem(
  row: ListingRow,
  options: OptionRow[],
  inventoryById: Map<string, InventoryLookupRow>,
): ListingItem {
  const haves = (row.have_ids ?? []).flatMap((id, index) => {
    const source = inventoryById.get(id);
    return source ? [toListingGoodsItem(source, row.have_qtys?.[index] ?? 1)] : [];
  });
  const optionItems: ListingOptionItem[] = [...options]
    .sort((a, b) => a.position - b.position)
    .map((option) => ({
      id: option.id,
      position: option.position,
      logic: option.logic === "and" ? "すべて" : "1pick" as const,
      exchangeType: option.exchange_type ?? "any",
      isCashOffer: !!option.is_cash_offer,
      cashAmount: option.cash_amount ?? null,
      wishes: (option.wish_ids ?? []).flatMap((id, index) => {
        const source = inventoryById.get(id);
        return source ? [toListingGoodsItem(source, option.wish_qtys?.[index] ?? 1)] : [];
      }),
    }));
  const giveLabels = haves.map((item) => shortItemLabel(item));
  const wantLabels = optionItems.flatMap((option) => {
    if (option.isCashOffer) {
      return [`定価 ${option.cashAmount ?? ""}円`];
    }
    return option.wishes.map(shortItemLabel);
  });
  const seed = giveLabels[0] ?? wantLabels[0] ?? "募集";
  return {
    id: row.id,
    status: row.status === "active" ? "ACTIVE" : "PAUSED",
    haves,
    options: optionItems,
    give: giveLabels.length > 0 ? giveLabels : ["譲る候補"],
    want: wantLabels.length > 0 ? wantLabels : ["求めるもの"],
    logic: row.have_logic === "and" ? "すべて" : "1pick",
    hue: haves[0]?.hue ?? normalizeHue(inventoryById.get(row.have_ids?.[0] ?? "")?.hue, seed),
  };
}

function shortItemLabel(item: ListingGoodsItem) {
  return item.characterName ?? item.groupName ?? item.title;
}

function toListingGoodsItem(row: InventoryLookupRow, qty: number): ListingGoodsItem {
  const groupName = pickName(row.group);
  const characterName = pickName(row.character);
  const goodsTypeName = pickName(row.goods_type);
  const seed = characterName ?? groupName ?? row.title;
  return {
    id: row.id,
    title: row.title,
    qty: Math.max(1, qty || 1),
    photoUrl: row.photo_urls?.[0] ?? null,
    groupName,
    characterName,
    goodsTypeName,
    hue: normalizeHue(row.hue, seed),
  };
}

function previewListingGoods(
  id: string,
  title: string,
  groupName: string,
  characterName: string,
  goodsTypeName: string,
  hue: string,
  qty: number,
): ListingGoodsItem {
  return {
    id,
    title,
    qty,
    photoUrl: null,
    groupName,
    characterName,
    goodsTypeName,
    hue,
  };
}

function priorityLabel(priority: number | null): WishItem["priority"] {
  if (priority != null && priority <= 1) return "最優先";
  if (priority != null && priority >= 4) return "ゆる募";
  return "優先";
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

function one(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function openWishEditor(
  wish: WishItem | null,
  mode: "create" | "edit",
) {
  router.push({
    pathname: "/goods-editor",
    params: {
      kind: "wish",
      mode,
      id: wish?.id ?? "",
      title: wish?.title ?? "",
      subtitle: wish?.subtitle ?? "",
      group: wish?.subtitle.split(" / ")[0] ?? "",
      goodsType: wish?.subtitle.split(" / ")[1] ?? "",
      note: wish?.priority ?? "",
      glyph: wish?.glyph ?? "",
      hue: wish?.hue ?? "#f3c5d4",
      badge:
        wish == null
          ? "NEW"
          : wish.linkedListings === 0
            ? "未紐付け"
            : `募集 ${wish.linkedListings}`,
      quantity: wish?.quantity ? String(wish.quantity) : "1",
    },
  });
}

function openListingEditor(
  listing: ListingItem | null,
  mode: "create" | "edit",
  wish?: WishItem | null,
) {
  router.push({
    pathname: "/listing-editor",
    params: {
      mode,
      id: listing?.id ?? "",
      wishId: wish?.id ?? "",
      status: listing?.status ?? "ACTIVE",
      logic: listing?.logic ?? "1pick",
      give: listing?.give.join("、") ?? "",
      want: listing?.want.join("、") ?? wish?.title ?? "",
    },
  });
}

function ListingsPanel({
  listings,
  onSelect,
  onEdit,
  onToggle,
  onDelete,
}: {
  listings: ListingItem[];
  onSelect: (listing: ListingItem) => void;
  onEdit: (listing: ListingItem) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (listings.length === 0) {
    return (
      <View style={styles.listingEmpty}>
        <Text style={styles.listingEmptyText}>まだ個別募集がありません</Text>
      </View>
    );
  }

  return (
    <View style={styles.listingsHost}>
      <ListingDeck
        listings={listings}
        onSelect={onSelect}
        onEdit={onEdit}
        onToggle={onToggle}
        onDelete={onDelete}
      />
      <View style={styles.listingList}>
        {listings.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            onPress={() => onSelect(listing)}
            onEdit={() => onEdit(listing)}
            onToggle={() => onToggle(listing.id)}
            onDelete={() => onDelete(listing.id)}
          />
        ))}
      </View>
    </View>
  );
}

function ListingDeck({
  listings,
  onSelect,
  onEdit,
  onToggle,
  onDelete,
}: {
  listings: ListingItem[];
  onSelect: (listing: ListingItem) => void;
  onEdit: (listing: ListingItem) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <View style={styles.deckSection}>
      <View style={styles.deckHeader}>
        <Text style={styles.deckTitle}>募集デッキ</Text>
        <Text style={styles.deckCount}>{listings.length}件</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToAlignment="center"
        decelerationRate="fast"
        contentContainerStyle={styles.deckScroller}
      >
        {listings.map((listing) => (
          <ListingDeckCard
            key={listing.id}
            listing={listing}
            onPress={() => onSelect(listing)}
            onEdit={() => onEdit(listing)}
            onToggle={() => onToggle(listing.id)}
            onDelete={() => onDelete(listing.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function ListingDeckCard({
  listing,
  onPress,
  onEdit,
  onToggle,
  onDelete,
}: {
  listing: ListingItem;
  onPress: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const slots = getListingWishSlots(listing);
  return (
    <Pressable onPress={onPress} style={styles.deckCard}>
      <View style={styles.deckCardGlowPink} />
      <View style={styles.deckCardGlowSky} />
      <View style={styles.deckTop}>
        <StatusBadge status={listing.status} />
        <Text numberOfLines={1} style={styles.deckMeta}>
          {listing.logic}
        </Text>
        <View style={styles.listingActions}>
          <MiniIcon label="E" onPress={onEdit} />
          <MiniIcon
            label={listing.status === "ACTIVE" ? "II" : "ON"}
            onPress={onToggle}
          />
          <MiniIcon label="D" danger onPress={onDelete} />
        </View>
      </View>

      <View style={styles.deckBodyRich}>
        <DeckGoodsStack label="譲る" items={listing.haves} accent={ihubColors.sky} />
        <View style={styles.deckCord}>
          <View style={styles.deckCordLine} />
          <View style={styles.deckKnot}>
            <Text style={styles.deckKnotText}>∿</Text>
          </View>
        </View>
        <DeckWishCluster slots={slots} />
      </View>
    </Pressable>
  );
}

function StatusBadge({ status }: { status: ListingItem["status"] }) {
  const active = status === "ACTIVE";
  return (
    <View style={[styles.statusBadge, active ? styles.statusBadgeActive : null]}>
      <Text style={[styles.statusBadgeText, active ? styles.statusBadgeTextActive : null]}>
        {active ? "ACTIVE" : "一時停止"}
      </Text>
    </View>
  );
}

function getListingWishSlots(listing: ListingItem): ListingWishSlot[] {
  return [...listing.options]
    .sort((a, b) => a.position - b.position)
    .flatMap<ListingWishSlot>((option) => {
      if (option.isCashOffer) {
        return [{ key: `${option.id}:cash`, option, wish: null }];
      }
      return option.wishes.map((wish) => ({
        key: `${option.id}:${wish.id}`,
        option,
        wish,
      }));
    });
}

function DeckGoodsStack({
  label,
  items,
  accent,
}: {
  label: string;
  items: ListingGoodsItem[];
  accent: string;
}) {
  const visible = items.slice(0, 3);
  return (
    <View style={styles.deckSide}>
      <Text style={styles.deckSideLabel}>{label}</Text>
      <View style={styles.deckPhotoStack}>
        {visible.map((item, index) => (
          <View key={item.id} style={[styles.deckPhotoLayer, { marginLeft: index === 0 ? 0 : -18, marginTop: index * 8 }]}>
            <DeckGoodsVisual item={item} size={78 - index * 7} accent={accent} />
          </View>
        ))}
        {items.length === 0 ? <DeckEmptyVisual label="譲" size={78} /> : null}
        {items.length > visible.length ? (
          <View style={styles.deckMorePhoto}>
            <Text style={styles.deckMoreText}>+{items.length - visible.length}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function DeckWishCluster({ slots }: { slots: ListingWishSlot[] }) {
  const visible = slots.slice(0, 4);
  return (
    <View style={styles.deckSide}>
      <Text style={styles.deckSideLabel}>求める</Text>
      <View style={styles.deckWishCluster}>
        {visible.map((slot, index) => (
          <View
            key={slot.key}
            style={[
              styles.deckWishNode,
              {
                left: index % 2 === 0 ? 0 : 52,
                top: index < 2 ? 0 : 58,
              },
            ]}
          >
            {slot.option.isCashOffer ? (
              <DeckCashVisual amount={slot.option.cashAmount} size={64} />
            ) : slot.wish ? (
              <DeckGoodsVisual item={slot.wish} size={64} accent={ihubColors.pink} />
            ) : (
              <DeckEmptyVisual label="求" size={64} />
            )}
          </View>
        ))}
        {slots.length === 0 ? <DeckEmptyVisual label="求" size={72} /> : null}
        {slots.length > visible.length ? (
          <View style={styles.deckWishMore}>
            <Text style={styles.deckMoreText}>+{slots.length - visible.length}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function DeckGoodsVisual({
  item,
  size,
  accent,
}: {
  item: ListingGoodsItem;
  size: number;
  accent: string;
}) {
  const glyph = shortItemLabel(item).slice(0, 1) || "?";
  return (
    <View
      style={[
        styles.deckGoodsVisual,
        {
          borderColor: accent,
          height: size,
          width: size,
          borderRadius: size >= 76 ? 18 : 14,
          backgroundColor: item.photoUrl ? ihubColors.surface : item.hue,
        },
      ]}
    >
      {item.photoUrl ? (
        <Image source={{ uri: item.photoUrl }} resizeMode="cover" style={styles.deckGoodsImage} />
      ) : (
        <Text style={[styles.deckGoodsGlyph, { fontSize: Math.max(18, size * 0.34) }]}>
          {glyph}
        </Text>
      )}
      <View style={styles.deckQtyBadge}>
        <Text style={styles.deckQtyText}>×{item.qty}</Text>
      </View>
    </View>
  );
}

function DeckCashVisual({
  amount,
  size,
}: {
  amount: number | null;
  size: number;
}) {
  return (
    <View style={[styles.deckCashVisual, { height: size, width: size }]}>
      <Text style={styles.deckCashSymbol}>¥</Text>
      <Text numberOfLines={1} style={styles.deckCashText}>
        {amount?.toLocaleString() ?? "相談"}
      </Text>
    </View>
  );
}

function DeckEmptyVisual({ label, size }: { label: string; size: number }) {
  return (
    <View style={[styles.deckEmptyVisual, { height: size, width: size }]}>
      <Text style={styles.deckEmptyText}>{label}</Text>
    </View>
  );
}

function ListingCard({
  listing,
  onPress,
  onEdit,
  onToggle,
  onDelete,
}: {
  listing: ListingItem;
  onPress: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.listingCard}>
      <View style={styles.listingTop}>
        <StatusBadge status={listing.status} />
        <View style={styles.listingTopText}>
          <Text style={styles.listingTitle}>
            {listing.status === "ACTIVE" ? "ACTIVE" : "PAUSED"}
          </Text>
          <Text style={styles.listingSub}>{listing.logic}</Text>
        </View>
        <View style={styles.listingActions}>
          <MiniIcon label="E" onPress={onEdit} />
          <MiniIcon
            label={listing.status === "ACTIVE" ? "II" : "ON"}
            onPress={onToggle}
          />
          <MiniIcon label="D" danger onPress={onDelete} />
        </View>
      </View>

      <View style={styles.tradeLine}>
        <TradeSide
          label="譲"
          items={listing.haves}
          values={listing.give}
          hue={listing.hue}
          logic={listing.logic}
        />
        <View style={styles.tradeConnector}>
          <View style={styles.tradeConnectorDot} />
          <View style={styles.tradeConnectorLine} />
          <View style={styles.tradeConnectorDot} />
        </View>
        <TradeSide
          label="求"
          items={getListingWishSlots(listing).flatMap((slot) => (slot.wish ? [slot.wish] : []))}
          values={listing.want}
          hue="#f3c5d4"
          logic={listing.logic}
          right
        />
      </View>
    </Pressable>
  );
}

function MiniIcon({
  label,
  danger,
  onPress,
}: {
  label: string;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={(event) => {
        event.stopPropagation();
        onPress();
      }}
      style={[
        styles.miniIcon,
        danger ? styles.miniIconDanger : styles.miniIconDefault,
      ]}
    >
      <Text
        style={[
          styles.miniIconText,
          danger ? styles.miniIconTextDanger : styles.miniIconTextDefault,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function TradeSide({
  label,
  items,
  values,
  hue,
  logic,
  right,
}: {
  label: string;
  items: ListingGoodsItem[];
  values: string[];
  hue: string;
  logic: ListingItem["logic"];
  right?: boolean;
}) {
  const multi = values.length > 1;
  return (
    <View style={styles.tradeSide}>
      <Text style={[styles.tradeSideLabel, right ? styles.tradeSideRight : null]}>
        {label}
      </Text>
      <View
        style={[
          multi ? styles.tradeOptionFrame : styles.tradeSingleFrame,
          right ? styles.tradeOptionRight : null,
        ]}
      >
        {multi ? (
          <View style={[styles.logicTag, right ? styles.logicTagRight : null]}>
            <Text style={styles.logicTagText}>{logic}</Text>
          </View>
        ) : null}
        <View
          style={[
            styles.tradeItems,
            right ? styles.tradeItemsRight : styles.tradeItemsLeft,
          ]}
        >
          {items.length > 0
            ? items.slice(0, 3).map((item) => (
                <DeckGoodsVisual
                  key={item.id}
                  item={item}
                  size={38}
                  accent={right ? ihubColors.pink : ihubColors.sky}
                />
              ))
            : values.slice(0, 3).map((value, index) => (
            <View
              key={`${value}-${index}`}
              style={[styles.tradeMiniItem, { backgroundColor: hue }]}
            >
              <Text style={styles.tradeMiniText}>{value[0] ?? "?"}</Text>
            </View>
          ))}
          {values.length > 3 ? (
            <View style={styles.tradeOverflow}>
              <Text style={styles.tradeOverflowText}>+{values.length - 3}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function buildWishActions({
  item,
  onClose,
  onEdit,
  onListing,
  onDelete,
}: {
  item: WishItem;
  onClose: () => void;
  onEdit: () => void;
  onListing: () => void;
  onDelete: () => void;
}): SheetAction[] {
  return [
    {
      id: "edit",
      label: "編集する",
      onPress: onEdit,
    },
    {
      id: "listing",
      label: item.linkedListings > 0 ? "+ 個別募集を追加" : "個別募集を作る",
      onPress: onListing,
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

function buildListingActions({
  item,
  onClose,
  onEdit,
  onToggle,
  onDelete,
}: {
  item: ListingItem;
  onClose: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}): SheetAction[] {
  return [
    {
      id: "edit",
      label: "編集する",
      onPress: onEdit,
    },
    {
      id: "toggle",
      label: item.status === "ACTIVE" ? "一時停止" : "再開する",
      onPress: onToggle,
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
    minHeight: 56,
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
    minWidth: 92,
    justifyContent: "flex-end",
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
  contentHost: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  listingsHost: {
    gap: 14,
  },
  listingEmpty: {
    alignItems: "center",
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.08)",
    borderRadius: ihubRadii.lg,
    borderStyle: "dashed",
    borderWidth: 1,
    justifyContent: "center",
    paddingVertical: 38,
  },
  listingEmptyText: {
    color: ihubColors.mutedInk,
    fontSize: 12,
    fontWeight: "800",
  },
  deckSection: {
    marginHorizontal: -18,
  },
  deckHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
  },
  deckTitle: {
    color: ihubColors.ink,
    fontSize: 13,
    fontWeight: "900",
  },
  deckCount: {
    backgroundColor: "rgba(58,50,74,0.04)",
    borderRadius: ihubRadii.pill,
    color: ihubColors.mutedInk,
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  deckScroller: {
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 4,
  },
  deckCard: {
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(166,149,216,0.34)",
    borderRadius: 22,
    borderWidth: 1,
    minHeight: 246,
    overflow: "hidden",
    padding: 13,
    shadowColor: ihubColors.ink,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.13,
    shadowRadius: 26,
    width: 306,
  },
  deckCardGlowPink: {
    backgroundColor: "rgba(243,197,212,0.34)",
    borderRadius: 999,
    height: 136,
    position: "absolute",
    right: -52,
    top: -36,
    width: 136,
  },
  deckCardGlowSky: {
    backgroundColor: "rgba(168,212,230,0.28)",
    borderRadius: 999,
    bottom: -42,
    height: 142,
    left: -46,
    position: "absolute",
    width: 142,
  },
  deckTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  deckMeta: {
    color: ihubColors.mutedInk,
    flex: 1,
    fontSize: 10.5,
    fontWeight: "900",
  },
  deckBody: {
    alignItems: "center",
    flexDirection: "row",
    flex: 1,
    justifyContent: "space-between",
    marginTop: 14,
  },
  deckBodyRich: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    minHeight: 166,
  },
  deckSide: {
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  deckSideLabel: {
    backgroundColor: "rgba(255,255,255,0.78)",
    borderRadius: ihubRadii.pill,
    color: ihubColors.mutedInk,
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  deckBubbles: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    minHeight: 118,
    width: "100%",
  },
  deckPhotoStack: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    minHeight: 122,
    width: "100%",
  },
  deckPhotoLayer: {
    shadowColor: ihubColors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
  },
  deckMorePhoto: {
    alignItems: "center",
    backgroundColor: "rgba(58,50,74,0.78)",
    borderRadius: ihubRadii.pill,
    bottom: 10,
    height: 26,
    justifyContent: "center",
    position: "absolute",
    right: 5,
    width: 38,
  },
  deckWishCluster: {
    height: 126,
    position: "relative",
    width: 118,
  },
  deckWishNode: {
    position: "absolute",
  },
  deckWishMore: {
    alignItems: "center",
    backgroundColor: "rgba(58,50,74,0.78)",
    borderRadius: ihubRadii.pill,
    bottom: 0,
    height: 26,
    justifyContent: "center",
    position: "absolute",
    right: 2,
    width: 38,
  },
  deckGoodsVisual: {
    alignItems: "center",
    borderWidth: 2,
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: ihubColors.ink,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.15,
    shadowRadius: 13,
  },
  deckGoodsImage: {
    height: "100%",
    width: "100%",
  },
  deckGoodsGlyph: {
    color: ihubColors.surface,
    fontWeight: "900",
    textShadowColor: "rgba(58,50,74,0.24)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  deckQtyBadge: {
    backgroundColor: "rgba(58,50,74,0.68)",
    borderBottomLeftRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    position: "absolute",
    right: 0,
    top: 0,
  },
  deckQtyText: {
    color: ihubColors.surface,
    fontSize: 9,
    fontWeight: "900",
  },
  deckCashVisual: {
    alignItems: "center",
    backgroundColor: "rgba(122,154,138,0.12)",
    borderColor: "rgba(122,154,138,0.34)",
    borderRadius: 15,
    borderWidth: 1,
    justifyContent: "center",
    overflow: "hidden",
  },
  deckCashSymbol: {
    color: ihubColors.ink,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 24,
  },
  deckCashText: {
    color: ihubColors.mutedInk,
    fontSize: 9,
    fontWeight: "900",
    maxWidth: "82%",
  },
  deckEmptyVisual: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.70)",
    borderColor: "rgba(58,50,74,0.16)",
    borderRadius: 15,
    borderStyle: "dashed",
    borderWidth: 1,
    justifyContent: "center",
  },
  deckEmptyText: {
    color: "rgba(58,50,74,0.45)",
    fontSize: 12,
    fontWeight: "900",
  },
  deckBubble: {
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.92)",
    borderRadius: 18,
    borderWidth: 2,
    height: 96,
    justifyContent: "center",
    marginHorizontal: -18,
    shadowColor: ihubColors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    width: 72,
  },
  deckBubbleText: {
    color: ihubColors.surface,
    fontSize: 25,
    fontWeight: "900",
    textShadowColor: "rgba(58,50,74,0.22)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  deckMore: {
    alignItems: "center",
    backgroundColor: "rgba(58,50,74,0.76)",
    borderRadius: ihubRadii.pill,
    bottom: 8,
    height: 28,
    justifyContent: "center",
    position: "absolute",
    right: 12,
    width: 40,
  },
  deckMoreText: {
    color: ihubColors.surface,
    fontSize: 11,
    fontWeight: "900",
  },
  deckCord: {
    alignItems: "center",
    height: 92,
    justifyContent: "center",
    width: 48,
  },
  deckCordLine: {
    backgroundColor: "rgba(166,149,216,0.34)",
    height: 2,
    position: "absolute",
    width: 62,
  },
  deckKnot: {
    alignItems: "center",
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(166,149,216,0.44)",
    borderRadius: ihubRadii.pill,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    shadowColor: ihubColors.lavender,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    width: 32,
  },
  deckKnotText: {
    color: ihubColors.lavender,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 22,
  },
  listingList: {
    gap: 12,
  },
  listingCard: {
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.08)",
    borderRadius: ihubRadii.lg,
    borderWidth: 1,
    padding: 13,
    shadowColor: ihubColors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  listingTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
  },
  listingTopText: {
    flex: 1,
  },
  listingTitle: {
    color: ihubColors.ink,
    fontSize: 12.5,
    fontWeight: "900",
  },
  listingSub: {
    color: ihubColors.mutedInk,
    fontSize: 10,
    fontWeight: "800",
    marginTop: 2,
  },
  listingActions: {
    flexDirection: "row",
    gap: 5,
  },
  statusBadge: {
    alignItems: "center",
    backgroundColor: "rgba(58,50,74,0.08)",
    borderRadius: ihubRadii.pill,
    justifyContent: "center",
    minWidth: 52,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusBadgeActive: {
    backgroundColor: ihubColors.ok,
  },
  statusBadgeText: {
    color: ihubColors.mutedInk,
    fontSize: 9.5,
    fontWeight: "900",
  },
  statusBadgeTextActive: {
    color: ihubColors.surface,
  },
  miniIcon: {
    alignItems: "center",
    borderRadius: 12,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  miniIconDefault: {
    backgroundColor: "rgba(58,50,74,0.06)",
  },
  miniIconDanger: {
    backgroundColor: "rgba(217,130,107,0.12)",
  },
  miniIconText: {
    fontSize: 10,
    fontWeight: "900",
  },
  miniIconTextDefault: {
    color: ihubColors.ink,
  },
  miniIconTextDanger: {
    color: ihubColors.warn,
  },
  tradeLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
    marginTop: 13,
  },
  tradeSide: {
    flex: 1,
  },
  tradeSideLabel: {
    color: ihubColors.mutedInk,
    fontSize: 10,
    fontWeight: "900",
    marginBottom: 6,
  },
  tradeSideRight: {
    textAlign: "right",
  },
  tradeItems: {
    flexDirection: "row",
    gap: 5,
  },
  tradeSingleFrame: {
    minHeight: 42,
  },
  tradeOptionFrame: {
    borderColor: "rgba(166,149,216,0.20)",
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 58,
    paddingHorizontal: 6,
    paddingBottom: 6,
    paddingTop: 15,
  },
  tradeOptionRight: {
    borderColor: "rgba(243,197,212,0.34)",
  },
  tradeItemsLeft: {
    justifyContent: "flex-start",
  },
  tradeItemsRight: {
    justifyContent: "flex-end",
  },
  tradeMiniItem: {
    alignItems: "center",
    borderRadius: 8,
    height: 46,
    justifyContent: "center",
    width: 36,
  },
  tradeMiniText: {
    color: ihubColors.surface,
    fontSize: 16,
    fontWeight: "900",
  },
  tradeOverflow: {
    alignItems: "center",
    backgroundColor: "rgba(58,50,74,0.08)",
    borderRadius: 8,
    height: 46,
    justifyContent: "center",
    width: 36,
  },
  tradeOverflowText: {
    color: ihubColors.mutedInk,
    fontSize: 11,
    fontWeight: "900",
  },
  logicTag: {
    backgroundColor: ihubColors.lavender,
    borderRadius: ihubRadii.pill,
    left: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    position: "absolute",
    top: -8,
    zIndex: 1,
  },
  logicTagRight: {
    left: undefined,
    right: 6,
  },
  logicTagText: {
    color: ihubColors.surface,
    fontSize: 9,
    fontWeight: "900",
  },
  tradeConnector: {
    alignItems: "center",
    width: 28,
  },
  tradeConnectorDot: {
    backgroundColor: ihubColors.lavender,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  tradeConnectorLine: {
    backgroundColor: "rgba(166,149,216,0.38)",
    height: 1.5,
    width: 28,
  },
});
