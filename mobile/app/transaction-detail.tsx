import { useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../src/auth/AuthProvider";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { Screen } from "../src/components/Screen";
import { StatusPill } from "../src/components/StatusPill";
import { supabase } from "../src/lib/supabase";
import { ihubColors, ihubRadii, ihubShadow } from "../src/theme/tokens";

type ProposalStatus =
  | "sent"
  | "negotiating"
  | "agreement_one_side"
  | "agreed"
  | "completed"
  | "cancelled"
  | "rejected"
  | "expired";

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
  meetup_lat: number | null;
  meetup_lng: number | null;
  meetup_candidates: unknown;
  message: string | null;
  created_at: string;
  last_action_at: string | null;
  expires_at: string | null;
};

type UserRow = {
  id: string;
  handle: string | null;
  display_name: string | null;
  primary_area: string | null;
  avatar_url: string | null;
};

type InventoryRow = {
  id: string;
  title: string;
  photo_urls: string[] | null;
  hue?: number | string | null;
  group: { name: string | null } | { name: string | null }[] | null;
  character: { name: string | null } | { name: string | null }[] | null;
  goods_type: { name: string | null } | { name: string | null }[] | null;
};

type DetailItem = {
  id: string;
  label: string;
  goodsType: string | null;
  photoUrl: string | null;
  qty: number;
  hue: string;
};

type MeetupCandidate = {
  startAt: string;
  endAt: string;
  placeName: string;
  lat: number | null;
  lng: number | null;
};

type TransactionDetail = {
  id: string;
  status: ProposalStatus;
  isSender: boolean;
  isReceiver: boolean;
  myAgreed: boolean;
  partnerAgreed: boolean;
  partner: UserRow;
  receive: DetailItem[];
  give: DetailItem[];
  meetups: MeetupCandidate[];
  message: string | null;
  expiresAt: string | null;
  messages: ChatMessage[];
};

type ChatMessage = {
  id: string;
  senderId: string;
  type:
    | "text"
    | "photo"
    | "outfit_photo"
    | "location"
    | "arrival_status"
    | "system";
  body: string | null;
  photoUrl: string | null;
  locationLabel: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
};

type MessageRow = {
  id: string;
  sender_id: string;
  message_type: ChatMessage["type"];
  body: string | null;
  photo_url: string | null;
  location_label: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
};

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const proposalId = Array.isArray(id) ? id[0] : id;
  const { user, previewMode, exitPreview } = useAuth();
  const [detail, setDetail] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<
    "accept" | "negotiate" | "reject" | "enroute" | "arrived" | null
  >(null);
  const [draft, setDraft] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  const canAccept = useMemo(() => {
    if (!detail) return false;
    return (
      ["sent", "negotiating", "agreement_one_side"].includes(detail.status) &&
      !detail.myAgreed
    );
  }, [detail]);
  const canNegotiate = detail?.isReceiver && ["sent", "negotiating"].includes(detail.status);
  const canReject = detail?.isReceiver && ["sent", "negotiating"].includes(detail.status);
  const canChat =
    detail &&
    ["sent", "negotiating", "agreement_one_side", "agreed", "completed"].includes(
      detail.status,
    );

  useEffect(() => {
    if (!proposalId) {
      setDetail(null);
      setError("打診IDが見つかりません");
      return;
    }
    if (!supabase || !user || previewMode) {
      setDetail(null);
      setError(
        previewMode
          ? "Preview_hanaでは取引チャットを開けません"
          : "ログイン後に取引詳細を確認できます",
      );
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    fetchTransactionDetail(proposalId, user.id)
      .then((next) => {
        if (active) setDetail(next);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "読み込みに失敗しました");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [previewMode, proposalId, user]);

  async function handleAction(action: "accept" | "negotiate" | "reject") {
    if (!detail || !user || !supabase) return;
    setActionLoading(action);
    setError(null);
    try {
      const next = await updateProposalAction(detail, user.id, action);
      setDetail(next);
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "更新に失敗しました",
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSendMessage() {
    if (!detail || !user || !supabase) return;
    const body = draft.trim();
    if (!body) return;
    setSendingMessage(true);
    setError(null);
    try {
      const { error: insertError } = await supabase.from("messages").insert({
        proposal_id: detail.id,
        sender_id: user.id,
        message_type: "text",
        body,
      });
      if (insertError) throw insertError;
      setDraft("");
      setDetail(await fetchTransactionDetail(detail.id, user.id));
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "送信に失敗しました");
    } finally {
      setSendingMessage(false);
    }
  }

  async function handleArrivalStatus(status: "enroute" | "arrived") {
    if (!detail || !user || !supabase) return;
    setActionLoading(status);
    setError(null);
    try {
      const label = status === "enroute" ? "向かっています" : "到着しました";
      const { error: insertError } = await supabase.from("messages").insert({
        proposal_id: detail.id,
        sender_id: user.id,
        message_type: "arrival_status",
        body: label,
        meta: { status },
      });
      if (insertError) throw insertError;
      setDetail(await fetchTransactionDetail(detail.id, user.id));
    } catch (arrivalError) {
      setError(
        arrivalError instanceof Error
          ? arrivalError.message
          : "ステータス更新に失敗しました",
      );
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="戻る"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <StatusPill label={detail ? statusLabel(detail) : "取引"} tone="lavender" />
      </View>

      {loading ? <Text style={styles.inlineNotice}>取引を読み込み中…</Text> : null}
      {error ? <Text style={styles.inlineError}>{error}</Text> : null}
      {(previewMode || !user) && !detail ? (
        <View style={styles.loginPrompt}>
          <Text style={styles.loginPromptTitle}>michilionでログイン</Text>
          <Text style={styles.loginPromptText}>
            取引チャットは実アカウントの打診データに接続して表示します。
          </Text>
          <PrimaryButton
            onPress={() => {
              exitPreview();
              router.replace("/login");
            }}
          >
            ログインして取引チャットを見る
          </PrimaryButton>
        </View>
      ) : null}

      {detail ? (
        <>
          <View style={styles.partnerCard}>
            <View style={styles.partnerAvatar}>
              {detail.partner.avatar_url ? (
                <Image
                  source={{ uri: detail.partner.avatar_url }}
                  style={styles.partnerAvatarImage}
                />
              ) : (
                <Text style={styles.partnerAvatarText}>
                  {(detail.partner.handle ?? detail.partner.display_name ?? "?")
                    .slice(0, 1)
                    .toUpperCase()}
                </Text>
              )}
            </View>
            <View style={styles.partnerCopy}>
              <Text style={styles.partnerName}>
                @{detail.partner.handle ?? detail.partner.display_name ?? "unknown"}
              </Text>
              <Text style={styles.partnerMeta}>
                {detail.partner.primary_area ?? "エリア未設定"}
              </Text>
            </View>
            <View style={styles.agreeState}>
              <Text style={styles.agreeStateText}>
                {detail.myAgreed ? "合意済" : "未合意"}
              </Text>
            </View>
          </View>

          <View style={styles.tradePanel}>
            <TradeColumn title="受け取る" items={detail.receive} />
            <View style={styles.tradeCenter}>
              <Text style={styles.tradeArrow}>→</Text>
              <Text style={styles.tradeArrowMuted}>←</Text>
            </View>
            <TradeColumn title="私が出す" items={detail.give} alignRight />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>待ち合わせ候補</Text>
            {detail.meetups.length > 0 ? (
              detail.meetups.map((meetup, index) => (
                <View key={`${meetup.startAt}-${index}`} style={styles.meetupCard}>
                  <Text style={styles.meetupTime}>
                    {formatDateTime(meetup.startAt, meetup.endAt)}
                  </Text>
                  <Text numberOfLines={1} style={styles.meetupPlace}>
                    {meetup.placeName}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>候補時間はまだありません</Text>
            )}
          </View>

          {detail.message ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>メッセージ</Text>
              <Text style={styles.messageText}>{detail.message}</Text>
            </View>
          ) : null}

          {canChat ? (
            <View style={styles.chatSection}>
              <View style={styles.chatHeader}>
                <View>
                  <Text style={styles.sectionTitle}>
                    {detail.status === "agreed" || detail.status === "completed"
                      ? "取引チャット"
                      : "ネゴチャット"}
                  </Text>
                  <Text style={styles.chatSub}>
                    {detail.messages.length}件
                  </Text>
                </View>
                {detail.status === "agreed" ? (
                  <View style={styles.arrivalActions}>
                    <Pressable
                      disabled={!!actionLoading}
                      onPress={() => handleArrivalStatus("enroute")}
                      style={styles.arrivalButton}
                    >
                      <Text style={styles.arrivalButtonText}>向かう</Text>
                    </Pressable>
                    <Pressable
                      disabled={!!actionLoading}
                      onPress={() => handleArrivalStatus("arrived")}
                      style={[styles.arrivalButton, styles.arrivalButtonStrong]}
                    >
                      <Text
                        style={[
                          styles.arrivalButtonText,
                          styles.arrivalButtonTextStrong,
                        ]}
                      >
                        到着
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>

              <View style={styles.messagesList}>
                {detail.messages.length === 0 ? (
                  <Text style={styles.emptyText}>まだメッセージはありません</Text>
                ) : (
                  detail.messages.map((message) => (
                    <ChatBubble
                      key={message.id}
                      message={message}
                      mine={message.senderId === user?.id}
                    />
                  ))
                )}
              </View>

              {detail.status !== "completed" ? (
                <View style={styles.composer}>
                  <TextInput
                    value={draft}
                    onChangeText={setDraft}
                    placeholder="メッセージ"
                    placeholderTextColor="rgba(58,50,74,0.38)"
                    multiline
                    style={styles.composerInput}
                  />
                  <Pressable
                    disabled={sendingMessage || draft.trim().length === 0}
                    onPress={handleSendMessage}
                    style={[
                      styles.sendButton,
                      sendingMessage || draft.trim().length === 0
                        ? styles.sendButtonDisabled
                        : null,
                    ]}
                  >
                    <Text style={styles.sendButtonText}>送信</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={styles.actions}>
            {canAccept ? (
              <PrimaryButton
                loading={actionLoading === "accept"}
                onPress={() => handleAction("accept")}
              >
                この内容で合意する
              </PrimaryButton>
            ) : null}
            {canNegotiate ? (
              <PrimaryButton
                variant="secondary"
                loading={actionLoading === "negotiate"}
                onPress={() => handleAction("negotiate")}
              >
                条件を相談する
              </PrimaryButton>
            ) : null}
            {canReject ? (
              <Pressable
                disabled={!!actionLoading}
                onPress={() => handleAction("reject")}
                style={styles.rejectButton}
              >
                <Text style={styles.rejectText}>見送る</Text>
              </Pressable>
            ) : null}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

async function fetchTransactionDetail(
  proposalId: string,
  userId: string,
): Promise<TransactionDetail> {
  if (!supabase) throw new Error("Supabaseが未設定です");
  const { data, error } = await supabase
    .from("proposals")
    .select(
      `id, sender_id, receiver_id, status,
       sender_have_ids, sender_have_qtys, receiver_have_ids, receiver_have_qtys,
       agreed_by_sender, agreed_by_receiver,
       meetup_start_at, meetup_end_at, meetup_place_name, meetup_lat, meetup_lng,
       meetup_candidates, message, created_at, last_action_at, expires_at`,
    )
    .eq("id", proposalId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("打診が見つかりません");

  return buildDetail(data as ProposalRow, userId);
}

async function buildDetail(
  proposal: ProposalRow,
  userId: string,
): Promise<TransactionDetail> {
  if (!supabase) throw new Error("Supabaseが未設定です");
  const isSender = proposal.sender_id === userId;
  const isReceiver = proposal.receiver_id === userId;
  if (!isSender && !isReceiver) throw new Error("この打診には参加していません");

  const partnerId = isSender ? proposal.receiver_id : proposal.sender_id;
  const giveIds = isSender
    ? proposal.sender_have_ids ?? []
    : proposal.receiver_have_ids ?? [];
  const giveQtys = isSender
    ? proposal.sender_have_qtys ?? []
    : proposal.receiver_have_qtys ?? [];
  const receiveIds = isSender
    ? proposal.receiver_have_ids ?? []
    : proposal.sender_have_ids ?? [];
  const receiveQtys = isSender
    ? proposal.receiver_have_qtys ?? []
    : proposal.sender_have_qtys ?? [];
  const itemIds = Array.from(new Set([...giveIds, ...receiveIds]));

  const [{ data: partnerData }, { data: inventoryData }] = await Promise.all([
    supabase
      .from("users")
      .select("id, handle, display_name, primary_area, avatar_url")
      .eq("id", partnerId)
      .maybeSingle(),
    itemIds.length > 0
      ? supabase
          .from("goods_inventory")
          .select(
            "id, title, photo_urls, hue, group:groups_master(name), character:characters_master(name), goods_type:goods_types_master(name)",
          )
          .in("id", itemIds)
      : Promise.resolve({ data: [] }),
  ]);

  const inventoryById = new Map(
    ((inventoryData as InventoryRow[] | null) ?? []).map((item) => [
      item.id,
      item,
    ]),
  );

  return {
    id: proposal.id,
    status: normalizeStatus(proposal.status),
    isSender,
    isReceiver,
    myAgreed: isSender
      ? !!proposal.agreed_by_sender
      : !!proposal.agreed_by_receiver,
    partnerAgreed: isSender
      ? !!proposal.agreed_by_receiver
      : !!proposal.agreed_by_sender,
    partner:
      (partnerData as UserRow | null) ?? {
        id: partnerId,
        handle: "unknown",
        display_name: "unknown",
        primary_area: null,
        avatar_url: null,
      },
    receive: receiveIds.map((id, index) =>
      toDetailItem(id, receiveQtys[index] ?? 1, inventoryById.get(id)),
    ),
    give: giveIds.map((id, index) =>
      toDetailItem(id, giveQtys[index] ?? 1, inventoryById.get(id)),
    ),
    meetups: parseMeetups(proposal),
    message: proposal.message,
    expiresAt: proposal.expires_at,
    messages: await fetchMessages(proposal.id),
  };
}

async function fetchMessages(proposalId: string): Promise<ChatMessage[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("messages")
    .select(
      "id, sender_id, message_type, body, photo_url, location_label, meta, created_at",
    )
    .eq("proposal_id", proposalId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data as MessageRow[] | null) ?? []).map((row) => ({
    id: row.id,
    senderId: row.sender_id,
    type: row.message_type,
    body: row.body,
    photoUrl: row.photo_url,
    locationLabel: row.location_label,
    meta: row.meta,
    createdAt: row.created_at,
  }));
}

async function updateProposalAction(
  detail: TransactionDetail,
  userId: string,
  action: "accept" | "negotiate" | "reject",
) {
  if (!supabase) throw new Error("Supabaseが未設定です");
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { last_action_at: now };

  if (action === "accept") {
    const agreedBySender = detail.isSender ? true : detail.partnerAgreed;
    const agreedByReceiver = detail.isReceiver ? true : detail.partnerAgreed;
    updates.agreed_by_sender = agreedBySender;
    updates.agreed_by_receiver = agreedByReceiver;
    updates.status =
      agreedBySender && agreedByReceiver ? "agreed" : "agreement_one_side";
  } else if (action === "negotiate") {
    updates.status = "negotiating";
  } else {
    updates.status = "rejected";
  }

  const { error } = await supabase
    .from("proposals")
    .update(updates)
    .eq("id", detail.id);
  if (error) throw error;

  const systemBody =
    action === "accept"
      ? updates.status === "agreed"
        ? "両者が合意しました。取引を進めましょう ✓"
        : "あなたが合意しました（相手の合意待ち）"
      : action === "negotiate"
        ? "条件相談に進みました"
        : "打診が見送られました";

  await supabase.from("messages").insert({
    proposal_id: detail.id,
    sender_id: userId,
    message_type: "system",
    body: systemBody,
    meta: { action },
  });

  return fetchTransactionDetail(detail.id, userId);
}

function TradeColumn({
  title,
  items,
  alignRight,
}: {
  title: string;
  items: DetailItem[];
  alignRight?: boolean;
}) {
  return (
    <View style={styles.tradeColumn}>
      <Text style={[styles.tradeTitle, alignRight ? styles.tradeTitleRight : null]}>
        {title}
      </Text>
      <View style={[styles.detailItems, alignRight ? styles.detailItemsRight : null]}>
        {items.map((item) => (
          <View key={item.id} style={styles.detailItem}>
            {item.photoUrl ? (
              <Image source={{ uri: item.photoUrl }} style={styles.itemPhoto} />
            ) : (
              <View style={[styles.itemFallback, { backgroundColor: item.hue }]}>
                <Text style={styles.itemGlyph}>{item.label.slice(0, 1)}</Text>
              </View>
            )}
            <Text numberOfLines={1} style={styles.itemLabel}>
              {item.label}
            </Text>
            {item.qty > 1 ? <Text style={styles.itemQty}>x{item.qty}</Text> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

function ChatBubble({
  message,
  mine,
}: {
  message: ChatMessage;
  mine: boolean;
}) {
  const system = message.type === "system" || message.type === "arrival_status";
  const text = messageText(message);

  if (system) {
    return (
      <View style={styles.systemMessage}>
        <Text style={styles.systemMessageText}>{text}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.chatBubbleRow, mine ? styles.chatBubbleRowMine : null]}>
      <View style={[styles.chatBubble, mine ? styles.chatBubbleMine : null]}>
        {message.photoUrl ? (
          <Image source={{ uri: message.photoUrl }} style={styles.chatPhoto} />
        ) : null}
        <Text style={[styles.chatBubbleText, mine ? styles.chatBubbleTextMine : null]}>
          {text}
        </Text>
        <Text style={[styles.chatTime, mine ? styles.chatTimeMine : null]}>
          {shortTime(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}

function messageText(message: ChatMessage) {
  if (message.type === "arrival_status") {
    const status = message.meta?.status;
    if (status === "arrived") return "到着しました";
    if (status === "enroute") return "向かっています";
    if (status === "left") return "離れました";
  }
  if (message.type === "location") {
    return message.locationLabel ?? "現在地を共有しました";
  }
  if (message.type === "outfit_photo") {
    return message.body ?? "服装写真を共有しました";
  }
  if (message.type === "photo") {
    return message.body ?? "写真を共有しました";
  }
  return message.body ?? "";
}

function shortTime(value: string) {
  const date = new Date(value);
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}

function toDetailItem(id: string, qty: number, row?: InventoryRow): DetailItem {
  const label =
    pickName(row?.character) ?? pickName(row?.group) ?? row?.title ?? "グッズ";
  return {
    id,
    label,
    goodsType: pickName(row?.goods_type),
    photoUrl: row?.photo_urls?.[0] ?? null,
    qty,
    hue: normalizeHue(row?.hue, label),
  };
}

function parseMeetups(proposal: ProposalRow): MeetupCandidate[] {
  const fromJson = Array.isArray(proposal.meetup_candidates)
    ? proposal.meetup_candidates
        .map((candidate) => {
          if (!candidate || typeof candidate !== "object") return null;
          const raw = candidate as Record<string, unknown>;
          const startAt = typeof raw.startAt === "string" ? raw.startAt : null;
          const endAt = typeof raw.endAt === "string" ? raw.endAt : null;
          const placeName =
            typeof raw.placeName === "string" ? raw.placeName : null;
          if (!startAt || !endAt || !placeName) return null;
          return {
            startAt,
            endAt,
            placeName,
            lat: typeof raw.lat === "number" ? raw.lat : null,
            lng: typeof raw.lng === "number" ? raw.lng : null,
          };
        })
        .filter((candidate): candidate is MeetupCandidate => !!candidate)
    : [];
  if (fromJson.length > 0) return fromJson;
  if (
    proposal.meetup_start_at &&
    proposal.meetup_end_at &&
    proposal.meetup_place_name
  ) {
    return [
      {
        startAt: proposal.meetup_start_at,
        endAt: proposal.meetup_end_at,
        placeName: proposal.meetup_place_name,
        lat: proposal.meetup_lat,
        lng: proposal.meetup_lng,
      },
    ];
  }
  return [];
}

function normalizeStatus(status: string): ProposalStatus {
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

function statusLabel(detail: TransactionDetail) {
  if (detail.status === "sent") return detail.isReceiver ? "新着打診" : "相手待ち";
  if (detail.status === "negotiating") return "ネゴ中";
  if (detail.status === "agreement_one_side") {
    return detail.myAgreed ? "相手の合意待ち" : "合意待ち";
  }
  if (detail.status === "agreed") return "取引予定";
  if (detail.status === "completed") return "完了";
  if (detail.status === "rejected") return "見送り";
  if (detail.status === "expired") return "期限切れ";
  return "キャンセル";
}

function formatDateTime(startAt: string, endAt: string) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  return `${start.getMonth() + 1}/${start.getDate()} ${timeText(start)} - ${timeText(end)}`;
}

function timeText(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
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

const styles = StyleSheet.create({
  screen: {
    gap: 14,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  backButton: {
    alignItems: "center",
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.08)",
    borderRadius: ihubRadii.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
    ...ihubShadow,
  },
  backText: {
    color: ihubColors.ink,
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 34,
  },
  inlineNotice: {
    color: ihubColors.mutedInk,
    fontSize: 12,
    fontWeight: "800",
  },
  inlineError: {
    color: ihubColors.warn,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
  },
  loginPrompt: {
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(166,149,216,0.22)",
    borderRadius: ihubRadii.xl,
    borderWidth: 1,
    gap: 11,
    padding: 16,
    ...ihubShadow,
  },
  loginPromptTitle: {
    color: ihubColors.ink,
    fontSize: 18,
    fontWeight: "900",
  },
  loginPromptText: {
    color: ihubColors.mutedInk,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
  },
  partnerCard: {
    alignItems: "center",
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.08)",
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14,
    ...ihubShadow,
  },
  partnerAvatar: {
    alignItems: "center",
    backgroundColor: "rgba(166,149,216,0.16)",
    borderRadius: 22,
    height: 52,
    justifyContent: "center",
    overflow: "hidden",
    width: 52,
  },
  partnerAvatarImage: {
    height: "100%",
    width: "100%",
  },
  partnerAvatarText: {
    color: ihubColors.lavender,
    fontSize: 18,
    fontWeight: "900",
  },
  partnerCopy: {
    flex: 1,
  },
  partnerName: {
    color: ihubColors.ink,
    fontSize: 17,
    fontWeight: "900",
  },
  partnerMeta: {
    color: ihubColors.mutedInk,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
  },
  agreeState: {
    backgroundColor: "rgba(166,149,216,0.12)",
    borderRadius: ihubRadii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  agreeStateText: {
    color: ihubColors.lavender,
    fontSize: 10.5,
    fontWeight: "900",
  },
  tradePanel: {
    alignItems: "center",
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(168,212,230,0.25)",
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 14,
  },
  tradeColumn: {
    flex: 1,
  },
  tradeTitle: {
    color: ihubColors.mutedInk,
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 8,
  },
  tradeTitleRight: {
    textAlign: "right",
  },
  detailItems: {
    gap: 8,
  },
  detailItemsRight: {
    alignItems: "flex-end",
  },
  detailItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    maxWidth: "100%",
  },
  itemPhoto: {
    borderRadius: 8,
    height: 42,
    width: 34,
  },
  itemFallback: {
    alignItems: "center",
    borderRadius: 8,
    height: 42,
    justifyContent: "center",
    width: 34,
  },
  itemGlyph: {
    color: ihubColors.surface,
    fontSize: 15,
    fontWeight: "900",
  },
  itemLabel: {
    color: ihubColors.ink,
    flexShrink: 1,
    fontSize: 11.5,
    fontWeight: "900",
    maxWidth: 82,
  },
  itemQty: {
    color: ihubColors.mutedInk,
    fontSize: 10,
    fontWeight: "900",
  },
  tradeCenter: {
    alignItems: "center",
    width: 26,
  },
  tradeArrow: {
    color: ihubColors.lavender,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 18,
  },
  tradeArrowMuted: {
    color: ihubColors.sky,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 18,
  },
  section: {
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.08)",
    borderRadius: ihubRadii.xl,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  sectionTitle: {
    color: ihubColors.ink,
    fontSize: 14,
    fontWeight: "900",
  },
  chatSection: {
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.08)",
    borderRadius: ihubRadii.xl,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  chatHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  chatSub: {
    color: ihubColors.mutedInk,
    fontSize: 10.5,
    fontWeight: "800",
    marginTop: 2,
  },
  arrivalActions: {
    flexDirection: "row",
    gap: 6,
  },
  arrivalButton: {
    backgroundColor: "rgba(168,212,230,0.18)",
    borderRadius: ihubRadii.pill,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  arrivalButtonStrong: {
    backgroundColor: ihubColors.lavender,
  },
  arrivalButtonText: {
    color: "#3a7c93",
    fontSize: 10.5,
    fontWeight: "900",
  },
  arrivalButtonTextStrong: {
    color: ihubColors.surface,
  },
  messagesList: {
    gap: 8,
  },
  systemMessage: {
    alignSelf: "center",
    backgroundColor: "rgba(58,50,74,0.06)",
    borderRadius: ihubRadii.pill,
    maxWidth: "86%",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  systemMessageText: {
    color: ihubColors.mutedInk,
    fontSize: 10.5,
    fontWeight: "800",
    textAlign: "center",
  },
  chatBubbleRow: {
    alignItems: "flex-start",
  },
  chatBubbleRowMine: {
    alignItems: "flex-end",
  },
  chatBubble: {
    backgroundColor: "rgba(58,50,74,0.06)",
    borderRadius: 17,
    borderTopLeftRadius: 6,
    maxWidth: "82%",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  chatBubbleMine: {
    backgroundColor: ihubColors.lavender,
    borderTopLeftRadius: 17,
    borderTopRightRadius: 6,
  },
  chatBubbleText: {
    color: ihubColors.ink,
    fontSize: 12.5,
    fontWeight: "700",
    lineHeight: 19,
  },
  chatBubbleTextMine: {
    color: ihubColors.surface,
  },
  chatPhoto: {
    borderRadius: 12,
    height: 150,
    marginBottom: 7,
    width: 190,
  },
  chatTime: {
    color: ihubColors.mutedInk,
    fontSize: 9,
    fontWeight: "800",
    marginTop: 4,
  },
  chatTimeMine: {
    color: "rgba(255,255,255,0.72)",
  },
  composer: {
    alignItems: "flex-end",
    backgroundColor: "rgba(58,50,74,0.04)",
    borderRadius: 18,
    flexDirection: "row",
    gap: 8,
    padding: 7,
  },
  composerInput: {
    color: ihubColors.ink,
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    maxHeight: 92,
    minHeight: 38,
    paddingHorizontal: 9,
    paddingVertical: 8,
  },
  sendButton: {
    alignItems: "center",
    backgroundColor: ihubColors.lavender,
    borderRadius: ihubRadii.pill,
    height: 38,
    justifyContent: "center",
    paddingHorizontal: 13,
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  sendButtonText: {
    color: ihubColors.surface,
    fontSize: 12,
    fontWeight: "900",
  },
  meetupCard: {
    backgroundColor: "rgba(168,212,230,0.14)",
    borderRadius: 16,
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  meetupTime: {
    color: ihubColors.ink,
    fontSize: 13,
    fontWeight: "900",
  },
  meetupPlace: {
    color: ihubColors.mutedInk,
    fontSize: 11,
    fontWeight: "800",
  },
  emptyText: {
    color: ihubColors.mutedInk,
    fontSize: 12,
    fontWeight: "800",
  },
  messageText: {
    color: ihubColors.ink,
    fontSize: 12.5,
    fontWeight: "700",
    lineHeight: 20,
  },
  actions: {
    gap: 10,
  },
  rejectButton: {
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
  },
  rejectText: {
    color: ihubColors.warn,
    fontSize: 13,
    fontWeight: "900",
  },
});
