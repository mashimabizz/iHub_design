import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  BottomOptionSheet,
  ColumnSwitcher,
  FilterChips,
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

  const wishActions = selectedWish
    ? buildWishActions({
        item: selectedWish,
        onClose: () => setSelectedWish(null),
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
        onToggle: () => {
          setListings((current) =>
            current.map((item) =>
              item.id === selectedListing.id
                ? {
                    ...item,
                    status: item.status === "ACTIVE" ? "PAUSED" : "ACTIVE",
                  }
                : item,
            ),
          );
          setSelectedListing(null);
        },
        onDelete: () => {
          setListings((current) =>
            current.filter((item) => item.id !== selectedListing.id),
          );
          setSelectedListing(null);
        },
      })
    : [];

  return (
    <Screen scroll={false} contentStyle={styles.screenContent}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>WISH</Text>
          <Text style={styles.title}>Wish</Text>
        </View>
        {tab === "wish" ? (
          <ColumnSwitcher value={columns} onChange={setColumns} />
        ) : null}
      </View>

      <SectionTabs value={tab} tabs={tabs} onChange={setTab} />

      {tab === "wish" ? (
        <View style={styles.filters}>
          <FilterChips
            chips={[
              { id: "all", label: "すべて", active: true },
              { id: "top", label: "最優先" },
              { id: "linked", label: "個別募集あり" },
              { id: "free", label: "未紐付け" },
            ]}
          />
        </View>
      ) : null}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {tab === "wish" ? (
          <GoodsGrid
            items={wishes}
            columns={columns}
            emptyLabel="まだ Wish がありません"
            onPressItem={(gridItem) => {
              const wish = wishes.find((item) => item.id === gridItem.id);
              if (wish) setSelectedWish(wish);
            }}
          />
        ) : (
          <View style={styles.listingList}>
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onPress={() => setSelectedListing(listing)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <FloatingAddButton
        label={tab === "wish" ? "Wishを追加" : "個別募集を追加"}
        onPress={() => {
          if (tab === "wish") {
            const index = wishes.length + 1;
            setWishes((current) => [
              {
                id: `wish-preview-${index}`,
                title: `追加Wish ${index}`,
                subtitle: "プレビュー / トレカ",
                glyph: `${index}`,
                hue: "#cbbcf4",
                badge: "NEW",
                priority: "ゆる募",
                linkedListings: 0,
              },
              ...current,
            ]);
            return;
          }

          const index = listings.length + 1;
          setListings((current) => [
            {
              id: `listing-preview-${index}`,
              status: "ACTIVE",
              give: [`譲グッズ ${index}`],
              want: [`求グッズ ${index}`],
              logic: "1pick",
              hue: "#cbbcf4",
            },
            ...current,
          ]);
        }}
      />

      <BottomOptionSheet
        visible={!!selectedWish}
        title={selectedWish?.title ?? ""}
        subtitle={
          selectedWish
            ? `${selectedWish.priority} / 個別募集 ${selectedWish.linkedListings}件`
            : undefined
        }
        actions={wishActions}
        onClose={() => setSelectedWish(null)}
      />

      <BottomOptionSheet
        visible={!!selectedListing}
        title={selectedListing?.id.replace("listing-", "#") ?? ""}
        subtitle={
          selectedListing
            ? `${selectedListing.status} / ${selectedListing.logic}`
            : undefined
        }
        actions={listingActions}
        onClose={() => setSelectedListing(null)}
      />
    </Screen>
  );
}

function ListingCard({
  listing,
  onPress,
}: {
  listing: ListingItem;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.listingCard}>
      <View style={styles.listingTop}>
        <View style={styles.listingNumber}>
          <Text style={styles.listingNumberText}>
            {listing.status === "ACTIVE" ? "ON" : "II"}
          </Text>
        </View>
        <View style={styles.listingTopText}>
          <Text style={styles.listingTitle}>
            {listing.status === "ACTIVE" ? "ACTIVE" : "PAUSED"}
          </Text>
          <Text style={styles.listingSub}>{listing.logic}</Text>
        </View>
        <View style={styles.listingActions}>
          <MiniIcon label="E" />
          <MiniIcon label="P" />
          <MiniIcon label="D" danger />
        </View>
      </View>

      <View style={styles.tradeLine}>
        <TradeSide label="譲" values={listing.give} hue={listing.hue} />
        <View style={styles.tradeConnector}>
          <View style={styles.tradeConnectorDot} />
          <View style={styles.tradeConnectorLine} />
          <View style={styles.tradeConnectorDot} />
        </View>
        <TradeSide label="求" values={listing.want} hue="#f3c5d4" right />
      </View>
    </Pressable>
  );
}

function MiniIcon({ label, danger }: { label: string; danger?: boolean }) {
  return (
    <View
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
    </View>
  );
}

function TradeSide({
  label,
  values,
  hue,
  right,
}: {
  label: string;
  values: string[];
  hue: string;
  right?: boolean;
}) {
  return (
    <View style={styles.tradeSide}>
      <Text style={[styles.tradeSideLabel, right ? styles.tradeSideRight : null]}>
        {label}
      </Text>
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
      </View>
    </View>
  );
}

function buildWishActions({
  item,
  onClose,
  onDelete,
}: {
  item: WishItem;
  onClose: () => void;
  onDelete: () => void;
}): SheetAction[] {
  return [
    {
      id: "edit",
      label: "編集する",
      onPress: onClose,
    },
    {
      id: "listing",
      label: item.linkedListings > 0 ? "個別募集を見る" : "個別募集を作る",
      onPress: onClose,
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
  onToggle,
  onDelete,
}: {
  item: ListingItem;
  onClose: () => void;
  onToggle: () => void;
  onDelete: () => void;
}): SheetAction[] {
  return [
    {
      id: "edit",
      label: "編集する",
      onPress: onClose,
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
  scrollContent: {
    paddingBottom: 24,
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
  listingNumber: {
    alignItems: "center",
    backgroundColor: "rgba(166,149,216,0.14)",
    borderRadius: 13,
    height: 36,
    justifyContent: "center",
    width: 42,
  },
  listingNumberText: {
    color: ihubColors.lavender,
    fontSize: 11,
    fontWeight: "900",
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
  tradeItemsLeft: {
    justifyContent: "flex-start",
  },
  tradeItemsRight: {
    justifyContent: "flex-end",
  },
  tradeMiniItem: {
    alignItems: "center",
    borderRadius: 8,
    height: 42,
    justifyContent: "center",
    width: 32,
  },
  tradeMiniText: {
    color: ihubColors.surface,
    fontSize: 16,
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
