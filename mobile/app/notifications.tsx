import { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { RouteHeader } from "../src/components/RouteHeader";
import { Screen } from "../src/components/Screen";
import { useAuth } from "../src/auth/AuthProvider";
import { supabase } from "../src/lib/supabase";
import { ihubColors, ihubRadii, ihubShadow } from "../src/theme/tokens";

type NotificationKind =
  | "proposal_received"
  | "proposal_accepted"
  | "proposal_rejected"
  | "proposal_revised"
  | "evidence_added"
  | "trade_completed"
  | "evaluation_received"
  | "dispute_received"
  | "dispute_responded"
  | "dispute_closed"
  | "cancel_requested"
  | "expires_soon";

type NotificationItem = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  linkPath: string | null;
  readAt: string | null;
  createdAt: string;
};

type Tone = "lavender" | "ok" | "warn" | "amber" | "mute";

const KIND_ICON: Record<NotificationKind, keyof typeof Ionicons.glyphMap> = {
  proposal_received: "mail-unread-outline",
  proposal_accepted: "checkmark-circle-outline",
  proposal_rejected: "close-circle-outline",
  proposal_revised: "create-outline",
  evidence_added: "camera-outline",
  trade_completed: "sparkles-outline",
  evaluation_received: "star-outline",
  dispute_received: "warning-outline",
  dispute_responded: "scale-outline",
  dispute_closed: "shield-checkmark-outline",
  cancel_requested: "ban-outline",
  expires_soon: "time-outline",
};

const KIND_TONE: Record<NotificationKind, Tone> = {
  proposal_received: "lavender",
  proposal_accepted: "ok",
  proposal_rejected: "mute",
  proposal_revised: "lavender",
  evidence_added: "lavender",
  trade_completed: "ok",
  evaluation_received: "amber",
  dispute_received: "warn",
  dispute_responded: "warn",
  dispute_closed: "lavender",
  cancel_requested: "warn",
  expires_soon: "amber",
};

const PREVIEW_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "preview-notification-1",
    kind: "proposal_received",
    title: "新しい打診が届いています",
    body: "スア 春ver. トレカについて交換の打診があります。",
    linkPath: "/proposals/preview",
    readAt: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
  },
  {
    id: "preview-notification-2",
    kind: "expires_soon",
    title: "返信期限が近づいています",
    body: "相手待ちの打診を確認してください。",
    linkPath: "/proposals/preview",
    readAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
  },
];

export default function NotificationsScreen() {
  const { previewMode, user } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>(PREVIEW_NOTIFICATIONS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!supabase || !user || previewMode) {
      setItems(PREVIEW_NOTIFICATIONS);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    fetchNotifications(user.id)
      .then((next) => {
        if (active) setItems(next);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : "通知を読み込めませんでした");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [previewMode, user]);

  const unreadCount = useMemo(() => items.filter((item) => !item.readAt).length, [items]);

  async function markAllRead() {
    const readAt = new Date().toISOString();
    setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? readAt })));
    if (!supabase || !user || previewMode) return;
    setPending(true);
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: readAt })
      .eq("user_id", user.id)
      .is("read_at", null);
    setPending(false);
    if (error) setError(error.message);
  }

  async function handleTap(item: NotificationItem) {
    const readAt = new Date().toISOString();
    if (!item.readAt) {
      setItems((current) =>
        current.map((next) => (next.id === item.id ? { ...next, readAt } : next)),
      );
      if (supabase && user && !previewMode) {
        supabase
          .from("notifications")
          .update({ read_at: readAt })
          .eq("id", item.id)
          .eq("user_id", user.id)
          .then(({ error }) => {
            if (error) setError(error.message);
          });
      }
    }
    const route = routeFromLinkPath(item.linkPath);
    if (route) router.push(route);
  }

  return (
    <Screen contentStyle={styles.screen}>
      <RouteHeader
        title="通知"
        subtitle={
          unreadCount > 0
            ? `未読 ${unreadCount} 件 / 全 ${items.length} 件`
            : `全 ${items.length} 件 すべて既読`
        }
        right={
          unreadCount > 0 ? (
            <Pressable
              accessibilityRole="button"
              disabled={pending}
              onPress={markAllRead}
              style={styles.markAllButton}
            >
              <Text style={styles.markAllText}>既読</Text>
            </Pressable>
          ) : null
        }
      />
      {loading ? <Text style={styles.loadingText}>通知を読み込み中…</Text> : null}
      {error ? <Text style={styles.inlineError}>{error}</Text> : null}
      {items.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>まだ通知はありません</Text>
          <Pressable onPress={() => router.replace("/")}>
            <Text style={styles.emptyLink}>ホームに戻る →</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.list}>
          {items.map((item) => (
            <NotificationCard key={item.id} item={item} onPress={() => handleTap(item)} />
          ))}
        </View>
      )}
    </Screen>
  );
}

function NotificationCard({
  item,
  onPress,
}: {
  item: NotificationItem;
  onPress: () => void;
}) {
  const unread = !item.readAt;
  const tone = KIND_TONE[item.kind];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        unread ? styles.cardUnread : styles.cardRead,
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={[styles.iconBox, toneStyle(tone)]}>
        <Ionicons name={KIND_ICON[item.kind]} size={18} color={toneColor(tone)} />
      </View>
      <View style={styles.cardCopy}>
        <View style={styles.cardTop}>
          {unread ? <View style={styles.unreadDot} /> : null}
          <Text numberOfLines={1} style={styles.cardTitle}>
            {item.title}
          </Text>
          <Text style={styles.timeText}>{formatRelative(item.createdAt)}</Text>
        </View>
        {item.body ? (
          <Text numberOfLines={2} style={styles.bodyText}>
            {item.body}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

async function fetchNotifications(userId: string): Promise<NotificationItem[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("notifications")
    .select("id, kind, title, body, link_path, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return ((data as {
    id: string;
    kind: string;
    title: string;
    body: string | null;
    link_path: string | null;
    read_at: string | null;
    created_at: string;
  }[] | null) ?? []).map((row) => ({
    id: row.id,
    kind: normalizeKind(row.kind),
    title: row.title,
    body: row.body,
    linkPath: row.link_path,
    readAt: row.read_at,
    createdAt: row.created_at,
  }));
}

function normalizeKind(value: string): NotificationKind {
  return value in KIND_ICON ? (value as NotificationKind) : "proposal_received";
}

function routeFromLinkPath(path: string | null) {
  if (!path) return null;
  if (path === "/" || path === "/profile" || path === "/search") return path;
  const dispute = path.match(/^\/disputes\/([^/]+)/);
  if (dispute) {
    return { pathname: "/dispute-detail", params: { id: dispute[1] } } as const;
  }
  const proposal = path.match(/^\/proposals\/([^/]+)/);
  if (proposal) {
    return { pathname: "/transaction-detail", params: { id: proposal[1] } } as const;
  }
  const transaction = path.match(/^\/transactions\/([^/]+)/);
  if (transaction) {
    if (path.endsWith("/capture")) {
      return { pathname: "/transaction-capture", params: { id: transaction[1] } } as const;
    }
    if (path.endsWith("/approve")) {
      return { pathname: "/transaction-approve", params: { id: transaction[1] } } as const;
    }
    if (path.endsWith("/rate")) {
      return { pathname: "/transaction-rate", params: { id: transaction[1] } } as const;
    }
    if (path.includes("/cancel-or-late")) {
      const kind = path.includes("kind=late") ? "late" : "cancel";
      return {
        pathname: "/transaction-cancel-or-late",
        params: { id: transaction[1], kind },
      } as const;
    }
    return { pathname: "/transaction-detail", params: { id: transaction[1] } } as const;
  }
  const user = path.match(/^\/users\/([^/]+)/);
  if (user) {
    return { pathname: "/user-profile", params: { id: user[1] } } as const;
  }
  return null;
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "今";
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}日前`;
  const date = new Date(iso);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function toneStyle(tone: Tone) {
  if (tone === "ok") return styles.iconOk;
  if (tone === "warn") return styles.iconWarn;
  if (tone === "amber") return styles.iconAmber;
  if (tone === "mute") return styles.iconMute;
  return styles.iconLavender;
}

function toneColor(tone: Tone) {
  if (tone === "ok") return "#16a34a";
  if (tone === "warn") return ihubColors.warn;
  if (tone === "amber") return "#b7791f";
  if (tone === "mute") return "rgba(58,50,74,0.55)";
  return ihubColors.lavender;
}

const styles = StyleSheet.create({
  screen: {
    gap: 14,
  },
  markAllButton: {
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.08)",
    borderRadius: ihubRadii.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  markAllText: {
    color: ihubColors.mutedInk,
    fontSize: 10.5,
    fontWeight: "900",
  },
  loadingText: {
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
  emptyBox: {
    alignItems: "center",
    borderColor: "rgba(58,50,74,0.10)",
    borderRadius: ihubRadii.lg,
    borderStyle: "dashed",
    borderWidth: 1,
    paddingVertical: 34,
  },
  emptyTitle: {
    color: ihubColors.mutedInk,
    fontSize: 12,
    fontWeight: "800",
  },
  emptyLink: {
    color: ihubColors.lavender,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 8,
  },
  list: {
    gap: 9,
  },
  card: {
    alignItems: "flex-start",
    backgroundColor: ihubColors.surface,
    borderRadius: ihubRadii.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cardUnread: {
    borderColor: "rgba(166,149,216,0.36)",
    shadowColor: ihubColors.lavender,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 2,
  },
  cardRead: {
    borderColor: "rgba(58,50,74,0.08)",
    opacity: 0.82,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  iconBox: {
    alignItems: "center",
    borderRadius: 10,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  iconLavender: {
    backgroundColor: "rgba(166,149,216,0.16)",
  },
  iconOk: {
    backgroundColor: "rgba(34,197,94,0.14)",
  },
  iconWarn: {
    backgroundColor: "rgba(217,130,107,0.13)",
  },
  iconAmber: {
    backgroundColor: "rgba(245,158,11,0.14)",
  },
  iconMute: {
    backgroundColor: "rgba(58,50,74,0.06)",
  },
  cardCopy: {
    flex: 1,
  },
  cardTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 6,
  },
  unreadDot: {
    backgroundColor: ihubColors.lavender,
    borderRadius: ihubRadii.pill,
    height: 7,
    marginTop: 6,
    width: 7,
  },
  cardTitle: {
    color: ihubColors.ink,
    flex: 1,
    fontSize: 13,
    fontWeight: "900",
  },
  timeText: {
    color: ihubColors.mutedInk,
    fontSize: 10,
    fontWeight: "800",
  },
  bodyText: {
    color: ihubColors.mutedInk,
    fontSize: 11.5,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: 3,
  },
});
