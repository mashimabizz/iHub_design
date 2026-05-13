import { useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { RouteHeader } from "../src/components/RouteHeader";
import { Screen } from "../src/components/Screen";
import { useAuth } from "../src/auth/AuthProvider";
import { IconSymbol } from "../src/components/IconSymbol";
import { supabase } from "../src/lib/supabase";
import { ihubColors, ihubRadii, ihubShadow } from "../src/theme/tokens";

type ScheduleItem = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  note: string | null;
};

const PREVIEW_SCHEDULES: ScheduleItem[] = [
  {
    id: "preview-schedule-1",
    title: "ライブ参戦",
    startAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    endAt: new Date(Date.now() + 1000 * 60 * 60 * 30).toISOString(),
    allDay: false,
    note: "会場周辺にいる予定",
  },
];

export default function SchedulesScreen() {
  const { previewMode, user } = useAuth();
  const [items, setItems] = useState<ScheduleItem[]>(() =>
    !supabase || previewMode ? PREVIEW_SCHEDULES : [],
  );
  const [loading, setLoading] = useState(!!supabase && !previewMode);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase || previewMode) {
      setItems(PREVIEW_SCHEDULES);
      setLoading(false);
      setError(null);
      return;
    }
    if (!user) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    fetchSchedules(user.id)
      .then((next) => {
        if (active) setItems(next);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : "スケジュールを読み込めませんでした");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [previewMode, user]);

  const { past, upcoming } = useMemo(() => {
    const now = Date.now();
    return {
      upcoming: items.filter((item) => new Date(item.endAt).getTime() >= now),
      past: items.filter((item) => new Date(item.endAt).getTime() < now),
    };
  }, [items]);

  async function deleteSchedule(id: string) {
    const snapshot = items;
    setItems((current) => current.filter((item) => item.id !== id));
    if (!supabase || !user || previewMode) return;
    const { error } = await supabase
      .from("schedules")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      setItems(snapshot);
      setError(error.message);
    }
  }

  return (
    <Screen contentStyle={styles.screen}>
      <RouteHeader
        title="スケジュール"
        subtitle="自分の予定（AWとは別）"
        right={
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/schedule-editor")}
            style={styles.addButton}
          >
            <IconSymbol name="add" size={19} color="#fff" />
          </Pressable>
        }
      />
      {loading ? <Text style={styles.loadingText}>読み込み中…</Text> : null}
      {error ? <Text style={styles.inlineError}>{error}</Text> : null}
      {items.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>まだ予定がありません</Text>
          <Pressable onPress={() => router.push("/schedule-editor")}>
            <Text style={styles.emptyLink}>予定を追加 →</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {upcoming.length > 0 ? (
            <ScheduleSection
              label="今後の予定"
              items={upcoming}
              onDelete={deleteSchedule}
            />
          ) : null}
          {past.length > 0 ? (
            <ScheduleSection
              dim
              label="過去"
              items={past.slice(0, 10)}
              onDelete={deleteSchedule}
            />
          ) : null}
        </>
      )}
    </Screen>
  );
}

function ScheduleSection({
  dim,
  items,
  label,
  onDelete,
}: {
  dim?: boolean;
  items: ScheduleItem[];
  label: string;
  onDelete: (id: string) => void;
}) {
  return (
    <View style={[styles.section, dim ? styles.dim : null]}>
      <Text style={styles.sectionTitle}>
        {label} <Text style={styles.sectionCount}>· {items.length}</Text>
      </Text>
      <View style={styles.cards}>
        {items.map((item) => (
          <ScheduleCard
            key={item.id}
            dim={dim}
            item={item}
            onDelete={() => onDelete(item.id)}
          />
        ))}
      </View>
    </View>
  );
}

function ScheduleCard({
  dim,
  item,
  onDelete,
}: {
  dim?: boolean;
  item: ScheduleItem;
  onDelete: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardIcon}>
        <IconSymbol name="calendar-outline" size={18} color="#fff" />
      </View>
      <View style={styles.cardCopy}>
        <Text numberOfLines={1} style={styles.cardTitle}>
          {item.title}
          {dim ? "  済" : ""}
        </Text>
        <Text numberOfLines={1} style={styles.cardTime}>
          {formatRange(item.startAt, item.endAt, item.allDay)}
        </Text>
        {item.note ? (
          <Text numberOfLines={2} style={styles.cardNote}>
            {item.note}
          </Text>
        ) : null}
      </View>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: "/schedule-editor",
              params: { id: item.id },
            })
          }
          style={styles.smallButton}
        >
          <Text style={styles.smallButtonText}>編集</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onDelete} style={styles.smallButton}>
          <Text style={styles.smallButtonMuted}>削除</Text>
        </Pressable>
      </View>
    </View>
  );
}

async function fetchSchedules(userId: string): Promise<ScheduleItem[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("schedules")
    .select("id, title, start_at, end_at, all_day, note")
    .eq("user_id", userId)
    .order("start_at", { ascending: true });
  if (error) throw error;
  return ((data as {
    id: string;
    title: string;
    start_at: string;
    end_at: string;
    all_day: boolean;
    note: string | null;
  }[] | null) ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    startAt: row.start_at,
    endAt: row.end_at,
    allDay: row.all_day,
    note: row.note,
  }));
}

function formatDate(iso: string, allDay: boolean) {
  const date = new Date(iso);
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
  const day = `${date.getMonth() + 1}/${date.getDate()} (${weekday})`;
  if (allDay) return day;
  const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  return `${day} ${time}`;
}

function formatRange(startAt: string, endAt: string, allDay: boolean) {
  if (allDay) return `${formatDate(startAt, true)} 終日`;
  const start = new Date(startAt);
  const end = new Date(endAt);
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();
  if (sameDay) {
    return `${formatDate(startAt, false)} 〜 ${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
  }
  return `${formatDate(startAt, false)} 〜 ${formatDate(endAt, false)}`;
}

const styles = StyleSheet.create({
  screen: {
    gap: 16,
  },
  addButton: {
    alignItems: "center",
    backgroundColor: ihubColors.lavender,
    borderRadius: ihubRadii.pill,
    height: 38,
    justifyContent: "center",
    width: 38,
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
  },
  emptyBox: {
    alignItems: "center",
    borderColor: "rgba(58,50,74,0.10)",
    borderRadius: ihubRadii.lg,
    borderStyle: "dashed",
    borderWidth: 1,
    paddingVertical: 36,
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
  section: {
    gap: 8,
  },
  dim: {
    opacity: 0.7,
  },
  sectionTitle: {
    color: ihubColors.mutedInk,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.4,
    paddingHorizontal: 2,
  },
  sectionCount: {
    fontSize: 10,
    fontWeight: "800",
  },
  cards: {
    gap: 9,
  },
  card: {
    alignItems: "flex-start",
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.08)",
    borderRadius: ihubRadii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 14,
    ...ihubShadow,
  },
  cardIcon: {
    alignItems: "center",
    backgroundColor: ihubColors.lavender,
    borderRadius: 10,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  cardCopy: {
    flex: 1,
  },
  cardTitle: {
    color: ihubColors.ink,
    fontSize: 13.5,
    fontWeight: "900",
  },
  cardTime: {
    color: ihubColors.mutedInk,
    fontSize: 10.5,
    fontWeight: "800",
    marginTop: 2,
  },
  cardNote: {
    color: ihubColors.ink,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
    marginTop: 5,
  },
  actions: {
    gap: 6,
  },
  smallButton: {
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.10)",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  smallButtonText: {
    color: ihubColors.lavender,
    fontSize: 10.5,
    fontWeight: "900",
  },
  smallButtonMuted: {
    color: ihubColors.mutedInk,
    fontSize: 10.5,
    fontWeight: "900",
  },
});
