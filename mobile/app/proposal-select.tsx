import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
} from "react-native";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { Screen } from "../src/components/Screen";
import { StatusPill } from "../src/components/StatusPill";
import { SectionTabs } from "../src/components/GoodsGrid";
import {
  NativeMapPreview,
  type MapCoordinate,
} from "../src/components/NativeMapPreview";
import {
  buildProposalChoices,
  parseProposalIdList,
  type ProposalChoiceItem,
} from "../src/data/proposalItems";
import { ihubColors, ihubRadii, ihubShadow } from "../src/theme/tokens";

type ProposalTab = "give" | "receive" | "meetup";

type MeetupCandidate = {
  id: string;
  dayIndex: number;
  startSlot: number;
  endSlot: number;
  place: string;
  coordinate: MapCoordinate;
};

type MeetupDay = {
  id: string;
  day: string;
  date: string;
  month: string;
  isToday: boolean;
};

type DragDraft = {
  dayIndex: number;
  startSlot: number;
  currentSlot: number;
};

type CalendarFrame = {
  pageX: number;
  pageY: number;
  width: number;
  height: number;
};

type CandidateEdit = {
  id: string;
  action: "move" | "resize-end";
  dayIndex: number;
  startSlot: number;
  endSlot: number;
};

type CandidateTouchState = {
  timer: ReturnType<typeof setTimeout>;
  mode: "pending" | "editing";
  id: string;
  action: "move" | "resize-end";
  startX: number;
  startY: number;
  originalDayIndex: number;
  originalStartSlot: number;
  originalEndSlot: number;
  pointerStartOffsetSlots: number;
};

const DAYS = buildMeetupDays();
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const SLOT_MINUTES = 15;
const SLOT_COUNT = 24 * (60 / SLOT_MINUTES);
const SLOT_HEIGHT = 16;
const HOUR_HEIGHT = SLOT_HEIGHT * (60 / SLOT_MINUTES);
const TIME_LABEL_WIDTH = 52;
const CALENDAR_TOP_PADDING = 16;
const CALENDAR_BOTTOM_PADDING = 72;
const LONG_PRESS_MS = 280;
const TOUCH_CANCEL_PX = 12;
const FALLBACK_COORDINATE = {
  latitude: 35.5075,
  longitude: 139.6174,
};
const PRESET_PLACES = [
  {
    label: "横浜アリーナ 北口",
    coordinate: FALLBACK_COORDINATE,
  },
  {
    label: "新横浜駅 中央改札",
    coordinate: {
      latitude: 35.5079,
      longitude: 139.6179,
    },
  },
];
const TAB_ORDER: ProposalTab[] = ["give", "receive", "meetup"];

export default function ProposalSelectScreen() {
  const params = useLocalSearchParams<{
    tab?: ProposalTab | ProposalTab[];
    gives?: string | string[];
    receives?: string | string[];
    listings?: string | string[];
    candidateId?: string | string[];
  }>();
  const initialTab = parseTab(one(params.tab));
  const givesParam = one(params.gives);
  const receivesParam = one(params.receives);
  const listingsParam = one(params.listings);
  const candidateIdParam = one(params.candidateId);
  const initialGiveIds = useMemo(
    () => parseProposalIdList(givesParam),
    [givesParam],
  );
  const initialReceiveIds = useMemo(
    () => parseProposalIdList(receivesParam),
    [receivesParam],
  );
  const giveChoices = useMemo(
    () => buildProposalChoices(initialGiveIds, "give"),
    [initialGiveIds],
  );
  const receiveChoices = useMemo(
    () => buildProposalChoices(initialReceiveIds, "receive"),
    [initialReceiveIds],
  );
  const [tab, setTab] = useState<ProposalTab>(initialTab);
  const [giveSelectedIds, setGiveSelectedIds] = useState<string[]>(() =>
    initialGiveIds.length > 0
      ? initialGiveIds
      : giveChoices[0]
        ? [giveChoices[0].id]
        : [],
  );
  const [receiveSelectedIds, setReceiveSelectedIds] = useState<string[]>(() =>
    initialReceiveIds.length > 0
      ? initialReceiveIds
      : receiveChoices[0]
        ? [receiveChoices[0].id]
        : [],
  );
  const [meetupCandidates, setMeetupCandidates] = useState<MeetupCandidate[]>([]);
  const [activeMeetupId, setActiveMeetupId] = useState<string | null>(null);
  const [placeSheetId, setPlaceSheetId] = useState<string | null>(null);
  const tabSwipeRef = useRef<{
    startX: number;
    startY: number;
    tracking: boolean;
    swiping: boolean;
  } | null>(null);
  const meetupReady =
    meetupCandidates.length > 0 &&
    meetupCandidates.every((candidate) => candidate.place.trim().length > 0);
  const meetupHasTimeDraft = meetupCandidates.length > 0;

  useEffect(() => {
    setGiveSelectedIds((current) => ensureChoiceSelection(current, giveChoices));
  }, [giveChoices]);

  useEffect(() => {
    setReceiveSelectedIds((current) =>
      ensureChoiceSelection(current, receiveChoices),
    );
  }, [receiveChoices]);

  const tabs = useMemo(
    () => [
      {
        id: "give" as const,
        label: "私が出す",
        count: giveSelectedIds.length,
        color: ihubColors.lavender,
      },
      {
        id: "receive" as const,
        label: "受け取る",
        count: receiveSelectedIds.length,
        color: ihubColors.sky,
      },
      { id: "meetup" as const, label: "待ち合わせ", count: 1, color: ihubColors.pink },
    ],
    [giveSelectedIds.length, receiveSelectedIds.length],
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

      <View
        style={styles.paneHost}
        onTouchStart={handleTabSwipeStart}
        onTouchMove={handleTabSwipeMove}
        onTouchEnd={handleTabSwipeEnd}
        onTouchCancel={handleTabSwipeCancel}
      >
        {tab === "give" ? (
          <ChoicePane
            items={giveChoices}
            selectedIds={giveSelectedIds}
            onToggle={(id) =>
              setGiveSelectedIds((current) => toggleChoiceId(current, id))
            }
          />
        ) : null}

        {tab === "receive" ? (
          <ChoicePane
            items={receiveChoices}
            selectedIds={receiveSelectedIds}
            onToggle={(id) =>
              setReceiveSelectedIds((current) => toggleChoiceId(current, id))
            }
          />
        ) : null}

        {tab === "meetup" ? (
          <MeetupPane
            candidates={meetupCandidates}
            activeCandidateId={activeMeetupId}
            placeSheetId={placeSheetId}
            onSelectCandidate={setActiveMeetupId}
            onClosePlaceSheet={() => setPlaceSheetId(null)}
            onOpenPlaceSheet={(id) => {
              setActiveMeetupId(id);
              setPlaceSheetId(id);
            }}
            onAddCandidate={(dayIndex, startSlot, endSlot) => {
              const id = `candidate-${Date.now()}`;
              const candidate: MeetupCandidate = {
                id,
                dayIndex,
                startSlot,
                endSlot,
                place: "",
                coordinate: FALLBACK_COORDINATE,
              };
              setMeetupCandidates((current) => [...current.slice(0, 2), candidate]);
              setActiveMeetupId(id);
              setPlaceSheetId(id);
            }}
            onDeleteCandidate={(id) => {
              setMeetupCandidates((current) =>
                current.filter((candidate) => candidate.id !== id),
              );
              setActiveMeetupId((current) => (current === id ? null : current));
              setPlaceSheetId((current) => (current === id ? null : current));
            }}
            onUpdateCandidate={(id, patch) => {
              setMeetupCandidates((current) =>
                current.map((candidate) =>
                  candidate.id === id ? { ...candidate, ...patch } : candidate,
                ),
              );
            }}
          />
        ) : null}
      </View>

      <PrimaryButton
        onPress={() => {
          if (tab !== "meetup") {
            setTab("meetup");
            return;
          }
          router.push({
            pathname: "/proposal-confirm",
            params: {
              gives: giveSelectedIds.join(","),
              receives: receiveSelectedIds.join(","),
              ...(listingsParam ? { listings: listingsParam } : {}),
              ...(candidateIdParam ? { candidateId: candidateIdParam } : {}),
              meetups: JSON.stringify(
                meetupCandidates
                  .filter((candidate) => candidate.place.trim())
                  .map((candidate, index) => ({
                    id: candidate.id,
                    label: `候補${index + 1}`,
                    time: `${DAYS[candidate.dayIndex]?.month ?? ""}${DAYS[candidate.dayIndex]?.date ?? ""}日 ${formatSlot(candidate.startSlot)} - ${formatSlot(candidate.endSlot)}`,
                    place: candidate.place,
                    latitude: candidate.coordinate.latitude,
                    longitude: candidate.coordinate.longitude,
                  })),
              ),
            },
          });
        }}
        disabled={tab === "meetup" && !meetupReady}
      >
        {tab === "meetup"
          ? meetupReady
            ? "次へ：送信確認 →"
            : meetupHasTimeDraft
              ? "場所未設定の候補があります"
              : "交換できる時間を設定してください"
          : "待ち合わせへ進む"}
      </PrimaryButton>
    </Screen>
  );

  function moveTabBySwipe(direction: 1 | -1) {
    if (tab === "meetup") return;
    const currentIndex = TAB_ORDER.indexOf(tab);
    const next = TAB_ORDER[currentIndex + direction];
    if (!next) return;
    setTab(next);
  }

  function handleTabSwipeStart(event: GestureResponderEvent) {
    const { pageX, pageY } = event.nativeEvent;
    tabSwipeRef.current = {
      startX: pageX,
      startY: pageY,
      tracking: tab !== "meetup",
      swiping: false,
    };
  }

  function handleTabSwipeMove(event: GestureResponderEvent) {
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

  function handleTabSwipeEnd(event: GestureResponderEvent) {
    const state = tabSwipeRef.current;
    tabSwipeRef.current = null;
    if (!state?.tracking || !state.swiping) return;
    const { pageX, pageY } = event.nativeEvent;
    const dx = pageX - state.startX;
    const dy = pageY - state.startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (absX < 56 || absX < absY * 1.35) return;
    moveTabBySwipe(dx < 0 ? 1 : -1);
  }

  function handleTabSwipeCancel() {
    tabSwipeRef.current = null;
  }
}

function ChoicePane({
  items,
  selectedIds,
  onToggle,
}: {
  items: ProposalChoiceItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.choiceList}
    >
      {items.map((item) => {
        const selected = selectedSet.has(item.id);
        return (
          <Pressable
            key={item.id}
            onPress={() => onToggle(item.id)}
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
  candidates,
  activeCandidateId,
  placeSheetId,
  onSelectCandidate,
  onOpenPlaceSheet,
  onClosePlaceSheet,
  onAddCandidate,
  onDeleteCandidate,
  onUpdateCandidate,
}: {
  candidates: MeetupCandidate[];
  activeCandidateId: string | null;
  placeSheetId: string | null;
  onSelectCandidate: (id: string | null) => void;
  onOpenPlaceSheet: (id: string) => void;
  onClosePlaceSheet: () => void;
  onAddCandidate: (dayIndex: number, startSlot: number, endSlot: number) => void;
  onDeleteCandidate: (id: string) => void;
  onUpdateCandidate: (id: string, patch: Partial<MeetupCandidate>) => void;
}) {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const touchPressRef = useRef<{
    timer: ReturnType<typeof setTimeout>;
    mode: "pending" | "scrolling" | "dragging";
    dayIndex: number;
    startSlot: number;
    startX: number;
    startY: number;
  } | null>(null);
  const candidateTouchRef = useRef<CandidateTouchState | null>(null);
  const candidateEditRef = useRef<CandidateEdit | null>(null);
  const calendarFrameRef = useRef<CalendarFrame | null>(null);
  const calendarGridRef = useRef<View>(null);
  const dragDraftRef = useRef<DragDraft | null>(null);
  const [dragDraft, setDragDraftState] = useState<DragDraft | null>(null);
  const [candidateEdit, setCandidateEditState] =
    useState<CandidateEdit | null>(null);
  const calendarWidth = width - 36;
  const dayWidth = (calendarWidth - TIME_LABEL_WIDTH) / DAYS.length;
  const contentHeight =
    CALENDAR_TOP_PADDING + SLOT_COUNT * SLOT_HEIGHT + CALENDAR_BOTTOM_PADDING;
  const activeCandidate =
    candidates.find((candidate) => candidate.id === placeSheetId) ?? null;
  const previousCandidate = activeCandidate
    ? candidates
        .filter((candidate) => candidate.id !== activeCandidate.id)
        .reverse()
        .find((candidate) => candidate.place.trim()) ?? null
    : null;

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, calendarSlotTop(10 * 4) - 10),
        animated: false,
      });
    }, 60);
    return () => clearTimeout(timer);
  }, []);

  useEffect(
    () => () => {
      clearTouchPress();
      clearCandidateTouch();
    },
    [],
  );

  function setDragDraft(next: DragDraft | null) {
    dragDraftRef.current = next;
    setDragDraftState(next);
  }

  function clearTouchPress() {
    if (touchPressRef.current) {
      clearTimeout(touchPressRef.current.timer);
    }
    touchPressRef.current = null;
  }

  function setCandidateEdit(next: CandidateEdit | null) {
    candidateEditRef.current = next;
    setCandidateEditState(next);
  }

  function clearCandidateTouch() {
    if (candidateTouchRef.current) {
      clearTimeout(candidateTouchRef.current.timer);
    }
    candidateTouchRef.current = null;
    setCandidateEdit(null);
  }

  function measureCalendarFrame() {
    calendarGridRef.current?.measure((_, __, measuredWidth, measuredHeight, pageX, pageY) => {
      calendarFrameRef.current = {
        pageX,
        pageY,
        width: measuredWidth,
        height: measuredHeight,
      };
    });
  }

  function pointToCalendar(pageX: number, pageY: number) {
    const frame = calendarFrameRef.current;
    if (!frame) return null;
    const dayAreaLeft = frame.pageX + TIME_LABEL_WIDTH;
    const dayAreaWidth = Math.max(1, frame.width - TIME_LABEL_WIDTH);
    const rawDayIndex = Math.floor(
      ((pageX - dayAreaLeft) / dayAreaWidth) * DAYS.length,
    );
    const dayIndex = Math.max(0, Math.min(DAYS.length - 1, rawDayIndex));
    return {
      dayIndex,
      slot: slotFromCalendarY(pageY - frame.pageY),
    };
  }

  function beginCandidateEdit(state: CandidateTouchState) {
    clearTimeout(state.timer);
    candidateTouchRef.current = {
      ...state,
      mode: "editing",
    };
    setCandidateEdit({
      id: state.id,
      action: state.action,
      dayIndex: state.originalDayIndex,
      startSlot: state.originalStartSlot,
      endSlot: state.originalEndSlot,
    });
  }

  function updateCandidateEdit(pageX: number, pageY: number) {
    const state = candidateTouchRef.current;
    if (!state || state.mode !== "editing") return;
    const point = pointToCalendar(pageX, pageY);
    if (!point) return;
    const duration = Math.max(
      1,
      state.originalEndSlot - state.originalStartSlot,
    );
    if (state.action === "move") {
      const startSlot = Math.max(
        0,
        Math.min(
          SLOT_COUNT - duration,
          point.slot - state.pointerStartOffsetSlots,
        ),
      );
      setCandidateEdit({
        id: state.id,
        action: state.action,
        dayIndex: point.dayIndex,
        startSlot,
        endSlot: startSlot + duration,
      });
      return;
    }
    const endSlot = Math.max(
      state.originalStartSlot + 1,
      Math.min(SLOT_COUNT, point.slot + 1),
    );
    setCandidateEdit({
      id: state.id,
      action: state.action,
      dayIndex: state.originalDayIndex,
      startSlot: state.originalStartSlot,
      endSlot,
    });
  }

  function handleCandidateTouchStart(
    event: GestureResponderEvent,
    candidate: MeetupCandidate,
    action: "move" | "resize-end",
  ) {
    event.stopPropagation();
    clearTouchPress();
    clearCandidateTouch();
    measureCalendarFrame();
    onSelectCandidate(candidate.id);
    const { pageX, pageY } = event.nativeEvent;
    const duration = Math.max(1, candidate.endSlot - candidate.startSlot);
    const point = pointToCalendar(pageX, pageY);
    const pointerStartOffsetSlots =
      action === "move" && point?.dayIndex === candidate.dayIndex
        ? Math.max(0, Math.min(duration - 1, point.slot - candidate.startSlot))
        : 0;
    const timer = setTimeout(() => {
      const state = candidateTouchRef.current;
      if (!state || state.id !== candidate.id || state.mode !== "pending") {
        return;
      }
      beginCandidateEdit(state);
    }, LONG_PRESS_MS);
    candidateTouchRef.current = {
      timer,
      mode: "pending",
      id: candidate.id,
      action,
      startX: pageX,
      startY: pageY,
      originalDayIndex: candidate.dayIndex,
      originalStartSlot: candidate.startSlot,
      originalEndSlot: candidate.endSlot,
      pointerStartOffsetSlots,
    };
  }

  function handleCandidateTouchMove(event: GestureResponderEvent) {
    const state = candidateTouchRef.current;
    if (!state) return;
    event.stopPropagation();
    const { pageX, pageY } = event.nativeEvent;
    if (state.mode === "pending") {
      const dx = pageX - state.startX;
      const dy = pageY - state.startY;
      if (Math.hypot(dx, dy) > TOUCH_CANCEL_PX) {
        clearCandidateTouch();
      }
      return;
    }
    updateCandidateEdit(pageX, pageY);
  }

  function handleCandidateTouchEnd(event: GestureResponderEvent) {
    const state = candidateTouchRef.current;
    if (!state) return;
    event.stopPropagation();
    if (state.mode === "editing") {
      updateCandidateEdit(event.nativeEvent.pageX, event.nativeEvent.pageY);
      const edit = candidateEditRef.current;
      if (edit) {
        onUpdateCandidate(edit.id, {
          dayIndex: edit.dayIndex,
          startSlot: edit.startSlot,
          endSlot: edit.endSlot,
        });
      }
      clearCandidateTouch();
      return;
    }
    clearCandidateTouch();
    onOpenPlaceSheet(state.id);
  }

  function handleDayTouchStart(e: GestureResponderEvent, dayIndex: number) {
    clearTouchPress();
    const { locationY, pageX, pageY } = e.nativeEvent;
    const startSlot = slotFromLocationY(locationY);
    const timer = setTimeout(() => {
      const press = touchPressRef.current;
      if (!press || press.mode !== "pending") return;
      press.mode = "dragging";
      const draft = { dayIndex, startSlot, currentSlot: startSlot + 3 };
      setDragDraft(draft);
    }, LONG_PRESS_MS);
    touchPressRef.current = {
      timer,
      mode: "pending",
      dayIndex,
      startSlot,
      startX: pageX,
      startY: pageY,
    };
  }

  function handleDayTouchMove(e: GestureResponderEvent) {
    const press = touchPressRef.current;
    if (!press) return;
    const { locationY, pageX, pageY } = e.nativeEvent;
    const dx = pageX - press.startX;
    const dy = pageY - press.startY;
    if (press.mode === "pending" && Math.hypot(dx, dy) > TOUCH_CANCEL_PX) {
      clearTouchPress();
      return;
    }
    if (press.mode !== "dragging") return;
    const currentSlot = slotFromLocationY(locationY);
    setDragDraft({
      dayIndex: press.dayIndex,
      startSlot: press.startSlot,
      currentSlot,
    });
  }

  function handleDayTouchEnd(e: GestureResponderEvent) {
    const draft = dragDraftRef.current;
    clearTouchPress();
    if (!draft) {
      setDragDraft(null);
      return;
    }
    const releaseSlot = slotFromLocationY(e.nativeEvent.locationY);
    const nextDraft = {
      ...draft,
      currentSlot:
        releaseSlot === draft.startSlot ? draft.currentSlot : releaseSlot,
    };
    const range = normalizedDraftRange(nextDraft);
    onAddCandidate(nextDraft.dayIndex, range.startSlot, range.endSlot);
    setDragDraft(null);
  }

  function handleDayTouchCancel() {
    clearTouchPress();
    setDragDraft(null);
  }

  const preview = dragDraft
    ? {
        dayIndex: dragDraft.dayIndex,
        ...normalizedDraftRange(dragDraft),
      }
    : null;

  return (
    <View style={styles.meetupRoot}>
      <View style={styles.days}>
        <View style={styles.dayTimeSpacer} />
        {DAYS.map((day) => (
          <View
            key={day.id}
            style={[styles.dayCell, day.isToday ? styles.dayCellToday : null]}
          >
            <Text
              style={[styles.dayName, day.isToday ? styles.dayNameToday : null]}
            >
              {day.day}
            </Text>
            <Text
              style={[styles.dayDate, day.isToday ? styles.dayDateToday : null]}
            >
              {day.date}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView
        ref={scrollRef}
        scrollEnabled={!dragDraft}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.calendarContent,
          { height: contentHeight },
        ]}
      >
        <View
          ref={calendarGridRef}
          onLayout={measureCalendarFrame}
          style={[styles.calendarGrid, { height: contentHeight }]}
        >
          <View style={[styles.timeAxis, { width: TIME_LABEL_WIDTH }]}>
            {HOURS.map((hour) => (
              <Text
                key={hour}
                  style={[
                    styles.hourLabel,
                    {
                    top: calendarSlotTop(hour * 4) - 7,
                  },
                ]}
              >
                {formatSlot(hour * 4)}
              </Text>
            ))}
          </View>

          {DAYS.map((day, dayIndex) => (
            <View
              key={day.id}
              style={[
                styles.dayColumn,
                {
                  left: TIME_LABEL_WIDTH + dayIndex * dayWidth,
                  width: dayWidth,
                },
              ]}
              onTouchStart={(event) => handleDayTouchStart(event, dayIndex)}
              onTouchMove={handleDayTouchMove}
              onTouchEnd={handleDayTouchEnd}
              onTouchCancel={handleDayTouchCancel}
            >
              {HOURS.map((hour) => (
                <View
                  key={`${day.id}-${hour}`}
                  style={[
                    styles.calendarCell,
                    {
                      top: calendarSlotTop(hour * 4),
                      height: HOUR_HEIGHT,
                    },
                  ]}
                />
              ))}
            </View>
          ))}

          {candidates.map((candidate, index) => {
            const active = candidate.id === activeCandidateId;
            const placeMissing = !candidate.place.trim();
            const edit = candidateEdit?.id === candidate.id ? candidateEdit : null;
            const effective = edit ?? candidate;
            const editing = !!edit;
            return (
              <Pressable
                key={candidate.id}
                delayLongPress={LONG_PRESS_MS}
                onTouchStart={(event) =>
                  handleCandidateTouchStart(event, candidate, "move")
                }
                onTouchMove={handleCandidateTouchMove}
                onTouchEnd={handleCandidateTouchEnd}
                onTouchCancel={clearCandidateTouch}
                style={[
                  styles.candidateBlock,
                  active ? styles.candidateBlockActive : null,
                  placeMissing ? styles.candidateBlockMissing : null,
                  editing ? styles.candidateBlockEditing : null,
                  {
                    left: TIME_LABEL_WIDTH + effective.dayIndex * dayWidth + 4,
                    top: calendarSlotTop(effective.startSlot) + 3,
                    width: dayWidth - 8,
                    height:
                      Math.max(1, effective.endSlot - effective.startSlot) *
                        SLOT_HEIGHT -
                      6,
                  },
                ]}
              >
                {placeMissing ? (
                  <View style={styles.candidateAlert}>
                    <Text style={styles.candidateAlertText}>!</Text>
                  </View>
                ) : (
                  <Text numberOfLines={2} style={styles.candidatePlace}>
                    {candidate.place}
                  </Text>
                )}
                <Pressable
                  accessibilityLabel={`候補${index + 1}を削除`}
                  onPress={(event) => {
                    event.stopPropagation();
                    onDeleteCandidate(candidate.id);
                  }}
                  style={[
                    styles.candidateDelete,
                    placeMissing ? styles.candidateDeleteMissing : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.candidateDeleteText,
                      placeMissing ? styles.candidateDeleteTextMissing : null,
                    ]}
                  >
                    ×
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityLabel={`候補${index + 1}の終了時間を変更`}
                  onTouchStart={(event) =>
                    handleCandidateTouchStart(event, candidate, "resize-end")
                  }
                  onTouchMove={handleCandidateTouchMove}
                  onTouchEnd={handleCandidateTouchEnd}
                  onTouchCancel={clearCandidateTouch}
                  style={[
                    styles.candidateResizeHandle,
                    placeMissing ? styles.candidateResizeHandleMissing : null,
                  ]}
                />
              </Pressable>
            );
          })}

          {preview ? (
            <View
              pointerEvents="none"
              style={[
                styles.dragPreview,
                {
                  left: TIME_LABEL_WIDTH + preview.dayIndex * dayWidth + 4,
                  top: calendarSlotTop(preview.startSlot) + 3,
                  width: dayWidth - 8,
                  height:
                    Math.max(1, preview.endSlot - preview.startSlot) *
                      SLOT_HEIGHT -
                    6,
                },
              ]}
            />
          ) : null}

          {candidates.length === 0 && !preview ? (
            <View style={styles.calendarHint}>
              <Text style={styles.calendarHintText}>
                長押しで時間を選択できるよ
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <PlaceSheet
        candidate={activeCandidate}
        previousCandidate={previousCandidate}
        onClose={onClosePlaceSheet}
        onUpdate={(patch) => {
          if (!activeCandidate) return;
          onUpdateCandidate(activeCandidate.id, patch);
        }}
      />
    </View>
  );
}

function PlaceSheet({
  candidate,
  previousCandidate,
  onClose,
  onUpdate,
}: {
  candidate: MeetupCandidate | null;
  previousCandidate: MeetupCandidate | null;
  onClose: () => void;
  onUpdate: (patch: Partial<MeetupCandidate>) => void;
}) {
  const [placeDraft, setPlaceDraft] = useState("");
  const [coordinateDraft, setCoordinateDraft] =
    useState<MapCoordinate>(FALLBACK_COORDINATE);

  useEffect(() => {
    if (!candidate) return;
    setPlaceDraft(candidate.place);
    setCoordinateDraft(candidate.coordinate);
  }, [candidate]);

  if (!candidate) return null;

  function applyPreset(index: number) {
    const preset = PRESET_PLACES[index] ?? PRESET_PLACES[0];
    setPlaceDraft(preset.label);
    setCoordinateDraft(preset.coordinate);
  }

  function confirm() {
    onUpdate({
      place: placeDraft.trim() || PRESET_PLACES[0].label,
      coordinate: coordinateDraft,
    });
    onClose();
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.placeBackdrop} onPress={onClose}>
        <Pressable style={styles.placeSheet}>
          <View style={styles.placeHandle} />
          <View style={styles.placeHeader}>
            <View>
              <Text style={styles.placeKicker}>
                {formatCandidateRange(candidate)}
              </Text>
              <Text style={styles.placeTitle}>交換できる場所</Text>
            </View>
            <Pressable onPress={onClose} style={styles.placeClose}>
              <Text style={styles.placeCloseText}>×</Text>
            </Pressable>
          </View>

          <View style={styles.placeActions}>
            <Pressable onPress={() => applyPreset(0)} style={styles.placeAction}>
              <Text style={styles.placeActionText}>現在地を中心に</Text>
            </Pressable>
            <Pressable
              disabled={!previousCandidate}
              onPress={() => {
                if (!previousCandidate) return;
                setPlaceDraft(previousCandidate.place);
                setCoordinateDraft(previousCandidate.coordinate);
              }}
              style={[
                styles.placeAction,
                styles.placeActionStrong,
                !previousCandidate ? styles.placeActionDisabled : null,
              ]}
            >
              <Text style={styles.placeActionStrongText}>前の設定と同じに</Text>
            </Pressable>
          </View>

          <TextInput
            value={placeDraft}
            onChangeText={setPlaceDraft}
            placeholder="取得中"
            placeholderTextColor="rgba(58,50,74,0.34)"
            style={styles.placeInput}
          />

          <View style={styles.placeMapWrap}>
            <NativeMapPreview
              center={coordinateDraft}
              markers={[
                {
                  id: "selected",
                  coordinate: coordinateDraft,
                  label: "!",
                  title: placeDraft || "交換できる場所",
                },
              ]}
              interactive
              height={210}
              onPress={(coordinate) => {
                setCoordinateDraft(coordinate);
                if (!placeDraft.trim()) setPlaceDraft(PRESET_PLACES[0].label);
              }}
            />
          </View>

          <View style={styles.placePresetRow}>
            {PRESET_PLACES.map((preset, index) => (
              <Pressable
                key={preset.label}
                onPress={() => applyPreset(index)}
                style={styles.placePreset}
              >
                <Text numberOfLines={1} style={styles.placePresetText}>
                  {preset.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <PrimaryButton onPress={confirm}>この場所にする</PrimaryButton>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function buildMeetupDays(): MeetupDay[] {
  const weekday = ["日", "月", "火", "水", "木", "金", "土"];
  const now = new Date();
  const todayKey = dateKey(now);
  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() + index);
    return {
      id: dateKey(date),
      day: weekday[date.getDay()] ?? "",
      date: String(date.getDate()),
      month: `${date.getMonth() + 1}月`,
      isToday: dateKey(date) === todayKey,
    };
  });
}

function dateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function slotFromLocationY(locationY: number) {
  return slotFromCalendarY(locationY);
}

function slotFromCalendarY(calendarY: number) {
  const raw = Math.floor((calendarY - CALENDAR_TOP_PADDING) / SLOT_HEIGHT);
  return Math.max(0, Math.min(SLOT_COUNT - 1, raw));
}

function normalizedDraftRange(draft: DragDraft) {
  const startSlot = Math.min(draft.startSlot, draft.currentSlot);
  const endSlot = Math.max(draft.startSlot, draft.currentSlot) + 1;
  return {
    startSlot: Math.max(0, Math.min(SLOT_COUNT - 1, startSlot)),
    endSlot: Math.max(1, Math.min(SLOT_COUNT, endSlot)),
  };
}

function calendarSlotTop(slot: number) {
  return CALENDAR_TOP_PADDING + slot * SLOT_HEIGHT;
}

function formatSlot(slot: number) {
  const minutes = Math.max(0, Math.min(24 * 60, slot * SLOT_MINUTES));
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function formatCandidateRange(candidate: MeetupCandidate) {
  const day = DAYS[candidate.dayIndex];
  return `${day?.month ?? ""}${day?.date ?? ""}日 ${formatSlot(candidate.startSlot)} - ${formatSlot(candidate.endSlot)}`;
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

function ensureChoiceSelection(
  current: string[],
  choices: ProposalChoiceItem[],
) {
  const choiceIds = new Set(choices.map((choice) => choice.id));
  const valid = current.filter((id) => choiceIds.has(id));
  if (valid.length > 0) return valid;
  return choices[0] ? [choices[0].id] : [];
}

function toggleChoiceId(current: string[], id: string) {
  if (current.includes(id)) {
    return current.length > 1
      ? current.filter((selectedId) => selectedId !== id)
      : current;
  }
  return [...current, id];
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
  paneHost: {
    flex: 1,
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
    borderTopColor: "rgba(58,50,74,0.08)",
    borderTopWidth: 1,
    flex: 1,
    overflow: "hidden",
  },
  days: {
    borderBottomColor: "rgba(58,50,74,0.08)",
    borderBottomWidth: 1,
    flexDirection: "row",
  },
  dayTimeSpacer: {
    width: TIME_LABEL_WIDTH,
  },
  dayCell: {
    alignItems: "center",
    flex: 1,
    paddingBottom: 9,
    paddingTop: 7,
  },
  dayCellToday: {
    backgroundColor: "rgba(166,149,216,0.10)",
  },
  dayName: {
    color: ihubColors.mutedInk,
    fontSize: 11,
    fontWeight: "900",
  },
  dayNameToday: {
    color: ihubColors.lavender,
  },
  dayDate: {
    color: ihubColors.ink,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 2,
  },
  dayDateToday: {
    color: ihubColors.lavender,
  },
  calendarContent: {
    paddingBottom: 36,
  },
  calendarGrid: {
    position: "relative",
  },
  timeAxis: {
    bottom: 0,
    left: 0,
    position: "absolute",
    top: 0,
  },
  hourLabel: {
    color: ihubColors.mutedInk,
    fontSize: 11,
    fontWeight: "800",
    position: "absolute",
    textAlign: "center",
    width: TIME_LABEL_WIDTH,
  },
  dayColumn: {
    borderLeftColor: "rgba(58,50,74,0.07)",
    borderLeftWidth: 1,
    bottom: 0,
    position: "absolute",
    top: 0,
  },
  calendarCell: {
    borderBottomColor: "rgba(58,50,74,0.055)",
    borderBottomWidth: 1,
    position: "absolute",
    width: "100%",
  },
  dragPreview: {
    backgroundColor: "rgba(36,167,242,0.20)",
    borderColor: "rgba(36,167,242,0.65)",
    borderRadius: 11,
    borderWidth: 1,
    position: "absolute",
  },
  candidateBlock: {
    alignItems: "center",
    backgroundColor: "rgba(75,151,224,0.22)",
    borderColor: "rgba(75,151,224,0.54)",
    borderRadius: 13,
    borderWidth: 1,
    justifyContent: "center",
    overflow: "hidden",
    position: "absolute",
    shadowColor: "#4b97e0",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
  },
  candidateBlockActive: {
    borderColor: "rgba(166,149,216,0.88)",
    shadowColor: ihubColors.lavender,
    shadowOpacity: 0.2,
  },
  candidateBlockEditing: {
    shadowColor: ihubColors.ink,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.24,
    shadowRadius: 22,
    transform: [{ translateY: -4 }, { scale: 1.03 }],
    zIndex: 30,
  },
  candidateBlockMissing: {
    backgroundColor: "rgba(75,151,224,0.12)",
    borderColor: "rgba(230,149,67,0.58)",
    borderStyle: "dashed",
  },
  candidateAlert: {
    alignItems: "center",
    backgroundColor: "#f29d4b",
    borderRadius: 999,
    height: 25,
    justifyContent: "center",
    width: 25,
  },
  candidateAlertText: {
    color: ihubColors.surface,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 18,
    textAlign: "center",
  },
  candidatePlace: {
    color: "#256aa8",
    fontSize: 10.5,
    fontWeight: "900",
    lineHeight: 14,
    paddingHorizontal: 5,
    textAlign: "center",
  },
  candidateDelete: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.82)",
    borderRadius: 999,
    height: 20,
    justifyContent: "center",
    position: "absolute",
    right: 4,
    top: 4,
    width: 20,
  },
  candidateDeleteMissing: {
    backgroundColor: "rgba(242,157,75,0.16)",
  },
  candidateDeleteText: {
    color: "#256aa8",
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 15,
  },
  candidateDeleteTextMissing: {
    color: "#d98232",
  },
  candidateResizeHandle: {
    backgroundColor: "rgba(255,255,255,0.62)",
    borderRadius: 999,
    bottom: 3,
    height: 5,
    left: 10,
    position: "absolute",
    right: 10,
  },
  candidateResizeHandleMissing: {
    backgroundColor: "rgba(242,157,75,0.48)",
  },
  calendarHint: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(24,22,32,0.42)",
    borderRadius: 999,
    justifyContent: "center",
    left: "50%",
    marginLeft: -110,
    paddingHorizontal: 18,
    paddingVertical: 12,
    position: "absolute",
    top: 260,
    width: 220,
  },
  calendarHintText: {
    color: ihubColors.surface,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
  },
  placeBackdrop: {
    backgroundColor: "rgba(18,16,26,0.34)",
    flex: 1,
    justifyContent: "flex-end",
  },
  placeSheet: {
    backgroundColor: ihubColors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    gap: 12,
    paddingBottom: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  placeHandle: {
    alignSelf: "center",
    backgroundColor: "rgba(58,50,74,0.18)",
    borderRadius: 999,
    height: 4,
    width: 42,
  },
  placeHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  placeKicker: {
    color: ihubColors.lavender,
    fontSize: 11,
    fontWeight: "900",
  },
  placeTitle: {
    color: ihubColors.ink,
    fontSize: 21,
    fontWeight: "900",
    marginTop: 2,
  },
  placeClose: {
    alignItems: "center",
    backgroundColor: "rgba(58,50,74,0.06)",
    borderRadius: 999,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  placeCloseText: {
    color: ihubColors.mutedInk,
    fontSize: 21,
    fontWeight: "900",
    lineHeight: 22,
  },
  placeActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  placeAction: {
    backgroundColor: "rgba(58,50,74,0.06)",
    borderRadius: ihubRadii.pill,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  placeActionText: {
    color: ihubColors.ink,
    fontSize: 11.5,
    fontWeight: "900",
  },
  placeActionStrong: {
    backgroundColor: "rgba(166,149,216,0.14)",
    borderColor: "rgba(166,149,216,0.28)",
    borderWidth: 1,
    marginLeft: "auto",
  },
  placeActionStrongText: {
    color: ihubColors.lavender,
    fontSize: 11.5,
    fontWeight: "900",
  },
  placeActionDisabled: {
    opacity: 0.45,
  },
  placeInput: {
    backgroundColor: "rgba(58,50,74,0.045)",
    borderColor: "rgba(58,50,74,0.08)",
    borderRadius: 14,
    borderWidth: 1,
    color: ihubColors.ink,
    fontSize: 14,
    fontWeight: "800",
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  placeMapWrap: {
    borderRadius: 18,
    overflow: "hidden",
  },
  placePresetRow: {
    flexDirection: "row",
    gap: 8,
  },
  placePreset: {
    backgroundColor: "rgba(168,212,230,0.16)",
    borderRadius: ihubRadii.pill,
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  placePresetText: {
    color: "#3478c7",
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
  },
});
