import { useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SectionTabs,
} from "../../src/components/GoodsGrid";
import { Screen } from "../../src/components/Screen";
import { useAuth } from "../../src/auth/AuthProvider";
import { supabase } from "../../src/lib/supabase";
import { ihubColors, ihubRadii } from "../../src/theme/tokens";

type TopTab = "pending" | "ongoing" | "past";
type PendingSubTab = "action" | "waiting";
type PastFilter = "all" | "completed" | "cancelled" | "ended";

type TradeItem = {
  id: string;
  glyph: string;
  hue: string;
  label: string;
};

type TransactionStatus =
  | "sent"
  | "negotiating"
  | "agreement_one_side"
  | "agreed"
  | "completed"
  | "cancelled"
  | "rejected"
  | "expired";

type Transaction = {
  id: string;
  partner: string;
  direction: "sent" | "received";
  status: TransactionStatus;
  needsAction: boolean;
  receive: TradeItem[];
  give: TradeItem[];
  place: string;
  time: string;
  updated: string;
  note: string;
  stars?: number;
};

const TRANSACTIONS: Transaction[] = [
  {
    id: "tx-01",
    partner: "michilion",
    direction: "received",
    status: "negotiating",
    needsAction: true,
    receive: [
      { id: "r1", glyph: "S", hue: "#cbbcf4", label: "スア" },
      { id: "r2", glyph: "N", hue: "#a8d4e6", label: "ニンニン" },
    ],
    give: [{ id: "g1", glyph: "K", hue: "#f3c5d4", label: "カリナ" }],
    place: "横浜アリーナ 東口",
    time: "今日 17:30 - 18:00",
    updated: "3分前",
    note: "相手から返信が届いています",
  },
  {
    id: "tx-02",
    partner: "jhopesoda",
    direction: "sent",
    status: "agreement_one_side",
    needsAction: true,
    receive: [{ id: "r3", glyph: "V", hue: "#b7dceb", label: "V" }],
    give: [{ id: "g2", glyph: "J", hue: "#d5cff4", label: "ジョンウ" }],
    place: "守口市駅 改札前",
    time: "明日 16:00 - 17:00",
    updated: "12分前",
    note: "あなたの合意待ちです",
  },
  {
    id: "tx-03",
    partner: "ihub_lily",
    direction: "sent",
    status: "sent",
    needsAction: false,
    receive: [{ id: "r4", glyph: "W", hue: "#c8e8f2", label: "ウィンター" }],
    give: [{ id: "g3", glyph: "R", hue: "#f7d5df", label: "リノ" }],
    place: "全国候補",
    time: "候補確認中",
    updated: "1時間前",
    note: "相手の返信待ちです",
  },
  {
    id: "tx-04",
    partner: "karin_trade",
    direction: "received",
    status: "sent",
    needsAction: true,
    receive: [{ id: "r5", glyph: "K", hue: "#f3c5d4", label: "カリナ" }],
    give: [{ id: "g4", glyph: "S", hue: "#cbbcf4", label: "スア" }],
    place: "大阪城ホール 周辺",
    time: "5/18 19:00 - 19:30",
    updated: "2時間前",
    note: "新しい打診が届いています",
  },
  {
    id: "tx-05",
    partner: "winter_00",
    direction: "sent",
    status: "agreed",
    needsAction: false,
    receive: [{ id: "r6", glyph: "W", hue: "#a8d4e6", label: "ウィンター" }],
    give: [{ id: "g5", glyph: "N", hue: "#f3c5d4", label: "ニンニン" }],
    place: "横浜アリーナ 北口",
    time: "今日 18:15 - 18:45",
    updated: "5分前",
    note: "取引予定です。到着後にチャットで合流できます",
  },
  {
    id: "tx-06",
    partner: "suga_goods",
    direction: "received",
    status: "agreed",
    needsAction: true,
    receive: [{ id: "r7", glyph: "M", hue: "#d5cff4", label: "ミンギュ" }],
    give: [{ id: "g6", glyph: "J", hue: "#b7dceb", label: "ジョンウ" }],
    place: "幕張メッセ 2ホール前",
    time: "明日 14:00 - 14:30",
    updated: "20分前",
    note: "相違申告中です",
  },
  {
    id: "tx-07",
    partner: "moon_shop",
    direction: "sent",
    status: "completed",
    needsAction: false,
    receive: [{ id: "r8", glyph: "S", hue: "#cbbcf4", label: "スア" }],
    give: [{ id: "g7", glyph: "V", hue: "#b7dceb", label: "V" }],
    place: "横浜アリーナ",
    time: "5/10 17:30",
    updated: "5/10",
    note: "取引完了",
    stars: 5,
  },
  {
    id: "tx-08",
    partner: "nini_archive",
    direction: "received",
    status: "cancelled",
    needsAction: false,
    receive: [{ id: "r9", glyph: "N", hue: "#a8d4e6", label: "ニンニン" }],
    give: [{ id: "g8", glyph: "K", hue: "#f3c5d4", label: "カリナ" }],
    place: "梅田駅",
    time: "5/08 16:00",
    updated: "5/08",
    note: "キャンセル済み",
  },
];

const TOP_TABS = [
  { id: "pending" as const, label: "打診中", color: ihubColors.lavender },
  { id: "ongoing" as const, label: "進行中", color: ihubColors.sky },
  { id: "past" as const, label: "完了", color: ihubColors.pink },
];

export default function TransactionsScreen() {
  const { user, previewMode } = useAuth();
  const [tab, setTab] = useState<TopTab>("pending");
  const [pendingSub, setPendingSub] = useState<PendingSubTab>("action");
  const [pastFilter, setPastFilter] = useState<PastFilter>("all");
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    !supabase || previewMode ? TRANSACTIONS : [],
  );
  const [loading, setLoading] = useState(!!supabase && !previewMode);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [animatedTabs, setAnimatedTabs] = useState<Set<TopTab>>(
    () => new Set(),
  );

  useEffect(() => {
    if (!supabase || previewMode) {
      setTransactions(TRANSACTIONS);
      setLoading(false);
      setLoadError(null);
      return;
    }
    if (!user) {
      setTransactions([]);
      setLoading(false);
      setLoadError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setLoadError(null);
    fetchTransactions(user.id)
      .then((rows) => {
        if (!active) return;
        setTransactions(rows.length > 0 ? rows : []);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setTransactions([]);
        setLoadError(toErrorMessage(error, "読み込みに失敗しました"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [previewMode, user]);

  const grouped = useMemo(() => {
    const pending = transactions.filter((tx) =>
      ["sent", "negotiating", "agreement_one_side"].includes(tx.status),
    );
    const ongoing = transactions.filter((tx) => tx.status === "agreed");
    const past = transactions.filter((tx) =>
      ["completed", "cancelled", "expired", "rejected"].includes(tx.status),
    );

    return { pending, ongoing, past };
  }, [transactions]);
  const counts = {
    pending: grouped.pending.length,
    ongoing: grouped.ongoing.length,
    past: grouped.past.length,
  };
  const pendingAction = grouped.pending.filter((tx) => tx.needsAction);
  const pendingWaiting = grouped.pending.filter((tx) => !tx.needsAction);
  const pastCounts = useMemo(
    () => ({
      all: grouped.past.length,
      completed: grouped.past.filter((tx) => tx.status === "completed").length,
      cancelled: grouped.past.filter((tx) => tx.status === "cancelled").length,
      ended: grouped.past.filter((tx) =>
        tx.status === "expired" || tx.status === "rejected",
      ).length,
    }),
    [grouped.past],
  );
  const filteredPast =
    pastFilter === "all"
      ? grouped.past
      : pastFilter === "ended"
        ? grouped.past.filter((tx) =>
            tx.status === "expired" || tx.status === "rejected",
          )
        : grouped.past.filter((tx) => tx.status === pastFilter);
  const list =
    tab === "pending"
      ? pendingSub === "action"
        ? pendingAction
        : pendingWaiting
      : tab === "past"
        ? filteredPast
        : grouped.ongoing;
  const shouldAnimate = !animatedTabs.has(tab);
  const topTabs = TOP_TABS.map((item) => ({
    ...item,
    count: counts[item.id],
  }));

  useEffect(() => {
    if (list.length === 0 && !animatedTabs.has(tab)) {
      markTabAnimated(tab);
    }
  }, [animatedTabs, list.length, tab]);

  return (
    <Screen scroll={false} contentStyle={styles.screenContent}>
      <View style={styles.header}>
        <Text style={styles.kicker}>TRANSACTIONS</Text>
        <Text style={styles.title}>取引</Text>
      </View>

      {loading ? <Text style={styles.inlineNotice}>取引を読み込み中…</Text> : null}
      {loadError ? <Text style={styles.inlineError}>{loadError}</Text> : null}

      <SectionTabs
        value={tab}
        tabs={topTabs}
        onChange={setTab}
      />

      {tab === "pending" ? (
        <SectionTabs
          value={pendingSub}
          tabs={[
            {
              id: "action",
              label: "要対応",
              count: pendingAction.length,
              color: ihubColors.warn,
            },
            {
              id: "waiting",
              label: "相手待ち",
              count: pendingWaiting.length,
              color: ihubColors.sky,
            },
          ]}
          onChange={setPendingSub}
        />
      ) : null}

      {tab === "past" ? (
        <PastFilterChips
          filter={pastFilter}
          counts={pastCounts}
          onChange={setPastFilter}
        />
      ) : null}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {list.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>{emptyLabel(tab, pendingSub)}</Text>
          </View>
        ) : (
          list.map((tx, index) => (
            <AnimatedTransactionCard
              key={tx.id}
              tx={tx}
              index={index}
              animate={shouldAnimate}
              onAnimated={
                index === list.length - 1 ? () => markTabAnimated(tab) : undefined
              }
              onPress={() => openTransactionDetail(tx)}
            />
          ))
        )}
      </ScrollView>
    </Screen>
  );

  function markTabAnimated(target: TopTab) {
    setAnimatedTabs((current) => {
      if (current.has(target)) return current;
      const next = new Set(current);
      next.add(target);
      return next;
    });
  }
}

function openTransactionDetail(tx: Transaction) {
  router.push({
    pathname: "/transaction-detail",
    params: {
      id: tx.id,
    },
  });
}

type ProposalRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  sender_have_ids: string[] | null;
  sender_have_qtys: number[] | null;
  receiver_have_ids: string[] | null;
  receiver_have_qtys: number[] | null;
  agreed_by_sender: boolean | null;
  agreed_by_receiver: boolean | null;
  meetup_start_at: string | null;
  meetup_end_at: string | null;
  meetup_place_name: string | null;
  created_at: string;
  last_action_at: string | null;
  completed_at?: string | null;
  message: string | null;
};

type UserRow = {
  id: string;
  handle: string | null;
  display_name: string | null;
};

type InventoryRow = {
  id: string;
  title: string;
  hue?: number | string | null;
  group: { name: string | null } | { name: string | null }[] | null;
  character: { name: string | null } | { name: string | null }[] | null;
  goods_type: { name: string | null } | { name: string | null }[] | null;
};

async function fetchTransactions(userId: string): Promise<Transaction[]> {
  if (!supabase) return TRANSACTIONS;
  const proposalFields = [
    "id",
    "sender_id",
    "receiver_id",
    "status",
    "sender_have_ids",
    "sender_have_qtys",
    "receiver_have_ids",
    "receiver_have_qtys",
    "agreed_by_sender",
    "agreed_by_receiver",
    "meetup_start_at",
    "meetup_end_at",
    "meetup_place_name",
    "created_at",
    "last_action_at",
    "completed_at",
    "message",
  ];
  const proposals = await fetchProposalRows(userId, proposalFields);
  if (proposals.length === 0) return [];

  const partnerIds = Array.from(
    new Set(
      proposals.map((row) =>
        row.sender_id === userId ? row.receiver_id : row.sender_id,
      ),
    ),
  );
  const itemIds = Array.from(
    new Set(
      proposals.flatMap((row) => [
        ...(row.sender_have_ids ?? []),
        ...(row.receiver_have_ids ?? []),
      ]),
    ),
  );

  const [{ data: users }, { data: inventory }] = await Promise.all([
    partnerIds.length > 0
      ? supabase.from("users").select("id, handle, display_name").in("id", partnerIds)
      : Promise.resolve({ data: [] }),
    itemIds.length > 0
      ? supabase
          .from("goods_inventory")
          .select(
            "id, title, hue, group:groups_master(name), character:characters_master(name), goods_type:goods_types_master(name)",
          )
          .in("id", itemIds)
      : Promise.resolve({ data: [] }),
  ]);

  const usersById = new Map(
    ((users as UserRow[] | null) ?? []).map((user) => [user.id, user]),
  );
  const inventoryById = new Map(
    ((inventory as InventoryRow[] | null) ?? []).map((item) => [item.id, item]),
  );

  return proposals.map((row): Transaction => {
    const isSender = row.sender_id === userId;
    const partner = usersById.get(isSender ? row.receiver_id : row.sender_id);
    const giveIds = isSender ? row.sender_have_ids ?? [] : row.receiver_have_ids ?? [];
    const receiveIds = isSender
      ? row.receiver_have_ids ?? []
      : row.sender_have_ids ?? [];
    return {
      id: row.id,
      partner: partner?.handle ?? partner?.display_name ?? "unknown",
      direction: isSender ? "sent" : "received",
      status: normalizeTransactionStatus(row.status),
      needsAction: needsActionFor(row, userId),
      receive: receiveIds.map((id) => toTradeItem(id, inventoryById.get(id))),
      give: giveIds.map((id) => toTradeItem(id, inventoryById.get(id))),
      place: row.meetup_place_name ?? "場所確認中",
      time: formatProposalTime(row.meetup_start_at, row.meetup_end_at),
      updated: formatRelative(row.last_action_at ?? row.created_at),
      note: noteFor(row, userId),
    };
  });
}

async function fetchProposalRows(
  userId: string,
  fields: string[],
): Promise<ProposalRow[]> {
  if (!supabase) return [];
  const selectableFields = [...fields];
  for (let attempt = 0; attempt < fields.length; attempt += 1) {
    const { data, error } = await supabase
      .from("proposals")
      .select(selectableFields.join(", "))
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .neq("status", "draft")
      .order("last_action_at", { ascending: false });
    const missingColumn = getMissingProposalColumn(error);
    if (missingColumn && selectableFields.includes(missingColumn)) {
      selectableFields.splice(selectableFields.indexOf(missingColumn), 1);
      continue;
    }
    if (error) throw error;
    return ((data as unknown as Record<string, unknown>[] | null) ?? []).map((row) => ({
      completed_at: null,
      message: null,
      ...row,
    })) as ProposalRow[];
  }
  return [];
}

function getMissingProposalColumn(error: { code?: string; message?: string } | null) {
  const message = error?.message ?? "";
  if (
    error?.code !== "PGRST204" &&
    error?.code !== "42703" &&
    !message.includes("schema cache") &&
    !message.includes("does not exist")
  ) {
    return null;
  }
  return (
    message.match(/Could not find the '([^']+)' column of 'proposals'/)?.[1] ??
    message.match(/column proposals\.([a-zA-Z0-9_]+) does not exist/)?.[1] ??
    message.match(/column "([a-zA-Z0-9_]+)" does not exist/)?.[1] ??
    null
  );
}

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (
    typeof error === "object" &&
    error &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return fallback;
}

function toTradeItem(id: string, row?: InventoryRow): TradeItem {
  const label =
    pickName(row?.character) ?? pickName(row?.group) ?? row?.title ?? "グッズ";
  return {
    id,
    glyph: label.slice(0, 1),
    hue: normalizeHue(row?.hue, label),
    label,
  };
}

function needsActionFor(row: ProposalRow, userId: string) {
  const isSender = row.sender_id === userId;
  if (row.status === "sent") return !isSender;
  if (row.status === "negotiating") return true;
  if (row.status === "agreement_one_side") {
    return isSender ? !row.agreed_by_sender : !row.agreed_by_receiver;
  }
  return false;
}

function noteFor(row: ProposalRow, userId: string) {
  if (row.status === "sent") {
    return row.sender_id === userId
      ? "相手の返信待ちです"
      : "新しい打診が届いています";
  }
  if (row.status === "negotiating") return "条件調整中です";
  if (row.status === "agreement_one_side") return "合意待ちです";
  if (row.status === "agreed") return "取引予定です";
  if (row.status === "completed") return "取引完了";
  if (row.status === "expired") return "期限切れ";
  if (row.status === "rejected") return "見送り済み";
  return "キャンセル済み";
}

function normalizeTransactionStatus(status: string): TransactionStatus {
  if (
    status === "sent" ||
    status === "negotiating" ||
    status === "agreement_one_side" ||
    status === "agreed" ||
    status === "completed" ||
    status === "cancelled" ||
    status === "rejected" ||
    status === "expired"
  ) {
    return status;
  }
  return "cancelled";
}

function formatProposalTime(startAt: string | null, endAt: string | null) {
  if (!startAt) return "候補確認中";
  const start = new Date(startAt);
  const end = endAt ? new Date(endAt) : null;
  const date = `${start.getMonth() + 1}/${start.getDate()}`;
  const startTime = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;
  const endTime = end
    ? ` - ${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`
    : "";
  return `${date} ${startTime}${endTime}`;
}

function formatRelative(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 1) return "たった今";
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  return `${Math.floor(hours / 24)}日前`;
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

function AnimatedTransactionCard({
  tx,
  index,
  animate,
  onAnimated,
  onPress,
}: {
  tx: Transaction;
  index: number;
  animate: boolean;
  onAnimated?: () => void;
  onPress: () => void;
}) {
  const appear = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    if (!animate) return;
    const timer = setTimeout(() => {
      Animated.spring(appear, {
        toValue: 1,
        damping: 19,
        stiffness: 165,
        mass: 0.78,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onAnimated?.();
      });
    }, index * 72);

    return () => clearTimeout(timer);
  }, [animate, appear, index, onAnimated]);

  if (!animate) {
    return <TransactionCard tx={tx} onPress={onPress} />;
  }

  const translateY = appear.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0],
  });

  return (
    <Animated.View
      style={{
        opacity: appear,
        transform: [{ translateY }],
      }}
    >
      <TransactionCard tx={tx} onPress={onPress} />
    </Animated.View>
  );
}

function PastFilterChips({
  filter,
  counts,
  onChange,
}: {
  filter: PastFilter;
  counts: Record<PastFilter, number>;
  onChange: (filter: PastFilter) => void;
}) {
  const chips = [
    { id: "all" as const, label: `すべて ${counts.all}` },
    { id: "completed" as const, label: `完了 ${counts.completed}` },
    { id: "cancelled" as const, label: `キャンセル ${counts.cancelled}` },
    { id: "ended" as const, label: `終了 ${counts.ended}` },
  ];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filterScroller}
      contentContainerStyle={styles.filterChips}
    >
      {chips.map((chip) => {
        const active = filter === chip.id;
        return (
          <Pressable
            key={chip.id}
            onPress={() => onChange(chip.id)}
            style={[styles.filterChip, active ? styles.filterChipActive : null]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.filterChipText,
                active ? styles.filterChipTextActive : null,
              ]}
            >
              {chip.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function TransactionCard({
  tx,
  onPress,
}: {
  tx: Transaction;
  onPress: () => void;
}) {
  const tone = tx.needsAction ? "action" : tx.status === "agreed" ? "live" : "idle";
  const statusText = statusLabel(tx);

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        tone === "action"
          ? styles.cardAction
          : tone === "live"
            ? styles.cardLive
            : styles.cardIdle,
      ]}
    >
      {tx.needsAction ? <View style={styles.cardAccent} /> : null}
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{tx.partner[0]?.toUpperCase()}</Text>
        </View>
        <View style={styles.partnerBlock}>
          <Text numberOfLines={1} style={styles.partner}>
            @{tx.partner}
          </Text>
          <Text numberOfLines={1} style={styles.updated}>
            {tx.updated}
          </Text>
        </View>
        <View
          style={[
            styles.directionBadge,
            tx.direction === "received"
              ? styles.directionReceived
              : styles.directionSent,
          ]}
        >
          <Text
            style={[
              styles.directionText,
              tx.direction === "received"
                ? styles.directionTextReceived
                : styles.directionTextSent,
            ]}
          >
            {tx.direction === "received" ? "届いた" : "送った"}
          </Text>
        </View>
      </View>

      <View style={styles.statusLine}>
        <View
          style={[
            styles.statusPill,
            tone === "action"
              ? styles.statusPillAction
              : tone === "live"
                ? styles.statusPillLive
                : styles.statusPillIdle,
          ]}
        >
          <Text
            style={[
              styles.statusPillText,
              tone === "action"
                ? styles.statusPillTextAction
                : tone === "live"
                  ? styles.statusPillTextLive
                  : styles.statusPillTextIdle,
            ]}
          >
            {statusText}
          </Text>
        </View>
        {tx.stars ? <Text style={styles.stars}>★ {tx.stars}</Text> : null}
      </View>

      <View style={styles.tradePair}>
        <TradePreview label="受け取る" items={tx.receive} />
        <View style={styles.arrows}>
          <Text style={styles.arrowText}>→</Text>
          <Text style={styles.arrowTextMuted}>←</Text>
        </View>
        <TradePreview label="私が出す" items={tx.give} right />
      </View>

      <View style={styles.meetupLine}>
        <Text numberOfLines={1} style={styles.meetupText}>
          {tx.time}
        </Text>
        <Text numberOfLines={1} style={styles.meetupPlace}>
          {tx.place}
        </Text>
      </View>
    </Pressable>
  );
}

function TradePreview({
  label,
  items,
  right,
}: {
  label: string;
  items: TradeItem[];
  right?: boolean;
}) {
  return (
    <View style={styles.tradeSide}>
      <Text style={[styles.tradeLabel, right ? styles.tradeLabelRight : null]}>
        {label}
      </Text>
      <View style={[styles.tradeItems, right ? styles.tradeItemsRight : null]}>
        {items.slice(0, 3).map((item) => (
          <View
            key={item.id}
            style={[styles.tradeItem, { backgroundColor: item.hue }]}
          >
            <Text style={styles.tradeItemText}>{item.glyph}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function statusLabel(tx: Transaction) {
  if (tx.status === "sent") return tx.needsAction ? "新着打診" : "相手待ち";
  if (tx.status === "negotiating") {
    return tx.needsAction ? "返信が届いています" : "ネゴ中";
  }
  if (tx.status === "agreement_one_side") {
    return tx.needsAction ? "合意待ち" : "相手の合意待ち";
  }
  if (tx.status === "agreed") return tx.needsAction ? "要確認" : "取引予定";
  if (tx.status === "completed") return "完了";
  if (tx.status === "cancelled") return "キャンセル";
  if (tx.status === "rejected") return "見送り";
  return "期限切れ";
}

function emptyLabel(tab: TopTab, sub: PendingSubTab) {
  if (tab === "pending") {
    return sub === "action"
      ? "いま対応が必要な打診はありません"
      : "相手待ちの打診はありません";
  }
  if (tab === "ongoing") return "進行中の取引はありません";
  return "完了した取引はまだありません";
}

const styles = StyleSheet.create({
  screenContent: {
    gap: 12,
    paddingHorizontal: 18,
  },
  header: {
    gap: 2,
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
  listContent: {
    gap: 10,
    paddingBottom: 24,
  },
  filterChips: {
    alignItems: "center",
    gap: 7,
    paddingBottom: 1,
    paddingRight: 18,
  },
  filterScroller: {
    flexGrow: 0,
    maxHeight: 44,
    minHeight: 38,
  },
  filterChip: {
    alignItems: "center",
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.08)",
    borderRadius: ihubRadii.pill,
    borderWidth: 1,
    flexShrink: 0,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterChipActive: {
    backgroundColor: ihubColors.ink,
    borderColor: ihubColors.ink,
  },
  filterChipText: {
    color: ihubColors.ink,
    fontSize: 11,
    fontWeight: "800",
    includeFontPadding: false,
    lineHeight: 14,
  },
  filterChipTextActive: {
    color: ihubColors.surface,
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
  card: {
    backgroundColor: ihubColors.surface,
    borderRadius: 17,
    borderWidth: 1,
    overflow: "hidden",
    padding: 12,
    shadowColor: ihubColors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  cardAction: {
    borderColor: "rgba(217,130,107,0.24)",
  },
  cardLive: {
    borderColor: "rgba(168,212,230,0.36)",
  },
  cardIdle: {
    borderColor: "rgba(58,50,74,0.08)",
  },
  cardAccent: {
    backgroundColor: ihubColors.warn,
    borderBottomRightRadius: 3,
    borderTopRightRadius: 3,
    bottom: 12,
    left: 0,
    position: "absolute",
    top: 12,
    width: 3,
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: "rgba(166,149,216,0.16)",
    borderRadius: 12,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  avatarText: {
    color: ihubColors.lavender,
    fontSize: 14,
    fontWeight: "900",
  },
  partnerBlock: {
    flex: 1,
  },
  partner: {
    color: ihubColors.ink,
    fontSize: 13,
    fontWeight: "900",
  },
  updated: {
    color: ihubColors.mutedInk,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 1,
  },
  directionBadge: {
    borderRadius: ihubRadii.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  directionReceived: {
    backgroundColor: "rgba(166,149,216,0.14)",
  },
  directionSent: {
    backgroundColor: "rgba(168,212,230,0.22)",
  },
  directionText: {
    fontSize: 9.5,
    fontWeight: "900",
  },
  directionTextReceived: {
    color: ihubColors.lavender,
  },
  directionTextSent: {
    color: "#3a7c93",
  },
  statusLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 9,
  },
  statusPill: {
    borderRadius: ihubRadii.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  statusPillAction: {
    backgroundColor: "rgba(217,130,107,0.12)",
  },
  statusPillLive: {
    backgroundColor: "rgba(168,212,230,0.22)",
  },
  statusPillIdle: {
    backgroundColor: "rgba(58,50,74,0.06)",
  },
  statusPillText: {
    fontSize: 10.5,
    fontWeight: "900",
  },
  statusPillTextAction: {
    color: ihubColors.warn,
  },
  statusPillTextLive: {
    color: "#3a7c93",
  },
  statusPillTextIdle: {
    color: ihubColors.ink,
  },
  stars: {
    color: "#caa04f",
    fontSize: 10.5,
    fontWeight: "900",
  },
  tradePair: {
    alignItems: "center",
    backgroundColor: "rgba(168,212,230,0.10)",
    borderRadius: 15,
    flexDirection: "row",
    gap: 8,
    marginTop: 9,
    padding: 9,
  },
  tradeSide: {
    flex: 1,
  },
  tradeLabel: {
    color: ihubColors.mutedInk,
    fontSize: 9.5,
    fontWeight: "900",
    marginBottom: 6,
  },
  tradeLabelRight: {
    textAlign: "right",
  },
  tradeItems: {
    flexDirection: "row",
    gap: 5,
  },
  tradeItemsRight: {
    justifyContent: "flex-end",
  },
  tradeItem: {
    alignItems: "center",
    borderRadius: 8,
    height: 42,
    justifyContent: "center",
    width: 32,
  },
  tradeItemText: {
    color: ihubColors.surface,
    fontSize: 16,
    fontWeight: "900",
  },
  arrows: {
    alignItems: "center",
    width: 22,
  },
  arrowText: {
    color: ihubColors.lavender,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 16,
  },
  arrowTextMuted: {
    color: ihubColors.sky,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 16,
  },
  meetupLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 9,
  },
  meetupText: {
    color: ihubColors.ink,
    flex: 1,
    fontSize: 10.5,
    fontWeight: "900",
  },
  meetupPlace: {
    color: ihubColors.mutedInk,
    flex: 1,
    fontSize: 10.5,
    fontWeight: "700",
    textAlign: "right",
  },
});
