"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PrimaryButton } from "@/components/auth/PrimaryButton";
import { createProposal } from "../actions";

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
};

type Selectable = ProposeInv & {
  selected: boolean;
  selectedQty: number;
};

type Step = "select" | "message" | "confirm";
type Tab = "mine" | "theirs" | "meetup";
type MeetupType = "now" | "scheduled";
type Tone = "standard" | "casual" | "polite";

type Props = {
  partner: Partner;
  myInv: ProposeInv[];
  theirInv: ProposeInv[];
  matchType: "perfect" | "forward" | "backward";
};

/* ─── helpers ───────────────────────────────────────────── */

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
  meetupType: MeetupType;
  meetupNowMinutes?: 5 | 10 | 15 | 30;
  meetupScheduledCustom?: { date: string; time: string; placeName: string };
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
    input.meetupType === "now"
      ? `合流可能時間：${input.meetupNowMinutes ?? 15}分以内（会場周辺）`
      : input.meetupScheduledCustom
        ? `日時：${input.meetupScheduledCustom.date} ${input.meetupScheduledCustom.time}\n場所：${input.meetupScheduledCustom.placeName}`
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
  // standard
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

/* ─── main component ────────────────────────────────────── */

export function ProposeFlow({
  partner,
  myInv,
  theirInv,
  matchType,
}: Props) {
  const router = useRouter();

  /* ── 提示物 state ── */
  const [myItems, setMyItems] = useState<Selectable[]>(() =>
    myInv.map((i) => {
      const checked =
        (matchType === "perfect" || matchType === "forward") &&
        i.wishMatch === true;
      return {
        ...i,
        selected: checked,
        selectedQty: checked ? i.quantity : 1,
      };
    }),
  );
  const [theirItems, setTheirItems] = useState<Selectable[]>(() =>
    theirInv.map((i) => {
      const checked =
        (matchType === "perfect" || matchType === "backward") &&
        i.wishMatch === true;
      return {
        ...i,
        selected: checked,
        selectedQty: checked ? i.quantity : 1,
      };
    }),
  );

  /* ── 待ち合わせ state ── */
  const [meetupType, setMeetupType] = useState<MeetupType>("scheduled");
  const [meetupNowMinutes, setMeetupNowMinutes] = useState<5 | 10 | 15 | 30>(
    15,
  );
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [scheduledPlace, setScheduledPlace] = useState("");

  /* ── ステップ・タブ ── */
  const [step, setStep] = useState<Step>("select");
  const [tab, setTab] = useState<Tab>("mine");

  /* ── メッセージ・トーン・カレンダー ── */
  const [tone, setTone] = useState<Tone>("standard");
  const [exposeCalendar, setExposeCalendar] = useState(false);
  const [messageEdited, setMessageEdited] = useState<string | null>(null);

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
    meetupType === "now"
      ? true
      : !!(scheduledDate && scheduledTime && scheduledPlace.trim());

  const canProceedSelect = myCount > 0 && theirCount > 0 && meetupSet;

  const meetupSummary =
    meetupType === "now"
      ? `今すぐ・${meetupNowMinutes}分以内`
      : meetupSet
        ? `${scheduledDate} ${scheduledTime} ・${scheduledPlace}`
        : "未設定";

  /** 自動メッセージ（編集されてなければ template から、編集されたら edited を使用） */
  const autoMessage = useMemo(() => {
    return templateFor({
      tone,
      partnerHandle: `@${partner.handle}`,
      myItems: myItems.filter((i) => i.selected),
      theirItems: theirItems.filter((i) => i.selected),
      meetupType,
      meetupNowMinutes: meetupType === "now" ? meetupNowMinutes : undefined,
      meetupScheduledCustom:
        meetupType === "scheduled"
          ? {
              date: scheduledDate,
              time: scheduledTime,
              placeName: scheduledPlace,
            }
          : undefined,
      matchType,
    });
  }, [
    tone,
    partner.handle,
    myItems,
    theirItems,
    meetupType,
    meetupNowMinutes,
    scheduledDate,
    scheduledTime,
    scheduledPlace,
    matchType,
  ]);

  const message = messageEdited ?? autoMessage;

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
        const newQty = Math.max(
          1,
          Math.min(i.quantity, i.selectedQty + delta),
        );
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

      const r = await createProposal({
        receiverId: partner.id,
        matchType,
        senderHaveIds,
        senderHaveQtys,
        receiverHaveIds,
        receiverHaveQtys,
        message,
        messageTone: tone,
        meetupType,
        meetupNowMinutes:
          meetupType === "now" ? meetupNowMinutes : undefined,
        meetupScheduledCustom:
          meetupType === "scheduled"
            ? {
                date: scheduledDate,
                time: scheduledTime,
                placeName: scheduledPlace.trim(),
              }
            : undefined,
        exposeCalendar,
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
    <main className="flex flex-1 flex-col bg-[#fbf9fc] pb-[180px] text-[#3a324a]">
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

        {step === "select" && (
          <div className="-mx-[18px] mt-3 flex border-b border-[#3a324a14] px-3">
            {(
              [
                { id: "mine", label: "私が出す", count: myCount },
                { id: "theirs", label: "受け取る", count: theirCount },
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
            meetupType={meetupType}
            setMeetupType={setMeetupType}
            meetupNowMinutes={meetupNowMinutes}
            setMeetupNowMinutes={setMeetupNowMinutes}
            scheduledDate={scheduledDate}
            setScheduledDate={setScheduledDate}
            scheduledTime={scheduledTime}
            setScheduledTime={setScheduledTime}
            scheduledPlace={scheduledPlace}
            setScheduledPlace={setScheduledPlace}
          />
        )}

        {step === "select" && tab !== "meetup" && (
          <ItemTab
            tab={tab}
            partnerHandle={partner.handle}
            matchType={matchType}
            items={tab === "mine" ? myItems : theirItems}
            onToggle={(id) => toggleItem(tab, id)}
            onQty={(id, d) => updateQty(tab, id, d)}
          />
        )}

        {step === "message" && (
          <MessageStep
            tone={tone}
            setTone={(t) => {
              setTone(t);
              // トーン変更時は edited を破棄して template に戻す
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
            meetupSummary={meetupSummary}
            message={message}
            tone={tone}
            exposeCalendar={exposeCalendar}
            error={error}
          />
        )}
      </div>

      {/* Bottom CTA */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#3a324a14] bg-white/95 px-[18px] pb-7 pt-2.5 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-md">
          {step === "select" && (
            <>
              <SummaryRow
                myCount={myCount}
                theirCount={theirCount}
                myText={
                  myCount > 0 ? buildSummaryText(myItems) : "未選択"
                }
                theirText={
                  theirCount > 0 ? buildSummaryText(theirItems) : "未選択"
                }
              />
              <MeetupSummaryRow
                set={meetupSet}
                summary={meetupSet ? meetupSummary : "未設定"}
              />
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
            </>
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
            はあなたの wish にある目印。
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
  // hue は character/group id から決定（不変・色被り回避）
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
      {/* checkbox */}
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

      {/* thumb */}
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

      {/* main text */}
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

      {/* qty stepper */}
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
  meetupType,
  setMeetupType,
  meetupNowMinutes,
  setMeetupNowMinutes,
  scheduledDate,
  setScheduledDate,
  scheduledTime,
  setScheduledTime,
  scheduledPlace,
  setScheduledPlace,
}: {
  meetupType: MeetupType;
  setMeetupType: (t: MeetupType) => void;
  meetupNowMinutes: 5 | 10 | 15 | 30;
  setMeetupNowMinutes: (m: 5 | 10 | 15 | 30) => void;
  scheduledDate: string;
  setScheduledDate: (s: string) => void;
  scheduledTime: string;
  setScheduledTime: (s: string) => void;
  scheduledPlace: string;
  setScheduledPlace: (s: string) => void;
}) {
  return (
    <>
      <div className="mb-3 rounded-[10px] bg-[#a695d810] px-3 py-2.5 text-[11.5px] leading-relaxed text-[#3a324a]">
        <span className="mr-1.5 inline-block rounded-full bg-white px-1.5 py-0.5 text-[9.5px] font-extrabold tracking-[0.4px] text-[#a695d8]">
          📍 待ち合わせ
        </span>
        日時と場所を決めます。<b>その場で会う</b>なら「いますぐ」、
        <b>事前に約束</b>するなら「日時指定」を選んでください。
      </div>

      {/* type toggle */}
      <div className="mb-3.5 flex gap-1.5 rounded-xl bg-[#3a324a08] p-1">
        {(
          [
            { id: "now", label: "🚀 いますぐ", sub: "5〜30分以内に合流" },
            { id: "scheduled", label: "📅 日時指定", sub: "事前に時間を決める" },
          ] as const
        ).map((opt) => {
          const active = meetupType === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setMeetupType(opt.id)}
              className={`flex-1 rounded-[9px] px-1.5 py-2.5 text-center leading-tight ${
                active
                  ? "bg-white text-[#a695d8] shadow-[0_2px_6px_rgba(0,0,0,0.06)]"
                  : "text-[#3a324a8c]"
              }`}
            >
              <div
                className={`text-[12.5px] ${active ? "font-extrabold" : "font-bold"}`}
              >
                {opt.label}
              </div>
              <div
                className={`mt-0.5 text-[9.5px] font-semibold ${
                  active ? "text-[#3a324a8c]" : "text-[#3a324a4d]"
                }`}
              >
                {opt.sub}
              </div>
            </button>
          );
        })}
      </div>

      {meetupType === "now" ? (
        <>
          <div className="mb-2 px-1 text-[11px] font-bold tracking-[0.4px] text-[#3a324a8c]">
            合流可能時間
          </div>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {([5, 10, 15, 30] as const).map((m) => {
              const active = meetupNowMinutes === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMeetupNowMinutes(m)}
                  className={`rounded-full px-3.5 py-2 text-[12px] ${
                    active
                      ? "bg-[#a695d8] font-extrabold text-white shadow-[0_2px_6px_rgba(166,149,216,0.33)]"
                      : "border-[0.5px] border-[#3a324a14] bg-white font-semibold text-[#3a324a]"
                  }`}
                >
                  {m}分以内
                </button>
              );
            })}
          </div>
          <div className="rounded-[10px] bg-[#a8d4e614] px-3 py-2.5 text-[10.5px] leading-relaxed text-[#3a324a]">
            💡
            「いますぐ」を選ぶ場合、相手が承諾した直後に合流できる距離にいることが前提です。会場周辺など、すぐ動ける状況で使いましょう。場所は取引チャットで決めます。
          </div>
        </>
      ) : (
        <>
          <div className="mb-2 px-1 text-[11px] font-bold tracking-[0.4px] text-[#3a324a8c]">
            日時を指定する
          </div>
          <div className="mb-2 grid grid-cols-2 gap-2">
            <div>
              <div className="mb-1 text-[9.5px] font-bold tracking-[0.4px] text-[#3a324a8c]">
                日付
              </div>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="block w-full rounded-lg border-[0.5px] border-[#3a324a14] bg-white px-3 py-2.5 text-[12px] font-semibold text-[#3a324a] focus:border-[#a695d8] focus:outline-none"
              />
            </div>
            <div>
              <div className="mb-1 text-[9.5px] font-bold tracking-[0.4px] text-[#3a324a8c]">
                時刻
              </div>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="block w-full rounded-lg border-[0.5px] border-[#3a324a14] bg-white px-3 py-2.5 text-[12px] font-semibold text-[#3a324a] focus:border-[#a695d8] focus:outline-none"
              />
            </div>
          </div>
          <div className="mb-3">
            <div className="mb-1 text-[9.5px] font-bold tracking-[0.4px] text-[#3a324a8c]">
              場所（駅・施設名など）
            </div>
            <input
              type="text"
              value={scheduledPlace}
              onChange={(e) => setScheduledPlace(e.target.value)}
              maxLength={80}
              placeholder="例: 東京駅 銀の鈴前"
              className="block w-full rounded-lg border-[0.5px] border-[#3a324a14] bg-white px-3 py-2.5 text-[12px] font-semibold text-[#3a324a] placeholder:text-[#3a324a4d] focus:border-[#a695d8] focus:outline-none"
            />
          </div>
          <div className="rounded-[10px] bg-[#a8d4e614] px-3 py-2.5 text-[10.5px] leading-relaxed text-[#3a324a]">
            💡
            日時指定はあなたの個人スケジュールに反映されません。スケジュール公開を ON
            にすると、相手はあなたの「忙しい時間帯」を把握できます。
          </div>
        </>
      )}
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

      {/* tone selector */}
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

      {/* calendar expose toggle */}
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
  meetupSummary,
  message,
  tone,
  exposeCalendar,
  error,
}: {
  partnerHandle: string;
  myItems: Selectable[];
  theirItems: Selectable[];
  meetupSummary: string;
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

      <Section label="交換内容">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2.5 rounded-[14px] border-[0.5px] border-[#3a324a14] bg-white p-3">
          <div>
            <div className="mb-1.5 px-0.5 text-[9.5px] font-bold tracking-[0.6px] text-[#3a324a8c]">
              あなたが出す ({myItems.length})
            </div>
            <ul className="space-y-1">
              {myItems.map((i) => (
                <li
                  key={i.id}
                  className="text-[11.5px] font-semibold leading-tight"
                >
                  {i.title} ×{i.selectedQty}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col items-center justify-center gap-1">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#a695d8] text-white">
              <svg width="12" height="12" viewBox="0 0 12 12">
                <path
                  d="M2 6h8m-2-2l2 2-2 2"
                  stroke="#fff"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#a8d4e6] text-white">
              <svg width="12" height="12" viewBox="0 0 12 12">
                <path
                  d="M10 6H2m2-2L2 6l2 2"
                  stroke="#fff"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </span>
          </div>
          <div>
            <div className="mb-1.5 px-0.5 text-right text-[9.5px] font-bold tracking-[0.6px] text-[#3a324a8c]">
              受け取る ({theirItems.length})
            </div>
            <ul className="space-y-1 text-right">
              {theirItems.map((i) => (
                <li
                  key={i.id}
                  className="text-[11.5px] font-semibold leading-tight"
                >
                  {i.title} ×{i.selectedQty}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section label="待ち合わせ">
        <div className="rounded-[14px] border-[0.5px] border-[#3a324a14] bg-white px-3 py-3 text-[12.5px] font-semibold">
          📍 {meetupSummary}
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

function SummaryRow({
  myCount,
  theirCount,
  myText,
  theirText,
}: {
  myCount: number;
  theirCount: number;
  myText: string;
  theirText: string;
}) {
  const set = myCount > 0 && theirCount > 0;
  return (
    <div
      className={`mb-1.5 flex items-center gap-2 rounded-[10px] px-3 py-2 text-[11px] ${
        set ? "bg-[#a695d810]" : "bg-[#3a324a08]"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 text-[9.5px] font-bold tracking-[0.4px] text-[#3a324a8c]">
          あなたが出す ({myCount}枚)
        </div>
        <div
          className={`truncate text-[11px] ${
            myCount > 0
              ? "font-bold text-[#3a324a]"
              : "font-medium text-[#3a324a4d]"
          }`}
        >
          {myText}
        </div>
      </div>
      <svg
        width="22"
        height="22"
        viewBox="0 0 22 22"
        className="flex-shrink-0"
      >
        <path
          d="M5 8h12M14 4l4 4-4 4M17 14H5M8 18l-4-4 4-4"
          stroke="#a695d8"
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="min-w-0 flex-1 text-right">
        <div className="mb-0.5 text-[9.5px] font-bold tracking-[0.4px] text-[#3a324a8c]">
          あなたが受け取る ({theirCount}枚)
        </div>
        <div
          className={`truncate text-[11px] ${
            theirCount > 0
              ? "font-bold text-[#3a324a]"
              : "font-medium text-[#3a324a4d]"
          }`}
        >
          {theirText}
        </div>
      </div>
    </div>
  );
}

function MeetupSummaryRow({
  set,
  summary,
}: {
  set: boolean;
  summary: string;
}) {
  return (
    <div
      className={`mb-2 flex items-center gap-2 rounded-[10px] px-3 py-2 text-[11px] ${
        set ? "bg-[#a695d810]" : "bg-[#3a324a08]"
      }`}
    >
      <span className="text-[13px]">📍</span>
      <span className="flex-shrink-0 text-[9.5px] font-bold tracking-[0.4px] text-[#3a324a8c]">
        待ち合わせ
      </span>
      <span
        className={`min-w-0 flex-1 truncate text-right text-[11px] ${
          set ? "font-bold text-[#3a324a]" : "font-medium text-[#3a324a4d]"
        }`}
      >
        {summary}
      </span>
    </div>
  );
}
