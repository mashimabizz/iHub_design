"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
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

type Step = "select" | "message" | "confirm";
type Tab = "mine" | "theirs" | "meetup";
type Tone = "standard" | "casual" | "polite";

type Props = {
  partner: Partner;
  myInv: ProposeInv[];
  theirInv: ProposeInv[];
  matchType: "perfect" | "forward" | "backward";
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
    message?: string;
  };
};

/* Tokyo Station fallback */
const FALLBACK_CENTER: [number, number] = [35.6812, 139.7671];

type Place = { display_name: string; lat: string; lon: string; address?: Record<string, string> };

/* ─── helpers ───────────────────────────────────────────── */

/** ISO → datetime-local（YYYY-MM-DDTHH:mm） */
function isoToLocal(iso: string): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}
/** datetime-local → ISO */
function localToIso(s: string): string {
  if (!s) return "";
  return new Date(s).toISOString();
}
function nowPlusHoursLocal(h: number): string {
  const d = new Date();
  d.setHours(d.getHours() + h);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

/** wishMatch を先頭にソート（同フラグ内は元の順） */
function sortByWishFirst<T extends { wishMatch?: boolean }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => {
    const aw = a.wishMatch ? 1 : 0;
    const bw = b.wishMatch ? 1 : 0;
    return bw - aw;
  });
}

function buildSummaryText(items: Selectable[]): string {
  return items
    .filter((i) => i.selected)
    .map((i) => {
      const name = i.title.split(" ").slice(-1)[0] ?? i.title;
      return `${name} ×${i.selectedQty}`;
    })
    .join(" / ");
}

function templateFor(input: {
  tone: Tone;
  partnerHandle: string;
  myItems: Selectable[];
  theirItems: Selectable[];
  meetupStart: string;
  meetupEnd: string;
  meetupPlace: string;
  matchType: "perfect" | "forward" | "backward";
}): string {
  const matchPhrase =
    input.matchType === "perfect"
      ? "お互いの希望が一致していました◎"
      : input.matchType === "forward"
        ? "私の譲があなたの欲しいものに該当しているようです。"
        : "あなたの譲が私の欲しいものに該当しているようです。";

  const summaryMine = buildSummaryText(input.myItems);
  const summaryTheirs = buildSummaryText(input.theirItems);
  const meetupLine =
    input.meetupStart && input.meetupEnd && input.meetupPlace
      ? `日時：${formatRange(input.meetupStart, input.meetupEnd)}\n場所：${input.meetupPlace}`
      : "";

  if (input.tone === "casual") {
    return [
      `${input.partnerHandle} こんにちは〜！`,
      matchPhrase,
      `▼ 私が出す: ${summaryMine || "（後ほど指定）"}`,
      `▼ 受け取る: ${summaryTheirs || "（後ほど指定）"}`,
      meetupLine,
      "もしよかったら交換しませんか？",
    ]
      .filter(Boolean)
      .join("\n");
  }
  if (input.tone === "polite") {
    return [
      `${input.partnerHandle} 様`,
      "突然のご連絡を失礼いたします。",
      matchPhrase,
      `▼ こちらが出すもの：${summaryMine || "（後ほど指定）"}`,
      `▼ お受け取りするもの：${summaryTheirs || "（後ほど指定）"}`,
      meetupLine,
      "ご検討いただけますと幸いです。よろしくお願いいたします。",
    ]
      .filter(Boolean)
      .join("\n");
  }
  return [
    `${input.partnerHandle} はじめまして！`,
    matchPhrase,
    `▼ 私が出す: ${summaryMine || "（後ほど指定）"}`,
    `▼ 受け取る: ${summaryTheirs || "（後ほど指定）"}`,
    meetupLine,
    "ご都合いかがでしょうか？",
  ]
    .filter(Boolean)
    .join("\n");
}

function formatRange(startLocal: string, endLocal: string): string {
  if (!startLocal || !endLocal) return "";
  const s = new Date(startLocal);
  const e = new Date(endLocal);
  const sameDay =
    s.getFullYear() === e.getFullYear() &&
    s.getMonth() === e.getMonth() &&
    s.getDate() === e.getDate();
  const dateFmt = (d: Date) =>
    `${d.getMonth() + 1}/${d.getDate()}(${"日月火水木金土"[d.getDay()]})`;
  const timeFmt = (d: Date) =>
    `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return sameDay
    ? `${dateFmt(s)} ${timeFmt(s)}〜${timeFmt(e)}`
    : `${dateFmt(s)} ${timeFmt(s)} 〜 ${dateFmt(e)} ${timeFmt(e)}`;
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

/* ─── main component ────────────────────────────────────── */

export function ProposeFlow({
  partner,
  myInv,
  theirInv,
  matchType,
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

  const [myItems, setMyItems] = useState<Selectable[]>(() =>
    sortByWishFirst(myInv).map((i) => {
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
    sortByWishFirst(theirInv).map((i) => {
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
  const initCenter: [number, number] =
    initial?.meetupLat != null && initial?.meetupLng != null
      ? [initial.meetupLat, initial.meetupLng]
      : partner.localModeAW?.centerLat != null &&
          partner.localModeAW?.centerLng != null
        ? [partner.localModeAW.centerLat, partner.localModeAW.centerLng]
        : FALLBACK_CENTER;

  const [meetupStart, setMeetupStart] = useState(initStart);
  const [meetupEnd, setMeetupEnd] = useState(initEnd);
  const [meetupPlace, setMeetupPlace] = useState(initPlace);
  const [meetupCenter, setMeetupCenter] =
    useState<[number, number]>(initCenter);

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
  const [tab, setTab] = useState<Tab>("mine");

  /* ── メッセージ ── */
  const [tone, setTone] = useState<Tone>("standard");
  const [exposeCalendar, setExposeCalendar] = useState(false);
  const [messageEdited, setMessageEdited] = useState<string | null>(
    initial?.message ?? null,
  );

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

  const meetupSet =
    !!meetupStart &&
    !!meetupEnd &&
    !!meetupPlace.trim() &&
    new Date(meetupEnd) > new Date(meetupStart);

  // 定価交換モードでは receivers (相手の譲) は要らない（金銭で受け取る/支払う）
  const canProceedSelect = isCashMode
    ? myCount > 0 && meetupSet
    : myCount > 0 && theirCount > 0 && meetupSet;

  /** 自動メッセージ */
  const autoMessage = useMemo(() => {
    return templateFor({
      tone,
      partnerHandle: `@${partner.handle}`,
      myItems: myItems.filter((i) => i.selected),
      theirItems: theirItems.filter((i) => i.selected),
      meetupStart,
      meetupEnd,
      meetupPlace,
      matchType,
    });
  }, [
    tone,
    partner.handle,
    myItems,
    theirItems,
    meetupStart,
    meetupEnd,
    meetupPlace,
    matchType,
  ]);

  const message = messageEdited ?? autoMessage;

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
          if (label) setMeetupPlace(label);
        }
      } catch {
        // ignore（abort or network error）
      } finally {
        setReverseFetching(false);
      }
    }, 600); // ピンドラッグ中の連続イベントを debounce
    return () => clearTimeout(handle);
  }, [meetupCenter]);

  /* 場所検索 debounce */
  const searchAbortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    const q = searchQ.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
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
      setMeetupCenter([lat, lon]);
      setMeetupPlace(labelFromAddress(p));
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
        setMeetupCenter([pos.coords.latitude, pos.coords.longitude]);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  /** 地図ピン操作（drag / click） */
  function handleMapCenterChange(lat: number, lng: number) {
    placeManuallyEditedRef.current = false; // 地図動かしたら自動 reverse を許可
    setMeetupCenter([lat, lng]);
  }

  /** place 入力欄を手動で編集 */
  function handlePlaceInputChange(value: string) {
    placeManuallyEditedRef.current = true;
    setMeetupPlace(value);
  }

  /* ── handlers ── */

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
          meetupStartAt: localToIso(meetupStart),
          meetupEndAt: localToIso(meetupEnd),
          meetupPlaceName: meetupPlace.trim(),
          meetupLat: meetupCenter[0],
          meetupLng: meetupCenter[1],
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
        messageTone: tone,
        meetupStartAt: localToIso(meetupStart),
        meetupEndAt: localToIso(meetupEnd),
        meetupPlaceName: meetupPlace.trim(),
        meetupLat: meetupCenter[0],
        meetupLng: meetupCenter[1],
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
              onClick={() =>
                setStep(step === "confirm" ? "message" : "select")
              }
              className="flex-shrink-0"
            >
              <ChevronLeft />
            </button>
          )}
          <div className="flex-1">
            <div className="text-[15px] font-bold text-gray-900">
              {step === "select"
                ? "提示物の選択"
                : step === "message"
                  ? "メッセージ作成"
                  : "送信確認"}
            </div>
            <div className="mt-0.5 text-[11px] text-[#3a324a8c]">
              @{partner.handle}
              {partner.primaryArea ? ` ・${partner.primaryArea}` : ""}
            </div>
          </div>
          <span className="rounded-full bg-[#a695d814] px-2.5 py-1 text-[10.5px] font-extrabold tracking-[0.3px] text-[#a695d8]">
            STEP {step === "select" ? 1 : step === "message" ? 2 : 3}/3
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
          <div className="-mx-[18px] mt-3 flex border-b border-[#3a324a14] px-3">
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
        )}
      </header>

      <div className="mx-auto w-full max-w-md flex-1 px-[18px] pt-3.5">
        {step === "select" && tab === "meetup" && (
          <MeetupTab
            partner={partner}
            meetupStart={meetupStart}
            setMeetupStart={setMeetupStart}
            meetupEnd={meetupEnd}
            setMeetupEnd={setMeetupEnd}
            meetupPlace={meetupPlace}
            onPlaceInputChange={handlePlaceInputChange}
            meetupCenter={meetupCenter}
            onMapCenterChange={handleMapCenterChange}
            reverseFetching={reverseFetching}
            searchQ={searchQ}
            setSearchQ={setSearchQ}
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
                matchType={matchType}
                items={tab === "mine" ? myItems : theirItems}
                onToggle={(id) => toggleItem(tab, id)}
                onQty={(id, d) => updateQty(tab, id, d)}
              />
            )}
          </>
        )}

        {step === "message" && (
          <MessageStep
            tone={tone}
            setTone={(t) => {
              setTone(t);
              setMessageEdited(null);
            }}
            message={message}
            onChange={setMessageEdited}
            exposeCalendar={exposeCalendar}
            setExposeCalendar={setExposeCalendar}
          />
        )}

        {step === "confirm" && (
          <ConfirmStep
            partnerHandle={partner.handle}
            myItems={myItems.filter((i) => i.selected)}
            theirItems={theirItems.filter((i) => i.selected)}
            meetupStart={meetupStart}
            meetupEnd={meetupEnd}
            meetupPlace={meetupPlace}
            meetupCenter={meetupCenter}
            message={message}
            tone={tone}
            exposeCalendar={exposeCalendar}
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
              onClick={() => setStep("message")}
              className="block w-full rounded-[14px] bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] px-6 py-[14px] text-center text-sm font-bold tracking-[0.3px] text-white shadow-[0_4px_14px_rgba(166,149,216,0.33)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              {canProceedSelect
                ? "次へ：メッセージ作成 →"
                : myCount === 0 || theirCount === 0
                  ? "提示物を両方から選んでください"
                  : "待ち合わせを設定してください"}
            </button>
          )}
          {step === "message" && (
            <button
              type="button"
              disabled={!message.trim()}
              onClick={() => setStep("confirm")}
              className="block w-full rounded-[14px] bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] px-6 py-[14px] text-center text-sm font-bold tracking-[0.3px] text-white shadow-[0_4px_14px_rgba(166,149,216,0.33)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              次へ：送信確認 →
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
  matchType,
  items,
  onToggle,
  onQty,
}: {
  tab: "mine" | "theirs";
  partnerHandle: string;
  matchType: "perfect" | "forward" | "backward";
  items: Selectable[];
  onToggle: (id: string) => void;
  onQty: (id: string, delta: number) => void;
}) {
  const scenarioLabel =
    matchType === "perfect"
      ? "完全マッチからの打診"
      : matchType === "forward"
        ? "私の譲が欲しい人 への打診"
        : "私が欲しい譲を持つ人 への打診";

  const sectionLabel =
    tab === "mine"
      ? "あなたの在庫（譲る候補）"
      : `@${partnerHandle} の譲一覧`;

  return (
    <>
      <div className="mb-3 rounded-[10px] bg-[#a695d810] px-3 py-2.5 text-[11.5px] leading-relaxed text-[#3a324a]">
        <span className="mr-1.5 inline-block rounded-full bg-white px-1.5 py-0.5 text-[9.5px] font-extrabold tracking-[0.4px] text-[#a695d8]">
          {scenarioLabel}
        </span>
        {tab === "mine" ? (
          <>
            あなたの在庫から、<b>相手に提示するもの</b>を選びます。
            <br />
            同じグッズを複数提示する時は ＋／− で個数を調整してください。
          </>
        ) : (
          <>
            @{partnerHandle} の譲から、<b>あなたが受け取るもの</b>を選びます。
            <b className="text-[#a695d8]">★ wish 一致</b>
            は一番上に並びます。
          </>
        )}
      </div>

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
  onToggle,
  onQty,
}: {
  it: Selectable;
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
              ★ wish 一致
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
            相手が今いる場所と時間帯を自動で入力済みです。必要なら下で調整できます。
          </div>
        </div>
      )}

      <div className="mb-3 rounded-[10px] bg-[#a695d810] px-3 py-2.5 text-[11.5px] leading-relaxed text-[#3a324a]">
        <span className="mr-1.5 inline-block rounded-full bg-white px-1.5 py-0.5 text-[9.5px] font-extrabold tracking-[0.4px] text-[#a695d8]">
          📍 待ち合わせ
        </span>
        <b>時間帯</b>と<b>場所</b>を決めます。<b>地図のピンを動かすと場所名が自動で入ります</b>（直接編集も可）。
      </div>

      {/* 時間帯（開始 + 終了） */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        <div>
          <div className="mb-1 px-0.5 text-[9.5px] font-bold tracking-[0.4px] text-[#3a324a8c]">
            開始
          </div>
          <input
            type="datetime-local"
            value={meetupStart}
            onChange={(e) => setMeetupStart(e.target.value)}
            className="block w-full rounded-lg border-[0.5px] border-[#3a324a14] bg-white px-3 py-2.5 text-[12px] font-semibold text-[#3a324a] focus:border-[#a695d8] focus:outline-none"
          />
        </div>
        <div>
          <div className="mb-1 px-0.5 text-[9.5px] font-bold tracking-[0.4px] text-[#3a324a8c]">
            終了
          </div>
          <input
            type="datetime-local"
            value={meetupEnd}
            onChange={(e) => setMeetupEnd(e.target.value)}
            className="block w-full rounded-lg border-[0.5px] border-[#3a324a14] bg-white px-3 py-2.5 text-[12px] font-semibold text-[#3a324a] focus:border-[#a695d8] focus:outline-none"
          />
        </div>
      </div>

      {/* 場所名 + 検索 */}
      <div className="mb-1 flex items-center justify-between px-0.5">
        <span className="text-[9.5px] font-bold tracking-[0.4px] text-[#3a324a8c]">
          場所
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

      {/* 地図 */}
      <div className="overflow-hidden rounded-[12px] border-[0.5px] border-[#3a324a14] bg-[#e8eef0]">
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

function MessageStep({
  tone,
  setTone,
  message,
  onChange,
  exposeCalendar,
  setExposeCalendar,
}: {
  tone: Tone;
  setTone: (t: Tone) => void;
  message: string;
  onChange: (m: string) => void;
  exposeCalendar: boolean;
  setExposeCalendar: (b: boolean) => void;
}) {
  return (
    <>
      <div className="mb-3 rounded-[10px] bg-[#a695d810] px-3 py-2.5 text-[11.5px] leading-relaxed text-[#3a324a]">
        <span className="mr-1.5 inline-block rounded-full bg-white px-1.5 py-0.5 text-[9.5px] font-extrabold tracking-[0.4px] text-[#a695d8]">
          ✏️ メッセージ
        </span>
        トーンを選ぶと自動でメッセージが入ります。文面はそのままでも、編集してから送ってもOK。
      </div>

      <div className="mb-3 flex gap-1 rounded-[10px] bg-[#3a324a08] p-[3px]">
        {(
          [
            { id: "standard", label: "標準" },
            { id: "casual", label: "カジュアル" },
            { id: "polite", label: "丁寧" },
          ] as const
        ).map((t) => {
          const active = tone === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTone(t.id)}
              className={`flex-1 rounded-[8px] py-2 text-[12px] ${
                active
                  ? "bg-white font-bold text-[#a695d8] shadow-[0_1px_3px_rgba(58,50,74,0.1)]"
                  : "font-medium text-[#3a324a8c]"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <textarea
        value={message}
        onChange={(e) => onChange(e.target.value)}
        rows={9}
        maxLength={400}
        className="block w-full resize-none rounded-[14px] border-[0.5px] border-[#3a324a14] bg-white p-3 text-[13px] leading-relaxed text-[#3a324a] focus:border-[#a695d8] focus:outline-none"
      />
      <div className="mt-1.5 flex justify-between px-1 text-[10.5px] text-[#3a324a8c]">
        <span>テンプレを編集できます</span>
        <span className="tabular-nums">{message.length} / 400</span>
      </div>

      <button
        type="button"
        onClick={() => setExposeCalendar(!exposeCalendar)}
        className={`mt-4 flex w-full items-start gap-2.5 rounded-[12px] p-3 text-left ${
          exposeCalendar
            ? "border-[1.5px] border-[#a695d8] bg-[#a695d810]"
            : "border-[0.5px] border-[#3a324a14] bg-white"
        }`}
      >
        <span
          className={`mt-0.5 flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-[4px] border-[1.5px] ${
            exposeCalendar
              ? "border-[#a695d8] bg-[#a695d8]"
              : "border-[#3a324a14] bg-white"
          }`}
        >
          {exposeCalendar && (
            <svg width="10" height="10" viewBox="0 0 11 11">
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
        <span className="flex-1">
          <span className="block text-[12.5px] font-bold">
            スケジュールを共有する
          </span>
          <span className="mt-0.5 block text-[10.5px] leading-snug text-[#3a324a8c]">
            あなたの「予定（スケジュール）」が相手に表示されます。日時を相談するときに便利。
          </span>
        </span>
      </button>
    </>
  );
}

function ConfirmStep({
  partnerHandle,
  myItems,
  theirItems,
  meetupStart,
  meetupEnd,
  meetupPlace,
  meetupCenter,
  message,
  tone,
  exposeCalendar,
  error,
}: {
  partnerHandle: string;
  myItems: Selectable[];
  theirItems: Selectable[];
  meetupStart: string;
  meetupEnd: string;
  meetupPlace: string;
  meetupCenter: [number, number];
  message: string;
  tone: Tone;
  exposeCalendar: boolean;
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

      {/* 待ち合わせ：日時 + 場所 + 地図 */}
      <Section label="待ち合わせ">
        <div className="overflow-hidden rounded-[14px] border-[0.5px] border-[#3a324a14] bg-white">
          <div className="px-3 py-2.5">
            <div className="mb-0.5 text-[10px] font-bold tracking-[0.4px] text-[#3a324a8c]">
              日時
            </div>
            <div className="text-[13px] font-bold tabular-nums text-[#3a324a]">
              {formatRange(meetupStart, meetupEnd)}
            </div>
            <div className="mt-2 text-[10px] font-bold tracking-[0.4px] text-[#3a324a8c]">
              場所
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

      <Section
        label="メッセージ"
        hint={
          tone === "casual"
            ? "カジュアル"
            : tone === "polite"
              ? "丁寧"
              : "標準"
        }
      >
        <pre className="whitespace-pre-wrap break-words rounded-[14px] border-[0.5px] border-[#3a324a14] bg-white p-3 text-[13px] leading-relaxed text-[#3a324a]">
          {message}
        </pre>
      </Section>

      <Section label="その他">
        <div className="rounded-[14px] border-[0.5px] border-[#3a324a14] bg-white px-3 py-3 text-[12px] text-[#3a324a]">
          スケジュール共有：
          <span
            className={`ml-1 font-bold ${exposeCalendar ? "text-[#a695d8]" : "text-[#3a324a8c]"}`}
          >
            {exposeCalendar ? "ON" : "OFF"}
          </span>
        </div>
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
