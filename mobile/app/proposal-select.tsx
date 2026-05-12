import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { Screen } from "../src/components/Screen";
import { StatusPill } from "../src/components/StatusPill";
import { SectionTabs } from "../src/components/GoodsGrid";
import { ihubColors, ihubRadii, ihubShadow } from "../src/theme/tokens";

type ProposalTab = "give" | "receive" | "meetup";

type ChoiceItem = {
  id: string;
  title: string;
  subtitle: string;
  glyph: string;
  hue: string;
  hint: string;
};

const GIVE_CHOICES: ChoiceItem[] = [
  {
    id: "give-1",
    title: "カリナ 春ver.",
    subtitle: "aespa / トレカ",
    glyph: "K",
    hue: "#f3c5d4",
    hint: "相手がほしいものかも？",
  },
  {
    id: "give-2",
    title: "ジョンウ ラキドロ",
    subtitle: "NCT / トレカ",
    glyph: "J",
    hue: "#a8d4e6",
    hint: "相手がほしいものかも？",
  },
];

const RECEIVE_CHOICES: ChoiceItem[] = [
  {
    id: "receive-1",
    title: "スア ラキドロ",
    subtitle: "LUMENA / トレカ",
    glyph: "S",
    hue: "#cbbcf4",
    hint: "私がほしいものかも？",
  },
  {
    id: "receive-2",
    title: "ニンニン 制服",
    subtitle: "aespa / アクスタ",
    glyph: "N",
    hue: "#d5cff4",
    hint: "私がほしいものかも？",
  },
];

const DAYS = [
  { id: "fri", day: "金", date: "17" },
  { id: "sat", day: "土", date: "18" },
  { id: "sun", day: "日", date: "19" },
  { id: "mon", day: "月", date: "20" },
  { id: "tue", day: "火", date: "21" },
];

const HOURS = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];

export default function ProposalSelectScreen() {
  const params = useLocalSearchParams<{ tab?: ProposalTab | ProposalTab[] }>();
  const initialTab = parseTab(one(params.tab));
  const [tab, setTab] = useState<ProposalTab>(initialTab);
  const [giveSelected, setGiveSelected] = useState("give-1");
  const [receiveSelected, setReceiveSelected] = useState("receive-1");
  const [activeCandidate, setActiveCandidate] = useState("17-14");

  const tabs = useMemo(
    () => [
      { id: "give" as const, label: "私が出す", count: 1, color: ihubColors.lavender },
      { id: "receive" as const, label: "受け取る", count: 1, color: ihubColors.sky },
      { id: "meetup" as const, label: "待ち合わせ", count: 1, color: ihubColors.pink },
    ],
    [],
  );

  return (
    <Screen scroll={false} contentStyle={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="戻る"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>PROPOSAL</Text>
          <Text style={styles.title}>提示物の選択</Text>
        </View>
        <StatusPill label="STEP 1/2" tone="lavender" />
      </View>

      <SectionTabs value={tab} tabs={tabs} onChange={setTab} />

      {tab === "give" ? (
        <ChoicePane
          items={GIVE_CHOICES}
          selectedId={giveSelected}
          onSelect={setGiveSelected}
        />
      ) : null}

      {tab === "receive" ? (
        <ChoicePane
          items={RECEIVE_CHOICES}
          selectedId={receiveSelected}
          onSelect={setReceiveSelected}
        />
      ) : null}

      {tab === "meetup" ? (
        <MeetupPane
          activeCandidate={activeCandidate}
          onChange={setActiveCandidate}
        />
      ) : null}

      <PrimaryButton
        onPress={() => {
          if (tab !== "meetup") {
            setTab("meetup");
            return;
          }
          router.push({
            pathname: "/preview-detail",
            params: {
              kind: "transaction",
              badge: "送信確認",
              title: "打診内容の確認",
              subtitle: "提示物と待ち合わせ候補を確認して送信します。",
            },
          });
        }}
      >
        {tab === "meetup" ? "送信確認へ進む" : "待ち合わせへ進む"}
      </PrimaryButton>
    </Screen>
  );
}

function ChoicePane({
  items,
  selectedId,
  onSelect,
}: {
  items: ChoiceItem[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.choiceList}
    >
      {items.map((item) => {
        const selected = selectedId === item.id;
        return (
          <Pressable
            key={item.id}
            onPress={() => onSelect(item.id)}
            style={[styles.choiceCard, selected ? styles.choiceCardSelected : null]}
          >
            <View style={[styles.choiceImage, { backgroundColor: item.hue }]}>
              <View style={styles.choiceShine} />
              <Text style={styles.choiceGlyph}>{item.glyph}</Text>
            </View>
            <View style={styles.choiceCopy}>
              <Text numberOfLines={1} style={styles.choiceTitle}>
                {item.title}
              </Text>
              <Text numberOfLines={1} style={styles.choiceSubtitle}>
                {item.subtitle}
              </Text>
              <View style={styles.choiceHint}>
                <Text numberOfLines={1} style={styles.choiceHintText}>
                  {item.hint}
                </Text>
              </View>
            </View>
            <View style={[styles.checkCircle, selected ? styles.checkCircleOn : null]}>
              <Text style={[styles.checkText, selected ? styles.checkTextOn : null]}>
                {selected ? "✓" : ""}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function MeetupPane({
  activeCandidate,
  onChange,
}: {
  activeCandidate: string;
  onChange: (id: string) => void;
}) {
  return (
    <View style={styles.meetupRoot}>
      <View style={styles.days}>
        {DAYS.map((day) => (
          <View key={day.id} style={styles.dayCell}>
            <Text style={styles.dayName}>{day.day}</Text>
            <Text style={styles.dayDate}>{day.date}</Text>
          </View>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.calendarContent}
      >
        {HOURS.map((hour, hourIndex) => (
          <View key={hour} style={styles.hourRow}>
            <Text style={styles.hourLabel}>{hour}</Text>
            <View style={styles.hourSlots}>
              {DAYS.map((day, dayIndex) => {
                const id = `${day.date}-${10 + hourIndex}`;
                const active = activeCandidate === id;
                const suggested = (dayIndex === 0 && hourIndex === 4) || active;
                return (
                  <Pressable
                    key={id}
                    onPress={() => onChange(id)}
                    style={[
                      styles.timeCell,
                      suggested ? styles.timeCellSuggested : null,
                      active ? styles.timeCellActive : null,
                    ]}
                  >
                    {active ? <Text style={styles.timeCellText}>横浜</Text> : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function one(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function parseTab(value?: string): ProposalTab {
  if (value === "receive" || value === "meetup") {
    return value;
  }
  return "give";
}

const styles = StyleSheet.create({
  screen: {
    gap: 12,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.08)",
    borderRadius: ihubRadii.pill,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
    ...ihubShadow,
  },
  backText: {
    color: ihubColors.ink,
    fontSize: 31,
    fontWeight: "700",
    lineHeight: 33,
  },
  headerText: {
    flex: 1,
  },
  kicker: {
    color: ihubColors.lavender,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  title: {
    color: ihubColors.ink,
    fontSize: 23,
    fontWeight: "900",
    lineHeight: 28,
  },
  choiceList: {
    gap: 10,
    paddingBottom: 18,
  },
  choiceCard: {
    alignItems: "center",
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.08)",
    borderRadius: ihubRadii.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 10,
  },
  choiceCardSelected: {
    backgroundColor: "rgba(166,149,216,0.08)",
    borderColor: "rgba(166,149,216,0.48)",
  },
  choiceImage: {
    alignItems: "center",
    borderRadius: 15,
    height: 82,
    justifyContent: "center",
    overflow: "hidden",
    width: 66,
  },
  choiceShine: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 999,
    height: 56,
    position: "absolute",
    right: -12,
    top: -10,
    width: 56,
  },
  choiceGlyph: {
    color: ihubColors.surface,
    fontSize: 27,
    fontWeight: "900",
  },
  choiceCopy: {
    flex: 1,
  },
  choiceTitle: {
    color: ihubColors.ink,
    fontSize: 15,
    fontWeight: "900",
  },
  choiceSubtitle: {
    color: ihubColors.mutedInk,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 3,
  },
  choiceHint: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(168,212,230,0.22)",
    borderRadius: ihubRadii.pill,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  choiceHintText: {
    color: "#3a7c93",
    fontSize: 10,
    fontWeight: "900",
  },
  checkCircle: {
    alignItems: "center",
    borderColor: "rgba(58,50,74,0.16)",
    borderRadius: 999,
    borderWidth: 1,
    height: 26,
    justifyContent: "center",
    width: 26,
  },
  checkCircleOn: {
    backgroundColor: ihubColors.lavender,
    borderColor: ihubColors.lavender,
  },
  checkText: {
    color: "transparent",
    fontSize: 14,
    fontWeight: "900",
  },
  checkTextOn: {
    color: ihubColors.surface,
  },
  meetupRoot: {
    backgroundColor: ihubColors.surface,
    borderColor: "rgba(58,50,74,0.08)",
    borderRadius: ihubRadii.xl,
    borderWidth: 1,
    flex: 1,
    overflow: "hidden",
  },
  days: {
    borderBottomColor: "rgba(58,50,74,0.08)",
    borderBottomWidth: 1,
    flexDirection: "row",
  },
  dayCell: {
    alignItems: "center",
    flex: 1,
    paddingVertical: 10,
  },
  dayName: {
    color: ihubColors.mutedInk,
    fontSize: 11,
    fontWeight: "900",
  },
  dayDate: {
    color: ihubColors.ink,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 2,
  },
  calendarContent: {
    paddingBottom: 22,
  },
  hourRow: {
    flexDirection: "row",
    minHeight: 58,
  },
  hourLabel: {
    color: ihubColors.mutedInk,
    fontSize: 11,
    fontWeight: "800",
    paddingTop: 7,
    textAlign: "center",
    width: 46,
  },
  hourSlots: {
    borderLeftColor: "rgba(58,50,74,0.08)",
    borderLeftWidth: 1,
    flex: 1,
    flexDirection: "row",
  },
  timeCell: {
    borderBottomColor: "rgba(58,50,74,0.055)",
    borderBottomWidth: 1,
    borderRightColor: "rgba(58,50,74,0.055)",
    borderRightWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 58,
    paddingHorizontal: 3,
  },
  timeCellSuggested: {
    backgroundColor: "rgba(168,212,230,0.18)",
  },
  timeCellActive: {
    backgroundColor: "rgba(83,147,227,0.18)",
    borderColor: "rgba(83,147,227,0.46)",
  },
  timeCellText: {
    color: "#3478c7",
    fontSize: 9.5,
    fontWeight: "900",
    textAlign: "center",
  },
});
