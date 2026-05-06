"use client";

import dynamic from "next/dynamic";
import {
  type MouseEvent,
  type TouchEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PrimaryButton } from "@/components/auth/PrimaryButton";
import { createProposal, reviseProposal } from "../actions";

/* MapPicker は SSR 不可（leaflet が window 必要） */
const MapPicker = dynamic(() => import("@/components/map/MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#e8eef0] text-[11px] text-[#3a324a8c]">
      地図を読み込み中…
    </div>
  ),
});

/* ─── types ─────────────────────────────────────────────── */

export type ProposeInv = {
  id: string;
  title: string;
  quantity: number;
  photoUrl: string | null;
  groupId: string | null;
  characterId: string | null;
  goodsTypeId: string;
  groupName: string | null;
  characterName: string | null;
  goodsTypeName: string | null;
  /** 相手 wish にヒット（mine 側）/ 自分 wish にヒット（theirs 側） */
  wishMatch?: boolean;
};

type Partner = {
  id: string;
  handle: string;
  displayName: string;
  primaryArea: string | null;
  localModeEnabled: boolean;
  localModeAW: {
    venue: string;
    centerLat: number | null;
    centerLng: number | null;
    startAt: string; // ISO
    endAt: string; // ISO
  } | null;
};

type Selectable = ProposeInv & {
  selected: boolean;
  selectedQty: number;
};
type MeetupMode = "today" | "scheduled";
type MeetupCandidate = {
  id: string;
  mode: MeetupMode;
  start: string;
  end: string;
  place: string;
  center: [number, number];
};
type MeetupCandidatePayload = {
  startAt: string;
  endAt: string;
  placeName: string;
  lat: number;
  lng: number;
  mode: MeetupMode;
};

// iter138: "message" step は廃止（confirm でメッセージ入力可）
type Step = "select" | "confirm";
type Tab = "mine" | "theirs" | "meetup";
const PROPOSE_TAB_ORDER: Tab[] = ["mine", "theirs", "meetup"];

type Props = {
  partner: Partner;
  myInv: ProposeInv[];
  theirInv: ProposeInv[];
  matchType: "perfect" | "forward" | "backward";
  initialTab?: Tab;
  /** iter67.7：listing/option 経由打診の初期値プリフィル
   *  iter70-C：再打診の元 proposal id・既存 meetup・message も載せられる */
  initial?: {
    senderHaveIds: string[];
    senderHaveQtys: number[];
    receiverHaveIds: string[];
    receiverHaveQtys: number[];
    cashOffer?: { amount: number };
    listingId?: string;
    reviseFromProposalId?: string;
    meetupStartAt?: string;
    meetupEndAt?: string;
    meetupPlaceName?: string;
    meetupLat?: number;
    meetupLng?: number;
    meetupCandidates?: MeetupCandidatePayload[];
    message?: string;
  };
};

/* Tokyo Station fallback */
const FALLBACK_CENTER: [number, number] = [35.6812, 139.7671];

type Place = { display_name: string; lat: string; lon: string; address?: Record<string, string> };

/* ─── helpers ───────────────────────────────────────────── */

function formatTokyoLocalFromDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("ja-JP-u-ca-gregory", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function parseTokyoLocal(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(s);
  if (!m) return new Date(s);
  const [, y, mo, d, h, mi] = m;
  return new Date(
    Date.UTC(
      Number(y),
      Number(mo) - 1,
      Number(d),
      Number(h) - 9,
      Number(mi),
    ),
  );
}

function roundUpTokyoLocal(minutes = 30, base = new Date()): string {
  const d = new Date(base.getTime());
  const next = Math.ceil(d.getMinutes() / minutes) * minutes;
  d.setMinutes(next, 0, 0);
  return formatTokyoLocalFromDate(d);
}

function addMinutesToTokyoLocal(local: string, minutes: number): string {
  const d = parseTokyoLocal(local);
  d.setMinutes(d.getMinutes() + minutes);
  return formatTokyoLocalFromDate(d);
}

function setTokyoLocalTime(local: string, hour: number, minute = 0): string {
  const date = local.slice(0, 10) || roundUpTokyoLocal().slice(0, 10);
  return `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function addDaysToTokyoLocal(local: string, days: number): string {
  const d = parseTokyoLocal(local || roundUpTokyoLocal());
  d.setDate(d.getDate() + days);
  return formatTokyoLocalFromDate(d);
}

/** ISO → JST datetime-local（YYYY-MM-DDTHH:mm） */
function isoToLocal(iso: string): string {
  return formatTokyoLocalFromDate(new Date(iso));
}
/** JST datetime-local → ISO */
function localToIso(s: string): string {
  if (!s) return "";
  return parseTokyoLocal(s).toISOString();
}
function nowPlusHoursLocal(h: number): string {
  return formatTokyoLocalFromDate(new Date(Date.now() + h * 60 * 60_000));
}

/** wishMatch を先頭にソート（同フラグ内は元の順） */
function sortByWishFirst<T extends { wishMatch?: boolean }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => {
    const aw = a.wishMatch ? 1 : 0;
    const bw = b.wishMatch ? 1 : 0;
    return bw - aw;
  });
}

/**
 * iter110: 関係図で選んだ項目（preselectedIds に含まれる）を最上位、
 * 次に wishMatch、次に残り の順でソート
 */
function sortBySelectionFirst<T extends { id: string; wishMatch?: boolean }>(
  arr: T[],
  preselectedIds: Set<string>,
): T[] {
  return [...arr].sort((a, b) => {
    const aSel = preselectedIds.has(a.id) ? 1 : 0;
    const bSel = preselectedIds.has(b.id) ? 1 : 0;
    if (aSel !== bSel) return bSel - aSel;
    const aw = a.wishMatch ? 1 : 0;
    const bw = b.wishMatch ? 1 : 0;
    return bw - aw;
  });
}

function splitTokyoLocal(local: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return null;
  return {
    y: Number(m[1]),
    mo: Number(m[2]),
    d: Number(m[3]),
    h: m[4],
    mi: m[5],
    dateKey: `${m[1]}-${m[2]}-${m[3]}`,
  };
}

function formatRange(startLocal: string, endLocal: string): string {
  if (!startLocal || !endLocal) return "";
  const s = splitTokyoLocal(startLocal);
  const e = splitTokyoLocal(endLocal);
  if (!s || !e) return "";
  const sameDay = s.dateKey === e.dateKey;
  const dateFmt = (p: NonNullable<ReturnType<typeof splitTokyoLocal>>) =>
    `${p.mo}/${p.d}(${"日月火水木金土"[new Date(Date.UTC(p.y, p.mo - 1, p.d)).getUTCDay()]})`;
  const timeFmt = (p: NonNullable<ReturnType<typeof splitTokyoLocal>>) =>
    `${p.h}:${p.mi}`;
  return sameDay
    ? `${dateFmt(s)} ${timeFmt(s)}〜${timeFmt(e)}`
    : `${dateFmt(s)} ${timeFmt(s)} 〜 ${dateFmt(e)} ${timeFmt(e)}`;
}

function meetupCandidateIsSet(candidate: MeetupCandidate): boolean {
  return (
    !!candidate.start &&
    !!candidate.end &&
    !!candidate.place.trim() &&
    new Date(localToIso(candidate.end)) > new Date(localToIso(candidate.start))
  );
}

function toMeetupPayload(
  candidate: MeetupCandidate,
): MeetupCandidatePayload {
  return {
    startAt: localToIso(candidate.start),
    endAt: localToIso(candidate.end),
    placeName: candidate.place.trim(),
    lat: candidate.center[0],
    lng: candidate.center[1],
    mode: candidate.mode,
  };
}

function labelFromAddress(p: Place): string {
  if (!p.address) return p.display_name.split(",")[0] ?? p.display_name;
  const a = p.address;
  return (
    a.amenity ||
    a.attraction ||
    a.shop ||
    a.station ||
    a.railway ||
    a.building ||
    a.tourism ||
    a.leisure ||
    a.suburb ||
    p.display_name.split(",")[0] ||
    p.display_name
  );
}

function shouldIgnoreProposeSwipe(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      "input, textarea, select, [contenteditable='true'], [data-propose-swipe-ignore], .leaflet-container",
    ),
  );
}

/* ─── main component ────────────────────────────────────── */

export function ProposeFlow({
  partner,
  myInv,
  theirInv,
  matchType,
  initialTab = "mine",
  initial,
}: Props) {
  const router = useRouter();

  /* ── 提示物 state（initial があれば優先、なければ wishMatch pre-check） ── */
  const initialSenderIdSet = useMemo(
    () => new Set(initial?.senderHaveIds ?? []),
    [initial],
  );
  const initialReceiverIdSet = useMemo(
    () => new Set(initial?.receiverHaveIds ?? []),
    [initial],
  );
  const initialSenderQtyById = useMemo(() => {
    const m = new Map<string, number>();
    if (initial) {
      initial.senderHaveIds.forEach((id, i) => {
        m.set(id, initial.senderHaveQtys[i] ?? 1);
      });
    }
    return m;
  }, [initial]);
  const initialReceiverQtyById = useMemo(() => {
    const m = new Map<string, number>();
    if (initial) {
      initial.receiverHaveIds.forEach((id, i) => {
        m.set(id, initial.receiverHaveQtys[i] ?? 1);
      });
    }
    return m;
  }, [initial]);

  // iter110: 関係図で選んだ項目を最上位に
  //   initial がある（関係図経由）→ initialSenderIdSet/initialReceiverIdSet 優先
  //   なし → 従来通り wishMatch 優先
  const myItemsSorted = initial
    ? sortBySelectionFirst(myInv, initialSenderIdSet)
    : sortByWishFirst(myInv);
  const theirItemsSorted = initial
    ? sortBySelectionFirst(theirInv, initialReceiverIdSet)
    : sortByWishFirst(theirInv);

  const [myItems, setMyItems] = useState<Selectable[]>(() =>
    myItemsSorted.map((i) => {
      const checked = initial
        ? initialSenderIdSet.has(i.id)
        : (matchType === "perfect" || matchType === "forward") &&
          i.wishMatch === true;
      const qty = checked
        ? initialSenderQtyById.get(i.id) ?? i.quantity
        : 1;
      return {
        ...i,
        selected: checked,
        selectedQty: qty,
      };
    }),
  );
  const [theirItems, setTheirItems] = useState<Selectable[]>(() =>
    theirItemsSorted.map((i) => {
      const checked = initial
        ? initialReceiverIdSet.has(i.id)
        : (matchType === "perfect" || matchType === "backward") &&
          i.wishMatch === true;
      const qty = checked
        ? initialReceiverQtyById.get(i.id) ?? i.quantity
        : 1;
      return {
        ...i,
        selected: checked,
        selectedQty: qty,
      };
    }),
  );

  /* ── 定価交換モード（initial.cashOffer があれば true） ── */
  const cashOffer = initial?.cashOffer;
  const isCashMode = !!cashOffer;

  /* ── 待ち合わせ state（時間帯 + 地図） ──
     iter70-C: 再打診の場合は元 proposal の値を最優先 */
  const initStart = initial?.meetupStartAt
    ? isoToLocal(initial.meetupStartAt)
    : partner.localModeAW?.startAt
      ? isoToLocal(partner.localModeAW.startAt)
      : nowPlusHoursLocal(1);
  const initEnd = initial?.meetupEndAt
    ? isoToLocal(initial.meetupEndAt)
    : partner.localModeAW?.endAt
      ? isoToLocal(partner.localModeAW.endAt)
      : nowPlusHoursLocal(2);
  const initPlace =
    initial?.meetupPlaceName ?? partner.localModeAW?.venue ?? "";
  const initLat =
    initial?.meetupLat ??
    partner.localModeAW?.centerLat ??
    FALLBACK_CENTER[0];
  const initLng =
    initial?.meetupLng ??
    partner.localModeAW?.centerLng ??
    FALLBACK_CENTER[1];

  const buildInitialMeetupCandidates = (): MeetupCandidate[] => {
    const fromInitial =
      initial?.meetupCandidates?.slice(0, 3).map((candidate, index) => ({
        id: `candidate-${index + 1}`,
        mode: candidate.mode,
        start: isoToLocal(candidate.startAt),
        end: isoToLocal(candidate.endAt),
        place: candidate.placeName,
        center: [candidate.lat, candidate.lng] as [number, number],
      })) ?? [];
    if (fromInitial.length > 0) return fromInitial;
    return [
      {
        id: "candidate-1",
        mode: partner.localModeEnabled ? "today" : "scheduled",
        start: initStart,
        end: initEnd,
        place: initPlace,
        center: [initLat, initLng],
      },
    ];
  };

  const [meetupCandidates, setMeetupCandidates] =
    useState<MeetupCandidate[]>(buildInitialMeetupCandidates);
  const [activeMeetupId, setActiveMeetupId] = useState("candidate-1");
  const activeMeetup =
    meetupCandidates.find((candidate) => candidate.id === activeMeetupId) ??
    meetupCandidates[0];
  const meetupStart = activeMeetup?.start ?? "";
  const meetupEnd = activeMeetup?.end ?? "";
  const meetupPlace = activeMeetup?.place ?? "";
  const meetupCenter = activeMeetup?.center ?? FALLBACK_CENTER;

  /** ユーザーが place 入力欄を直接編集している間は reverse-geocode で上書きしない */
  const placeManuallyEditedRef = useRef(false);
  /** 地図移動が「ユーザー操作由来」かを管理 */
  const skipReverseRef = useRef(true); // 初回 mount は reverse しない（pre-fill 値を尊重）
  const [reverseFetching, setReverseFetching] = useState(false);

  /* 地図検索 */
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  /* ── ステップ・タブ ── */
  const [step, setStep] = useState<Step>("select");
  const [tab, setTab] = useState<Tab>(initialTab);
  const swipeStateRef = useRef<{
    startX: number;
    startY: number;
    tracking: boolean;
    swiping: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const suppressClickTimerRef = useRef<number | null>(null);

  /* ── メッセージ（iter138: tone / 自動テンプレ廃止、空文字スタート） ── */
  const [exposeCalendar, setExposeCalendar] = useState(true); // iter138: デフォルト ON
  const [message, setMessage] = useState<string>(initial?.message ?? "");

  /* ── 送信状態 ── */
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  /* ── derived ── */
  const myCount = myItems
    .filter((i) => i.selected)
    .reduce((s, i) => s + i.selectedQty, 0);
  const theirCount = theirItems
    .filter((i) => i.selected)
    .reduce((s, i) => s + i.selectedQty, 0);

  const validMeetupCandidates = meetupCandidates.filter(meetupCandidateIsSet);
  const primaryMeetup = validMeetupCandidates[0];
  const meetupSet = validMeetupCandidates.length > 0;

  // 定価交換モードでは receivers (相手の譲) は要らない（金銭で受け取る/支払う）
  const canProceedSelect = isCashMode
    ? myCount > 0 && meetupSet
    : myCount > 0 && theirCount > 0 && meetupSet;

  // iter138: 自動テンプレ廃止。メッセージは confirm 画面で任意入力。

  function updateActiveMeetup(patch: Partial<MeetupCandidate>) {
    setMeetupCandidates((prev) =>
      prev.map((candidate) =>
        candidate.id === activeMeetupId
          ? {
              ...candidate,
              ...patch,
            }
          : candidate,
      ),
    );
  }

  function selectMeetupCandidate(id: string) {
    skipReverseRef.current = true;
    placeManuallyEditedRef.current = false;
    setActiveMeetupId(id);
  }

  function addMeetupCandidate() {
    if (meetupCandidates.length >= 3 || !activeMeetup) return;
    const id = `candidate-${Date.now()}`;
    const baseEnd = Number.isNaN(parseTokyoLocal(activeMeetup.end).getTime())
      ? roundUpTokyoLocal()
      : activeMeetup.end;
    const next: MeetupCandidate = {
      ...activeMeetup,
      id,
      start: addMinutesToTokyoLocal(baseEnd, 30),
      end: addMinutesToTokyoLocal(baseEnd, 120),
    };
    setMeetupCandidates((prev) => [...prev, next]);
    setActiveMeetupId(id);
    skipReverseRef.current = true;
  }

  function removeMeetupCandidate(id: string) {
    if (meetupCandidates.length <= 1) return;
    const next = meetupCandidates.filter((candidate) => candidate.id !== id);
    setMeetupCandidates(next);
    if (activeMeetupId === id) {
      setActiveMeetupId(next[0]?.id ?? "candidate-1");
      skipReverseRef.current = true;
    }
  }

  function applyTodayPreset(kind: "30m" | "1h" | "2h" | "today") {
    const start = roundUpTokyoLocal(30);
    const end =
      kind === "30m"
        ? addMinutesToTokyoLocal(start, 30)
        : kind === "1h"
          ? addMinutesToTokyoLocal(start, 60)
          : kind === "2h"
            ? addMinutesToTokyoLocal(start, 120)
            : setTokyoLocalTime(start, 22, 0);
    updateActiveMeetup({ mode: "today", start, end });
  }

  function applyScheduledDay(day: "today" | "tomorrow") {
    const base =
      day === "tomorrow"
        ? addDaysToTokyoLocal(roundUpTokyoLocal(), 1)
        : roundUpTokyoLocal();
    const start = setTokyoLocalTime(base, 15, 0);
    updateActiveMeetup({
      mode: "scheduled",
      start,
      end: addMinutesToTokyoLocal(start, 120),
    });
  }

  function applyScheduledRange(startHour: number, endHour: number) {
    const start = setTokyoLocalTime(meetupStart, startHour, 0);
    const end = setTokyoLocalTime(meetupStart, endHour, 0);
    updateActiveMeetup({ mode: "scheduled", start, end });
  }

  function copyActivePlaceToAllCandidates() {
    if (!activeMeetup) return;
    setMeetupCandidates((prev) =>
      prev.map((candidate) => ({
        ...candidate,
        place: activeMeetup.place,
        center: activeMeetup.center,
      })),
    );
  }

  /* 地図中心が動いた時の reverse geocoding（自動で場所名を埋める） */
  const reverseAbortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    if (skipReverseRef.current) {
      // 初回 mount or 検索結果から選んだ直後など、自動 reverse をスキップしたい時
      skipReverseRef.current = false;
      return;
    }
    if (placeManuallyEditedRef.current) return; // 手入力モード中は触らない

    const handle = setTimeout(async () => {
      reverseAbortRef.current?.abort();
      const ctrl = new AbortController();
      reverseAbortRef.current = ctrl;
      setReverseFetching(true);
      try {
        const res = await fetch(
          `/api/geocode?lat=${meetupCenter[0]}&lon=${meetupCenter[1]}`,
          { signal: ctrl.signal },
        );
        const data = await res.json();
        if (data && typeof data === "object" && !Array.isArray(data)) {
          const label = labelFromAddress(data as Place);
          if (label) {
            setMeetupCandidates((prev) =>
              prev.map((candidate) =>
                candidate.id === activeMeetupId
                  ? {
                      ...candidate,
                      place: label,
                    }
                  : candidate,
              ),
            );
          }
        }
      } catch {
        // ignore（abort or network error）
      } finally {
        setReverseFetching(false);
      }
    }, 600); // ピンドラッグ中の連続イベントを debounce
    return () => clearTimeout(handle);
  }, [activeMeetupId, meetupCenter]);

  /* 場所検索 debounce */
  const searchAbortRef = useRef<AbortController | null>(null);
  function handleSearchQChange(value: string) {
    setSearchQ(value);
    if (value.trim().length >= 2) return;
    searchAbortRef.current?.abort();
    setSearchResults([]);
    setShowResults(false);
  }

  useEffect(() => {
    const q = searchQ.trim();
    if (q.length < 2) return;
    const handle = setTimeout(async () => {
      searchAbortRef.current?.abort();
      const ctrl = new AbortController();
      searchAbortRef.current = ctrl;
      setSearching(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        const data = (await res.json()) as Place[] | { error: string };
        if (Array.isArray(data)) {
          setSearchResults(data);
          setShowResults(true);
        }
      } catch {
        // ignore (abort or network)
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [searchQ]);

  function pickPlace(p: Place) {
    const lat = parseFloat(p.lat);
    const lon = parseFloat(p.lon);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      // 検索結果由来の label は reverse geocode より信頼できるので確定させる
      placeManuallyEditedRef.current = false;
      skipReverseRef.current = true;
      updateActiveMeetup({
        center: [lat, lon],
        place: labelFromAddress(p),
      });
      setSearchQ("");
      setShowResults(false);
    }
  }

  function useCurrentLocation() {
    if (typeof window === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // 現在地ジャンプは reverse で名前を取り直す
        placeManuallyEditedRef.current = false;
        updateActiveMeetup({
          center: [pos.coords.latitude, pos.coords.longitude],
        });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  /** 地図ピン操作（drag / click） */
  function handleMapCenterChange(lat: number, lng: number) {
    placeManuallyEditedRef.current = false; // 地図動かしたら自動 reverse を許可
    updateActiveMeetup({ center: [lat, lng] });
  }

  /** place 入力欄を手動で編集 */
  function handlePlaceInputChange(value: string) {
    placeManuallyEditedRef.current = true;
    updateActiveMeetup({ place: value });
  }

  /* ── handlers ── */

  function clearSuppressClickTimer() {
    if (suppressClickTimerRef.current && typeof window !== "undefined") {
      window.clearTimeout(suppressClickTimerRef.current);
      suppressClickTimerRef.current = null;
    }
  }

  function suppressNextClick() {
    suppressClickRef.current = true;
    clearSuppressClickTimer();
    if (typeof window === "undefined") return;
    suppressClickTimerRef.current = window.setTimeout(() => {
      suppressClickRef.current = false;
      suppressClickTimerRef.current = null;
    }, 360);
  }

  useEffect(() => {
    return () => clearSuppressClickTimer();
  }, []);

  function moveTabBySwipe(direction: 1 | -1): boolean {
    const currentIndex = PROPOSE_TAB_ORDER.indexOf(tab);
    const next = PROPOSE_TAB_ORDER[currentIndex + direction];
    if (!next) return false;
    setTab(next);
    return true;
  }

  function handleTabSwipeStart(e: TouchEvent<HTMLDivElement>) {
    if (step !== "select" || e.touches.length !== 1) return;
    if (shouldIgnoreProposeSwipe(e.target)) return;
    const touch = e.touches[0];
    swipeStateRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      tracking: true,
      swiping: false,
    };
  }

  function handleTabSwipeMove(e: TouchEvent<HTMLDivElement>) {
    const state = swipeStateRef.current;
    if (!state?.tracking || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const dx = touch.clientX - state.startX;
    const dy = touch.clientY - state.startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (!state.swiping) {
      if (absX > 14 && absX > absY * 1.25) {
        state.swiping = true;
      } else if (absY > 14 && absY > absX * 1.1) {
        state.tracking = false;
        return;
      }
    }

    if (state.swiping) e.preventDefault();
  }

  function handleTabSwipeEnd(e: TouchEvent<HTMLDivElement>) {
    const state = swipeStateRef.current;
    swipeStateRef.current = null;
    if (!state?.tracking || !state.swiping) return;

    const touch = e.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - state.startX;
    const dy = touch.clientY - state.startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (absX < 56 || absX < absY * 1.35) return;

    const moved = moveTabBySwipe(dx < 0 ? 1 : -1);
    if (moved) {
      e.preventDefault();
      suppressNextClick();
    }
  }

  function handleTabSwipeCancel() {
    swipeStateRef.current = null;
  }

  function handleSwipeClickCapture(e: MouseEvent<HTMLDivElement>) {
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    e.preventDefault();
    e.stopPropagation();
  }

  function toggleItem(side: "mine" | "theirs", id: string) {
    const update = (items: Selectable[]) =>
      items.map((i) => {
        if (i.id !== id) return i;
        const ns = !i.selected;
        return {
          ...i,
          selected: ns,
          selectedQty: ns ? i.quantity : 1,
        };
      });
    if (side === "mine") setMyItems(update);
    else setTheirItems(update);
  }

  function updateQty(side: "mine" | "theirs", id: string, delta: number) {
    const update = (items: Selectable[]) =>
      items.map((i) => {
        if (i.id !== id) return i;
        const newQty = Math.max(1, Math.min(i.quantity, i.selectedQty + delta));
        return { ...i, selectedQty: newQty };
      });
    if (side === "mine") setMyItems(update);
    else setTheirItems(update);
  }

  function handleSubmit() {
    setError(null);
    if (!primaryMeetup) {
      setError("交換できる候補を 1 件以上設定してください");
      setTab("meetup");
      setStep("select");
      return;
    }
    const primaryMeetupPayload = toMeetupPayload(primaryMeetup);
    const meetupPayloads = validMeetupCandidates
      .slice(0, 3)
      .map(toMeetupPayload);
    startTransition(async () => {
      const senderHaveIds: string[] = [];
      const senderHaveQtys: number[] = [];
      myItems
        .filter((i) => i.selected)
        .forEach((i) => {
          senderHaveIds.push(i.id);
          senderHaveQtys.push(i.selectedQty);
        });
      const receiverHaveIds: string[] = [];
      const receiverHaveQtys: number[] = [];
      theirItems
        .filter((i) => i.selected)
        .forEach((i) => {
          receiverHaveIds.push(i.id);
          receiverHaveQtys.push(i.selectedQty);
        });

      // iter71-C：再打診の場合は同じ proposal を update + diff を system message に
      if (initial?.reviseFromProposalId) {
        const r = await reviseProposal({
          id: initial.reviseFromProposalId,
          meSenderHaveIds: senderHaveIds,
          meSenderHaveQtys: senderHaveQtys,
          meReceiverHaveIds: isCashMode ? [] : receiverHaveIds,
          meReceiverHaveQtys: isCashMode ? [] : receiverHaveQtys,
          message,
          meetupStartAt: primaryMeetupPayload.startAt,
          meetupEndAt: primaryMeetupPayload.endAt,
          meetupPlaceName: primaryMeetupPayload.placeName,
          meetupLat: primaryMeetupPayload.lat,
          meetupLng: primaryMeetupPayload.lng,
          meetupCandidates: meetupPayloads,
          cashOffer: isCashMode,
          cashAmount: cashOffer?.amount ?? null,
        });
        if (r?.error) {
          setError(r.error);
          return;
        }
        // 同じチャットに戻る
        router.push(`/transactions/${initial.reviseFromProposalId}`);
        return;
      }

      const r = await createProposal({
        receiverId: partner.id,
        matchType,
        senderHaveIds,
        senderHaveQtys,
        // 定価交換モードでは receiver 側は空配列で送信
        receiverHaveIds: isCashMode ? [] : receiverHaveIds,
        receiverHaveQtys: isCashMode ? [] : receiverHaveQtys,
        message,
        // iter138: tone 廃止 → DB 互換のため "standard" で固定送信
        messageTone: "standard",
        meetupStartAt: primaryMeetupPayload.startAt,
        meetupEndAt: primaryMeetupPayload.endAt,
        meetupPlaceName: primaryMeetupPayload.placeName,
        meetupLat: primaryMeetupPayload.lat,
        meetupLng: primaryMeetupPayload.lng,
        meetupCandidates: meetupPayloads,
        exposeCalendar,
        listingId: initial?.listingId ?? null,
        cashOffer: isCashMode,
        cashAmount: cashOffer?.amount ?? null,
      });
      if (r?.error) {
        setError(r.error);
        return;
      }
      router.push("/");
    });
  }

  /* ─── render ─── */

  return (
    <main className="flex flex-1 flex-col bg-[#fbf9fc] pb-[112px] text-[#3a324a]">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[#3a324a14] bg-white/90 px-[18px] pb-3 pt-12 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center gap-3">
          {step === "select" ? (
            <Link href="/" aria-label="戻る" className="flex-shrink-0">
              <ChevronLeft />
            </Link>
          ) : (
            <button
              type="button"
              aria-label="戻る"
              onClick={() => setStep("select")}
              className="flex-shrink-0"
            >
              <ChevronLeft />
            </button>
          )}
          <div className="flex-1">
            <div className="text-[15px] font-bold text-gray-900">
              {step === "select" ? "提示物の選択" : "送信確認"}
            </div>
            <div className="mt-0.5 text-[11px] text-[#3a324a8c]">
              @{partner.handle}
              {partner.primaryArea ? ` ・${partner.primaryArea}` : ""}
            </div>
          </div>
          {/* iter138: STEP X/2 に変更（message ステップ廃止） */}
          <span className="rounded-full bg-[#a695d814] px-2.5 py-1 text-[10.5px] font-extrabold tracking-[0.3px] text-[#a695d8]">
            STEP {step === "select" ? 1 : 2}/2
          </span>
        </div>

        {/* 定価交換モードバナー */}
        {isCashMode && (
          <div className="-mx-[18px] mt-2 flex items-center gap-2 border-b border-[#7a9a8a33] bg-[#7a9a8a14] px-[18px] py-2">
            <span className="text-[14px]">💴</span>
            <div className="flex-1 text-[11.5px] font-bold leading-snug text-[#3a324a]">
              定価交換モード（個別募集の選択肢から）
              <span className="ml-1.5 text-[10.5px] font-normal text-[#3a324a8c]">
                受け取り＝¥{cashOffer?.amount.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {step === "select" && (
          // iter137: PC でタブが横一杯に広がっていた問題を修正
          //   外側 div を mx-auto max-w-md でスマホ幅に固定
          <div className="-mx-[18px] mt-3 border-b border-[#3a324a14]">
            <div className="mx-auto flex max-w-md px-3">
            {(
              [
                { id: "mine", label: "私が出す", count: myCount },
                {
                  id: "theirs",
                  label: isCashMode
                    ? `受け取り ¥${cashOffer?.amount.toLocaleString()}`
                    : "受け取る",
                  count: isCashMode ? "💴" : theirCount,
                },
                {
                  id: "meetup",
                  label: "待ち合わせ",
                  count: meetupSet ? "✓" : "!",
                  state: true as boolean,
                },
              ] as const
            ).map((tt) => {
              const active = tab === tt.id;
              const stateBadge = "state" in tt && tt.state;
              return (
                <button
                  key={tt.id}
                  type="button"
                  onClick={() => setTab(tt.id)}
                  className={`flex flex-1 items-center justify-center gap-1.5 border-b-[2.5px] px-1 py-2.5 text-[12.5px] ${
                    active
                      ? "border-[#a695d8] font-extrabold text-[#a695d8]"
                      : "border-transparent font-semibold text-[#3a324a8c]"
                  }`}
                >
                  {tt.label}
                  <span
                    className={`min-w-[18px] rounded-full px-1.5 py-0.5 text-center text-[10px] font-extrabold tabular-nums ${
                      stateBadge
                        ? meetupSet
                          ? "bg-[#7a9a8a] text-white"
                          : "bg-[#d9826b33] text-[#d9826b]"
                        : active
                          ? "bg-[#a695d8] text-white"
                          : "bg-[#3a324a08] text-[#3a324a8c]"
                    }`}
                  >
                    {tt.count}
                  </span>
                </button>
              );
            })}
            </div>
          </div>
        )}
      </header>

      <div
        className="mx-auto w-full max-w-md flex-1 px-[18px] pt-3.5 [touch-action:pan-y]"
        onTouchStart={handleTabSwipeStart}
        onTouchMove={handleTabSwipeMove}
        onTouchEnd={handleTabSwipeEnd}
        onTouchCancel={handleTabSwipeCancel}
        onClickCapture={handleSwipeClickCapture}
      >
        {step === "select" && tab === "meetup" && (
          <MeetupTab
            partner={partner}
            meetupCandidates={meetupCandidates}
            activeMeetupId={activeMeetupId}
            onSelectCandidate={selectMeetupCandidate}
            onAddCandidate={addMeetupCandidate}
            onRemoveCandidate={removeMeetupCandidate}
            onCandidateModeChange={(mode) => updateActiveMeetup({ mode })}
            onTodayPreset={applyTodayPreset}
            onScheduledDay={applyScheduledDay}
            onScheduledRange={applyScheduledRange}
            onCopyPlaceToAll={copyActivePlaceToAllCandidates}
            meetupStart={meetupStart}
            setMeetupStart={(start) => updateActiveMeetup({ start })}
            meetupEnd={meetupEnd}
            setMeetupEnd={(end) => updateActiveMeetup({ end })}
            meetupPlace={meetupPlace}
            onPlaceInputChange={handlePlaceInputChange}
            meetupCenter={meetupCenter}
            onMapCenterChange={handleMapCenterChange}
            reverseFetching={reverseFetching}
            searchQ={searchQ}
            setSearchQ={handleSearchQChange}
            searchResults={searchResults}
            searching={searching}
            showResults={showResults}
            setShowResults={setShowResults}
            pickPlace={pickPlace}
            useCurrentLocation={useCurrentLocation}
          />
        )}

        {step === "select" && tab !== "meetup" && (
          <>
            {isCashMode && tab === "theirs" ? (
              <div className="rounded-[14px] border-[1.5px] border-[#7a9a8a] bg-[#7a9a8a0a] p-5 text-center">
                <div className="text-[24px]">💴</div>
                <div className="mt-1 text-[14px] font-extrabold text-[#3a324a]">
                  定価交換 ¥{cashOffer?.amount.toLocaleString()}
                </div>
                <div className="mt-2 text-[11.5px] leading-relaxed text-[#3a324a8c]">
                  この打診は <b>金銭での取引</b> です。
                  <br />
                  受け取るアイテムの選択は不要です。
                </div>
              </div>
            ) : (
              <ItemTab
                tab={tab}
                partnerHandle={partner.handle}
                items={tab === "mine" ? myItems : theirItems}
                onToggle={(id) => toggleItem(tab, id)}
                onQty={(id, d) => updateQty(tab, id, d)}
              />
            )}
          </>
        )}

        {/* iter138: message step は廃止 ─ confirm 内でメッセージ + 共有設定を入力 */}

        {step === "confirm" && (
          <ConfirmStep
            partnerHandle={partner.handle}
            myItems={myItems.filter((i) => i.selected)}
            theirItems={theirItems.filter((i) => i.selected)}
            meetupCandidates={validMeetupCandidates}
            meetupStart={primaryMeetup?.start ?? meetupStart}
            meetupEnd={primaryMeetup?.end ?? meetupEnd}
            meetupPlace={primaryMeetup?.place ?? meetupPlace}
            meetupCenter={primaryMeetup?.center ?? meetupCenter}
            message={message}
            onMessageChange={setMessage}
            exposeCalendar={exposeCalendar}
            onExposeCalendarChange={setExposeCalendar}
            error={error}
          />
        )}
      </div>

      {/* Bottom CTA — オーナー指示で 3 行 summary は廃止、CTA だけ */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#3a324a14] bg-white/95 px-[18px] pb-7 pt-3 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-md">
          {step === "select" && (
            <button
              type="button"
              disabled={!canProceedSelect}
              onClick={() => setStep("confirm")}
              className="block w-full rounded-[14px] bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] px-6 py-[14px] text-center text-sm font-bold tracking-[0.3px] text-white shadow-[0_4px_14px_rgba(166,149,216,0.33)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              {canProceedSelect
                ? "次へ：送信確認 →"
                : myCount === 0 || theirCount === 0
                  ? "提示物を両方から選んでください"
                  : "交換できる時間・場所を設定してください"}
            </button>
          )}
          {step === "confirm" && (
            <PrimaryButton
              type="button"
              pending={pending}
              pendingLabel="送信中…"
              onClick={handleSubmit}
            >
              この内容で打診を送信
            </PrimaryButton>
          )}
        </div>
      </div>
    </main>
  );
}

/* ─── sub-components ────────────────────────────────────── */

function ChevronLeft() {
  return (
    <svg width="10" height="16" viewBox="0 0 10 16">
      <path
        d="M8 1L2 8l6 7"
        stroke="#1a1a26"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ItemTab({
  tab,
  partnerHandle,
  items,
  onToggle,
  onQty,
}: {
  tab: "mine" | "theirs";
  partnerHandle: string;
  items: Selectable[];
  onToggle: (id: string) => void;
  onQty: (id: string, delta: number) => void;
}) {
  const sectionLabel =
    tab === "mine"
      ? "あなたの在庫（譲る候補）"
      : `@${partnerHandle} の譲一覧`;
  const wishMatchLabel =
    tab === "mine" ? "相手がほしいものかも？" : "私がほしいものかも？";

  return (
    <>
      <div className="mb-2 px-1 text-[11px] font-bold tracking-[0.4px] text-[#3a324a8c]">
        {sectionLabel} ({items.length}件)
      </div>

      {items.length === 0 ? (
        <div className="rounded-[14px] border border-[#3a324a14] bg-white px-5 py-10 text-center text-[12px] leading-relaxed text-[#3a324a8c]">
          該当アイテムがありません
        </div>
      ) : (
        items.map((it) => (
          <ItemRow
            key={it.id}
            it={it}
            wishMatchLabel={wishMatchLabel}
            onToggle={() => onToggle(it.id)}
            onQty={(d) => onQty(it.id, d)}
          />
        ))
      )}
    </>
  );
}

function ItemRow({
  it,
  wishMatchLabel,
  onToggle,
  onQty,
}: {
  it: Selectable;
  wishMatchLabel: string;
  onToggle: () => void;
  onQty: (delta: number) => void;
}) {
  const stepperVisible = it.selected && it.quantity > 1;
  const hue =
    Math.abs(
      (it.characterId ?? it.groupId ?? it.id)
        .split("")
        .reduce((s, c) => s + c.charCodeAt(0), 0),
    ) % 360;

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`mb-2 flex w-full items-center gap-3 rounded-[12px] bg-white px-3.5 py-3 text-left transition-shadow ${
        it.selected
          ? "border-[1.5px] border-[#a695d8] shadow-[0_4px_12px_rgba(166,149,216,0.13)]"
          : "border-[0.5px] border-[#3a324a14]"
      }`}
    >
      <span
        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[5px] border-[1.8px] ${
          it.selected
            ? "border-[#a695d8] bg-[#a695d8]"
            : "border-[#3a324a14] bg-white"
        }`}
      >
        {it.selected && (
          <svg width="11" height="11" viewBox="0 0 11 11">
            <path
              d="M2 5.5L4.5 8L9 3"
              stroke="#fff"
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>

      <span
        className="block h-12 w-9 flex-shrink-0 overflow-hidden rounded-md"
        style={{
          background: it.photoUrl
            ? "#3a324a"
            : `repeating-linear-gradient(135deg, hsl(${hue}, 35%, 78%) 0 5px, hsl(${hue}, 35%, 70%) 5px 10px)`,
        }}
      >
        {it.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={it.photoUrl}
            alt=""
            className="block h-full w-full object-cover"
          />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1">
          <span className="text-[13px] font-bold leading-tight">
            {it.title}
          </span>
          {it.wishMatch && (
            <span className="rounded-full bg-[linear-gradient(135deg,#a695d8,#f3c5d4)] px-1.5 py-0.5 text-[9px] font-extrabold tracking-[0.3px] text-white">
              {wishMatchLabel}
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-[10.5px] tabular-nums text-[#3a324a8c]">
          {[it.groupName, it.characterName, it.goodsTypeName]
            .filter(Boolean)
            .join(" / ") || "—"}
          {" ・ 在庫 ×"}
          {it.quantity}
          {it.quantity === 1 && it.selected && (
            <span className="ml-1.5 font-bold text-[#a695d8]">選択中 ×1</span>
          )}
        </span>
      </span>

      {stepperVisible && (
        <span
          className="flex flex-shrink-0 items-center gap-0 rounded-full bg-[#3a324a08] p-[3px]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            disabled={it.selectedQty <= 1}
            onClick={() => onQty(-1)}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-[#a695d8] text-base font-bold leading-none text-white disabled:bg-white disabled:text-[#3a324a4d]"
          >
            −
          </button>
          <span className="min-w-[28px] px-1 text-center text-[12.5px] font-extrabold tabular-nums">
            {it.selectedQty}
            <span className="ml-0.5 text-[9px] font-semibold text-[#3a324a8c]">
              /{it.quantity}
            </span>
          </span>
          <button
            type="button"
            disabled={it.selectedQty >= it.quantity}
            onClick={() => onQty(1)}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-[#a695d8] text-base font-bold leading-none text-white disabled:bg-white disabled:text-[#3a324a4d]"
          >
            ＋
          </button>
        </span>
      )}
    </button>
  );
}

function MeetupTab({
  partner,
  meetupCandidates,
  activeMeetupId,
  onSelectCandidate,
  onAddCandidate,
  onRemoveCandidate,
  onCandidateModeChange,
  onTodayPreset,
  onScheduledDay,
  onScheduledRange,
  onCopyPlaceToAll,
  meetupStart,
  setMeetupStart,
  meetupEnd,
  setMeetupEnd,
  meetupPlace,
  onPlaceInputChange,
  meetupCenter,
  onMapCenterChange,
  reverseFetching,
  searchQ,
  setSearchQ,
  searchResults,
  searching,
  showResults,
  setShowResults,
  pickPlace,
  useCurrentLocation,
}: {
  partner: Partner;
  meetupCandidates: MeetupCandidate[];
  activeMeetupId: string;
  onSelectCandidate: (id: string) => void;
  onAddCandidate: () => void;
  onRemoveCandidate: (id: string) => void;
  onCandidateModeChange: (mode: MeetupMode) => void;
  onTodayPreset: (kind: "30m" | "1h" | "2h" | "today") => void;
  onScheduledDay: (day: "today" | "tomorrow") => void;
  onScheduledRange: (startHour: number, endHour: number) => void;
  onCopyPlaceToAll: () => void;
  meetupStart: string;
  setMeetupStart: (s: string) => void;
  meetupEnd: string;
  setMeetupEnd: (s: string) => void;
  meetupPlace: string;
  onPlaceInputChange: (s: string) => void;
  meetupCenter: [number, number];
  onMapCenterChange: (lat: number, lng: number) => void;
  reverseFetching: boolean;
  searchQ: string;
  setSearchQ: (s: string) => void;
  searchResults: Place[];
  searching: boolean;
  showResults: boolean;
  setShowResults: (b: boolean) => void;
  pickPlace: (p: Place) => void;
  useCurrentLocation: () => void;
}) {
  const activeCandidate =
    meetupCandidates.find((candidate) => candidate.id === activeMeetupId) ??
    meetupCandidates[0];
  const mode = activeCandidate?.mode ?? "today";
  const activeIndex = Math.max(
    0,
    meetupCandidates.findIndex((candidate) => candidate.id === activeMeetupId),
  );
  const dateValue = meetupStart.slice(0, 10);
  const startTime = meetupStart.slice(11, 16);
  const endTime = meetupEnd.slice(11, 16);

  return (
    <>
      {/* 相手が現地交換モードならバナー */}
      {partner.localModeEnabled && partner.localModeAW && (
        <div className="mb-3 rounded-[12px] border-[1.5px] border-[#7a9a8a] bg-[#7a9a8a14] px-3 py-2.5">
          <div className="mb-0.5 flex items-center gap-1.5 text-[10.5px] font-extrabold tracking-[0.4px] text-[#7a9a8a]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#7a9a8a] shadow-[0_0_0_3px_rgba(122,154,138,0.25)]" />
            @{partner.handle} は現地交換モード中
          </div>
          <div className="text-[11.5px] leading-snug text-[#3a324a]">
            相手が今いる場所と時間帯を候補1に入れています。必要なら候補を追加して、相手が選びやすい形にできます。
          </div>
        </div>
      )}

      <div className="mb-3 rounded-[14px] border border-[#3a324a14] bg-white p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            <div className="text-[12px] font-extrabold text-[#3a324a]">
              交換できる候補
            </div>
            <div className="mt-0.5 text-[10.5px] leading-snug text-[#3a324a8c]">
              最大3件。候補1が最初に相手へ表示されます。
            </div>
          </div>
          <button
            type="button"
            disabled={meetupCandidates.length >= 3}
            onClick={onAddCandidate}
            className="rounded-full bg-[#a695d814] px-3 py-1.5 text-[10.5px] font-extrabold text-[#a695d8] disabled:opacity-40"
          >
            ＋候補
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {meetupCandidates.map((candidate, index) => {
            const active = candidate.id === activeMeetupId;
            const ok = meetupCandidateIsSet(candidate);
            return (
              <div
                key={candidate.id}
                className={`min-w-[154px] rounded-[12px] border px-3 py-2 text-left transition-all ${
                  active
                    ? "border-[#a695d8] bg-[#a695d80f] shadow-[0_4px_12px_rgba(166,149,216,0.14)]"
                    : "border-[#3a324a14] bg-[#fbf9fc]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectCandidate(candidate.id)}
                  className="block w-full text-left"
                >
                  <span className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-extrabold text-[#a695d8]">
                      候補{index + 1}
                    </span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                        ok
                          ? "bg-[#7a9a8a14] text-[#7a9a8a]"
                          : "bg-[#d9826b14] text-[#d9826b]"
                      }`}
                    >
                      {ok ? "OK" : "未設定"}
                    </span>
                  </span>
                  <span className="block truncate text-[11px] font-bold text-[#3a324a]">
                    {candidate.start && candidate.end
                      ? formatRange(candidate.start, candidate.end)
                      : "時間未設定"}
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] text-[#3a324a8c]">
                    {candidate.place || "場所未設定"}
                  </span>
                </button>
                {meetupCandidates.length > 1 && active && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveCandidate(candidate.id);
                    }}
                    className="mt-1.5 inline-flex rounded-full bg-[#3a324a08] px-2 py-0.5 text-[9.5px] font-bold text-[#3a324a8c]"
                  >
                    削除
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mb-3 rounded-[14px] border border-[#3a324a14] bg-white p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[11px] font-extrabold text-[#3a324a]">
            候補{activeIndex + 1} の交換できる時間
          </div>
          <span className="text-[9.5px] font-bold text-[#3a324a8c]">
            JST
          </span>
        </div>
        <div className="mb-3 grid grid-cols-2 gap-1.5 rounded-full bg-[#3a324a08] p-1">
          {(
            [
              { id: "today", label: "今日このあと" },
              { id: "scheduled", label: "日時を指定" },
            ] as const
          ).map((item) => {
            const active = mode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onCandidateModeChange(item.id)}
                className={`rounded-full px-3 py-2 text-[11.5px] font-extrabold transition-all ${
                  active
                    ? "bg-white text-[#a695d8] shadow-[0_2px_7px_rgba(58,50,74,0.08)]"
                    : "text-[#3a324a8c]"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {mode === "today" ? (
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "30m", label: "今から30分" },
              { id: "1h", label: "1時間以内" },
              { id: "2h", label: "2時間以内" },
              { id: "today", label: "今日中" },
            ].map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() =>
                  onTodayPreset(preset.id as "30m" | "1h" | "2h" | "today")
                }
                className="rounded-[12px] border border-[#3a324a14] bg-[#fbf9fc] px-3 py-2 text-[11.5px] font-bold text-[#3a324a] active:scale-[0.98]"
              >
                {preset.label}
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="mb-2 flex gap-1.5">
              <button
                type="button"
                onClick={() => onScheduledDay("today")}
                className="rounded-full border border-[#3a324a14] bg-[#fbf9fc] px-3 py-1.5 text-[11px] font-bold text-[#3a324a]"
              >
                今日
              </button>
              <button
                type="button"
                onClick={() => onScheduledDay("tomorrow")}
                className="rounded-full border border-[#3a324a14] bg-[#fbf9fc] px-3 py-1.5 text-[11px] font-bold text-[#3a324a]"
              >
                明日
              </button>
              {[
                { label: "昼", start: 12, end: 15 },
                { label: "夕方", start: 15, end: 18 },
                { label: "夜", start: 18, end: 20 },
              ].map((range) => (
                <button
                  key={range.label}
                  type="button"
                  onClick={() => onScheduledRange(range.start, range.end)}
                  className="rounded-full border border-[#a695d855] bg-[#a695d80d] px-3 py-1.5 text-[11px] font-bold text-[#a695d8]"
                >
                  {range.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-[1.1fr_0.8fr_0.8fr] gap-2">
              <input
                type="date"
                value={dateValue}
                onChange={(e) => {
                  setMeetupStart(`${e.target.value}T${startTime || "15:00"}`);
                  setMeetupEnd(`${e.target.value}T${endTime || "17:00"}`);
                }}
                className="block min-w-0 rounded-lg border-[0.5px] border-[#3a324a14] bg-[#fbf9fc] px-2.5 py-2.5 text-[12px] font-semibold text-[#3a324a] focus:border-[#a695d8] focus:outline-none"
              />
              <input
                type="time"
                step={1800}
                value={startTime}
                onChange={(e) =>
                  setMeetupStart(`${dateValue}T${e.target.value}`)
                }
                className="block min-w-0 rounded-lg border-[0.5px] border-[#3a324a14] bg-[#fbf9fc] px-2.5 py-2.5 text-[12px] font-semibold text-[#3a324a] focus:border-[#a695d8] focus:outline-none"
              />
              <input
                type="time"
                step={1800}
                value={endTime}
                onChange={(e) =>
                  setMeetupEnd(`${dateValue}T${e.target.value}`)
                }
                className="block min-w-0 rounded-lg border-[0.5px] border-[#3a324a14] bg-[#fbf9fc] px-2.5 py-2.5 text-[12px] font-semibold text-[#3a324a] focus:border-[#a695d8] focus:outline-none"
              />
            </div>
          </>
        )}
        <div className="mt-2 rounded-[10px] bg-[#a8d4e614] px-3 py-2 text-[11px] font-bold text-[#3a324a]">
          {meetupStart && meetupEnd ? formatRange(meetupStart, meetupEnd) : "時間未設定"}
        </div>
      </div>

      {/* 場所名 + 検索 */}
      <div className="mb-1 flex items-center justify-between px-0.5">
        <span className="text-[9.5px] font-bold tracking-[0.4px] text-[#3a324a8c]">
          候補{activeIndex + 1} の交換できる場所
        </span>
        {reverseFetching && (
          <span className="text-[9.5px] text-[#a695d8]">取得中…</span>
        )}
      </div>
      <input
        type="text"
        value={meetupPlace}
        onChange={(e) => onPlaceInputChange(e.target.value)}
        maxLength={120}
        placeholder="地図でピンを動かすと自動で入ります"
        className="mb-2 block w-full rounded-lg border-[0.5px] border-[#3a324a14] bg-white px-3 py-2.5 text-[12px] font-semibold text-[#3a324a] placeholder:text-[#3a324a4d] focus:border-[#a695d8] focus:outline-none"
      />

      {/* 検索バー */}
      <div className="relative mb-2">
        <input
          type="text"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          onFocus={() => searchResults.length && setShowResults(true)}
          placeholder="🔍 駅・施設名で検索（例：渋谷駅）"
          className="block w-full rounded-lg border-[0.5px] border-[#3a324a14] bg-white px-3 py-2.5 text-[12px] text-[#3a324a] placeholder:text-[#3a324a4d] focus:border-[#a695d8] focus:outline-none"
        />
        {searching && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#3a324a8c]">
            …
          </span>
        )}
        {showResults && searchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-lg border border-[#3a324a14] bg-white shadow-[0_8px_20px_rgba(58,50,74,0.12)]">
            {searchResults.slice(0, 10).map((p, i) => (
              <button
                key={`${p.lat}-${p.lon}-${i}`}
                type="button"
                onClick={() => pickPlace(p)}
                className="block w-full border-b border-[#3a324a08] px-3 py-2 text-left last:border-0 hover:bg-[#a695d80a]"
              >
                <div className="text-[12px] font-semibold text-[#3a324a]">
                  {labelFromAddress(p)}
                </div>
                <div className="mt-0.5 truncate text-[10px] text-[#3a324a8c]">
                  {p.display_name}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 現在地ボタン */}
      <button
        type="button"
        onClick={useCurrentLocation}
        className="mb-2 flex items-center gap-1.5 rounded-full border border-[#a695d855] bg-white px-3 py-1.5 text-[10.5px] font-bold text-[#a695d8] active:scale-[0.97]"
      >
        📍 現在地を中心に
      </button>
      {meetupCandidates.length > 1 && (
        <button
          type="button"
          onClick={onCopyPlaceToAll}
          className="mb-2 ml-2 rounded-full border border-[#3a324a14] bg-white px-3 py-1.5 text-[10.5px] font-bold text-[#3a324a8c] active:scale-[0.97]"
        >
          同じ場所を全候補に使う
        </button>
      )}

      {/* 地図 */}
      <div
        data-propose-swipe-ignore
        className="overflow-hidden rounded-[12px] border-[0.5px] border-[#3a324a14] bg-[#e8eef0]"
      >
        <div className="h-[240px] w-full">
          <MapPicker
            center={meetupCenter}
            radiusM={120}
            onCenterChange={onMapCenterChange}
            className="h-full w-full"
          />
        </div>
        <div className="border-t border-[#3a324a14] bg-white px-3 py-2 text-[10px] text-[#3a324a8c]">
          ピンをドラッグ or 地図をタップで位置を調整できます。場所名は自動で更新されます。
        </div>
      </div>
    </>
  );
}

function ConfirmStep({
  partnerHandle,
  myItems,
  theirItems,
  meetupCandidates,
  meetupStart,
  meetupEnd,
  meetupPlace,
  meetupCenter,
  message,
  onMessageChange,
  exposeCalendar,
  onExposeCalendarChange,
  error,
}: {
  partnerHandle: string;
  myItems: Selectable[];
  theirItems: Selectable[];
  meetupCandidates: MeetupCandidate[];
  meetupStart: string;
  meetupEnd: string;
  meetupPlace: string;
  meetupCenter: [number, number];
  message: string;
  onMessageChange: (m: string) => void;
  exposeCalendar: boolean;
  onExposeCalendarChange: (b: boolean) => void;
  error: string | null;
}) {
  return (
    <>
      <div className="mb-3 rounded-[10px] bg-[#a695d810] px-3 py-2.5 text-[11.5px] leading-relaxed text-[#3a324a]">
        <span className="mr-1.5 inline-block rounded-full bg-white px-1.5 py-0.5 text-[9.5px] font-extrabold tracking-[0.4px] text-[#a695d8]">
          📨 送信確認
        </span>
        @{partnerHandle} に下記の内容で打診を送ります。送信後 7 日間が応答期限です。
      </div>

      {/* 交換内容（マッチパネル風グリッド：相手の譲 ↔ 私の譲） */}
      <Section label="交換内容">
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2.5 rounded-[14px] bg-[#a8d4e614] p-2.5">
          <SidePanel
            label={`相手の譲（${theirItems.length}）`}
            items={theirItems}
            align="left"
          />
          <div className="flex flex-col items-center gap-1 pt-4">
            <ArrowDot color="#a695d8" dir="right" />
            <ArrowDot color="#a8d4e6" dir="left" />
          </div>
          <SidePanel
            label={`あなたの譲（${myItems.length}）`}
            items={myItems}
            align="right"
            accent="#f3c5d4cc"
          />
        </div>
      </Section>

      {/* 待ち合わせ：交換できる候補 */}
      <Section label="交換できる候補">
        {meetupCandidates.length > 1 && (
          <div className="mb-2 rounded-[12px] bg-[#a695d810] px-3 py-2 text-[11px] leading-relaxed text-[#3a324a]">
            相手には候補1を主候補として見せ、ほかの候補も選べる形で送ります。
          </div>
        )}
        <div className="mb-2 space-y-2">
          {meetupCandidates.map((candidate, index) => (
            <div
              key={candidate.id}
              className={`rounded-[12px] border px-3 py-2.5 ${
                index === 0
                  ? "border-[#a695d855] bg-[#a695d80d]"
                  : "border-[#3a324a14] bg-white"
              }`}
            >
              <div className="mb-1 flex items-center gap-1.5">
                <span className="rounded-full bg-white px-2 py-[2px] text-[9.5px] font-extrabold tracking-[0.4px] text-[#a695d8]">
                  候補{index + 1}
                </span>
                {index === 0 && (
                  <span className="text-[9.5px] font-bold text-[#3a324a8c]">
                    主候補
                  </span>
                )}
              </div>
              <div className="text-[13px] font-extrabold tabular-nums text-[#3a324a]">
                {formatRange(candidate.start, candidate.end)}
              </div>
              <div className="mt-0.5 text-[12px] font-bold text-[#3a324a]">
                📍 {candidate.place}
              </div>
            </div>
          ))}
        </div>
        <div className="overflow-hidden rounded-[14px] border-[0.5px] border-[#3a324a14] bg-white">
          <div className="px-3 py-2.5">
            <div className="mb-0.5 text-[10px] font-bold tracking-[0.4px] text-[#3a324a8c]">
              主候補の日時
            </div>
            <div className="text-[13px] font-bold tabular-nums text-[#3a324a]">
              {formatRange(meetupStart, meetupEnd)}
            </div>
            <div className="mt-2 text-[10px] font-bold tracking-[0.4px] text-[#3a324a8c]">
              主候補の場所
            </div>
            <div className="text-[13px] font-bold text-[#3a324a]">
              📍 {meetupPlace}
            </div>
          </div>
          <div className="h-[160px] w-full border-t border-[#3a324a14]">
            <MapPicker
              center={meetupCenter}
              radiusM={120}
              onCenterChange={() => {}}
              className="h-full w-full"
            />
          </div>
        </div>
      </Section>

      {/* iter138: メッセージ入力（任意・空でも送信可能）+ スケジュール共有トグル */}
      <Section label="メッセージ（任意）" hint={`${message.length} / 400`}>
        <textarea
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          rows={5}
          maxLength={400}
          placeholder="一言ひとこと書いておくとスムーズです（例：当日よろしくお願いします）"
          className="block w-full resize-none rounded-[14px] border-[0.5px] border-[#3a324a14] bg-white p-3 text-[13px] leading-relaxed text-[#3a324a] placeholder:text-[#3a324a4d] focus:border-[#a695d8] focus:outline-none"
        />
      </Section>

      <Section label="スケジュール共有">
        <button
          type="button"
          onClick={() => onExposeCalendarChange(!exposeCalendar)}
          className={`flex w-full items-start gap-2.5 rounded-[14px] p-3 text-left transition-colors ${
            exposeCalendar
              ? "border-[1.5px] border-[#a695d8] bg-[#a695d810]"
              : "border-[0.5px] border-[#3a324a14] bg-white"
          }`}
        >
          <span
            className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-[1.5px] ${
              exposeCalendar
                ? "border-[#a695d8] bg-[#a695d8]"
                : "border-[#3a324a14] bg-white"
            }`}
          >
            {exposeCalendar && (
              <svg width="11" height="11" viewBox="0 0 11 11">
                <path
                  d="M2 5.5L4.5 8L9 3"
                  stroke="#fff"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
          <span className="flex-1">
            <span className="block text-[12.5px] font-bold text-[#3a324a]">
              スケジュールを共有する
              <span className="ml-1 text-[10px] font-normal text-[#3a324a8c]">
                {exposeCalendar ? "ON" : "OFF"}
              </span>
            </span>
            <span className="mt-0.5 block text-[10.5px] leading-snug text-[#3a324a8c]">
              あなたの予定（取引以外も含む）が相手に表示されます。日時を相談するときに便利。
            </span>
          </span>
        </button>
      </Section>

      {error && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </>
  );
}

/** 1 アイテム = 写真 or イニシャルの縦長カード */
function Tcg({ item, accent }: { item: Selectable; accent?: string }) {
  const hue =
    Math.abs(
      (item.characterId ?? item.groupId ?? item.id)
        .split("")
        .reduce((s, c) => s + c.charCodeAt(0), 0),
    ) % 360;
  const stripeBg = `repeating-linear-gradient(135deg, hsl(${hue}, 28%, 86%) 0 5px, hsl(${hue}, 28%, 78%) 5px 10px)`;
  const initialShadow = `0 1px 3px hsla(${hue}, 30%, 30%, 0.5)`;
  const hasPhoto = !!item.photoUrl;
  const label =
    item.characterName ?? item.groupName ?? item.title ?? "?";

  return (
    <div
      className="relative overflow-hidden rounded-md border border-white/40 shadow-[0_1px_3px_rgba(58,50,74,0.15)]"
      style={{
        width: 36,
        height: 48,
        background: hasPhoto ? "#3a324a" : stripeBg,
      }}
      title={`${label}${item.goodsTypeName ? ` · ${item.goodsTypeName}` : ""} ×${item.selectedQty}`}
    >
      {hasPhoto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.photoUrl!}
          alt={label}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      )}
      {!hasPhoto && (
        <div
          className="absolute inset-0 flex items-center justify-center text-[16px] font-extrabold text-white/95"
          style={{ textShadow: initialShadow }}
        >
          {label[0] || "?"}
        </div>
      )}
      {accent && !hasPhoto && (
        <div
          className="absolute inset-x-0 bottom-0 h-1"
          style={{ background: accent }}
        />
      )}
      {item.selectedQty > 1 && (
        <div className="absolute right-0.5 top-0.5 rounded-sm bg-black/55 px-1 text-[8px] font-extrabold leading-tight text-white">
          ×{item.selectedQty}
        </div>
      )}
    </div>
  );
}

function SidePanel({
  label,
  items,
  align,
  accent,
}: {
  label: string;
  items: Selectable[];
  align: "left" | "right";
  accent?: string;
}) {
  return (
    <div>
      <div
        className={`mb-1.5 px-1 text-[9.5px] font-bold tracking-[0.6px] text-[#3a324a8c] ${
          align === "right" ? "text-right" : "text-left"
        }`}
      >
        {label}
      </div>
      {items.length === 0 ? (
        <div
          className={`px-1 text-[10px] italic text-[#3a324a4d] ${
            align === "right" ? "text-right" : "text-left"
          }`}
        >
          —
        </div>
      ) : (
        <div
          className={`flex flex-wrap gap-1 px-1 ${
            align === "right" ? "justify-end" : "justify-start"
          }`}
        >
          {items.map((it) => (
            <Tcg key={it.id} item={it} accent={accent} />
          ))}
        </div>
      )}
    </div>
  );
}

function ArrowDot({
  color,
  dir,
}: {
  color: string;
  dir: "left" | "right";
}) {
  return (
    <div
      className="flex h-5 w-5 items-center justify-center rounded-full text-white"
      style={{
        background: color,
        boxShadow: `0 2px 5px ${color}80`,
      }}
    >
      <svg width="10" height="10" viewBox="0 0 10 10">
        {dir === "right" ? (
          <path
            d="M2 5h6m-2-2l2 2-2 2"
            stroke="#fff"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ) : (
          <path
            d="M8 5H2m2-2L2 5l2 2"
            stroke="#fff"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        )}
      </svg>
    </div>
  );
}

function Section({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3.5">
      <div className="mb-1.5 flex items-baseline justify-between px-1">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.6px] text-[#3a324a8c]">
          {label}
        </span>
        {hint && (
          <span className="text-[9.5px] font-bold text-[#a695d8]">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}
