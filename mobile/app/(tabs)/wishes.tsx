import { router } from "expo-router";
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
  SectionTabs,
  type ColumnCount,
  type GoodsGridItem,
  type SheetAction,
} from "../../src/components/GoodsGrid";
import { Screen } from "../../src/components/Screen";
import { ihubColors, ihubRadii } from "../../src/theme/tokens";

type WishItem = GoodsGridItem & {
  priority: "最優先" | "優先" | "ゆる募";
  linkedListings: number;
};

type ListingItem = {
  id: string;
  status: "ACTIVE" | "PAUSED";
  give: string[];
  want: string[];
  logic: "すべて" | "1pick";
  hue: string;
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
    give: ["スア 春ver.", "ジョンウ ラキドロ"],
    want: ["スア ラキドロ"],
    logic: "1pick",
    hue: "#cbbcf4",
  },
  {
    id: "listing-02",
    status: "ACTIVE",
    give: ["ニンニン アクスタ"],
    want: ["ニンニン 制服", "ウィンター 缶バッジ"],
    logic: "すべて",
    hue: "#a8d4e6",
  },
  {
    id: "listing-03",
    status: "PAUSED",
    give: ["カリナ 缶バッジ"],
    want: ["カリナ 店舗特典"],
    logic: "1pick",
    hue: "#f3c5d4",
  },
];

export default function WishesScreen() {
  const [tab, setTab] = useState<Tab>("wish");
  const [columns, setColumns] = useState<ColumnCount>(3);
  const [wishes, setWishes] = useState<WishItem[]>(INITIAL_WISHES);
  const [listings, setListings] = useState<ListingItem[]>(INITIAL_LISTINGS);
  const [selectedWish, setSelectedWish] = useState<WishItem | null>(null);
  const [selectedListing, setSelectedListing] = useState<ListingItem | null>(
    null,
  );
  const tabSwipeRef = useRef<{
    startX: number;
    startY: number;
    tracking: boolean;
    swiping: boolean;
  } | null>(null);

  function toggleListingStatus(id: string) {
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
  }

  function deleteListing(id: string) {
    setListings((current) => current.filter((item) => item.id !== id));
    setSelectedListing(null);
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
          setWishes((current) =>
            current.filter((item) => item.id !== selectedWish.id),
          );
          setSelectedWish(null);
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
        <View>
          <Text style={styles.kicker}>WISH</Text>
          <Text style={styles.title}>ウィッシュ</Text>
        </View>
        {tab === "wish" ? (
          <ColumnSwitcher value={columns} onChange={setColumns} />
        ) : null}
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

function openWishEditor(
  wish: WishItem | null,
  mode: "create" | "edit",
) {
  router.push({
    pathname: "/goods-editor",
    params: {
      kind: "wish",
      mode,
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
      quantity: "1",
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

      <View style={styles.deckBody}>
        <DeckSide label="譲る" values={listing.give} hue={listing.hue} />
        <View style={styles.deckCord}>
          <View style={styles.deckCordLine} />
          <View style={styles.deckKnot}>
            <Text style={styles.deckKnotText}>∿</Text>
          </View>
        </View>
        <DeckSide label="求める" values={listing.want} hue="#f3c5d4" />
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

function DeckSide({
  label,
  values,
  hue,
}: {
  label: string;
  values: string[];
  hue: string;
}) {
  const visible = values.slice(0, 3);
  return (
    <View style={styles.deckSide}>
      <Text style={styles.deckSideLabel}>{label}</Text>
      <View style={styles.deckBubbles}>
        {visible.map((value, index) => (
          <View
            key={`${value}-${index}`}
            style={[
              styles.deckBubble,
              {
                backgroundColor: hue,
                marginTop: index === 1 ? -8 : index === 2 ? 6 : 0,
              },
            ]}
          >
            <Text numberOfLines={1} style={styles.deckBubbleText}>
              {value[0] ?? "?"}
            </Text>
          </View>
        ))}
        {values.length > visible.length ? (
          <View style={styles.deckMore}>
            <Text style={styles.deckMoreText}>+{values.length - visible.length}</Text>
          </View>
        ) : null}
      </View>
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
  values,
  hue,
  logic,
  right,
}: {
  label: string;
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
          {values.slice(0, 3).map((value, index) => (
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
