import type {
  createClient,
  createServiceRoleClient,
} from "@/lib/supabase/server";

type UserClient = Awaited<ReturnType<typeof createClient>>;
type ServiceClient = ReturnType<typeof createServiceRoleClient>;
type SupabaseServerClient = UserClient | ServiceClient;

type ReservableItemRow = {
  id: string;
  quantity?: number | null;
};

type ProposalReservationRow = {
  id: string;
  sender_have_ids: string[] | null;
  sender_have_qtys: number[] | null;
  receiver_have_ids: string[] | null;
  receiver_have_qtys: number[] | null;
  approved_by_sender?: boolean | null;
  approved_by_receiver?: boolean | null;
};

type InventoryCheckRow = {
  id: string;
  user_id: string;
  kind: string;
  status: string;
  quantity: number | null;
  title: string | null;
  group?: { name: string | null } | { name: string | null }[] | null;
  character?: { name: string | null } | { name: string | null }[] | null;
  goods_type?: { name: string | null } | { name: string | null }[] | null;
};

type AvailabilityIssue = {
  id: string;
  label: string;
  reason: string;
};

function addReserved(
  target: Map<string, number>,
  ids: string[] | null | undefined,
  qtys: number[] | null | undefined,
  filterIds?: Set<string>,
) {
  for (let i = 0; i < (ids?.length ?? 0); i++) {
    const id = ids?.[i];
    if (!id || (filterIds && !filterIds.has(id))) continue;
    const qty = Math.max(1, qtys?.[i] ?? 1);
    target.set(id, (target.get(id) ?? 0) + qty);
  }
}

/**
 * 合意済みの打診で、まだ取引完了承認されていない譲在庫の予約数。
 *
 * approveCompletion は承認した側の実在庫を先に減らすため、
 * approved_by_* が true の側は予約数から外して二重控除を避ける。
 */
export async function getAgreedReservedQtyByInvId(
  supabase: SupabaseServerClient,
  inventoryIds?: string[],
  excludeProposalId?: string,
): Promise<Map<string, number>> {
  const filterIds =
    inventoryIds && inventoryIds.length > 0 ? new Set(inventoryIds) : undefined;

  let query = supabase
    .from("proposals")
    .select(
      `id,
       sender_have_ids, sender_have_qtys,
       receiver_have_ids, receiver_have_qtys,
       approved_by_sender, approved_by_receiver`,
    )
    .eq("status", "agreed");

  if (excludeProposalId) {
    query = query.neq("id", excludeProposalId);
  }

  const { data } = await query;
  const reserved = new Map<string, number>();

  for (const row of (data as ProposalReservationRow[]) ?? []) {
    if (!row.approved_by_sender) {
      addReserved(
        reserved,
        row.sender_have_ids,
        row.sender_have_qtys,
        filterIds,
      );
    }
    if (!row.approved_by_receiver) {
      addReserved(
        reserved,
        row.receiver_have_ids,
        row.receiver_have_qtys,
        filterIds,
      );
    }
  }

  return reserved;
}

export function buildMarketAvailableQtyByInvId<T extends ReservableItemRow>(
  rows: T[],
  reservedQtyByInvId: Map<string, number>,
): Map<string, number> {
  const available = new Map<string, number>();
  for (const row of rows) {
    const total = row.quantity ?? 1;
    available.set(row.id, Math.max(0, total - (reservedQtyByInvId.get(row.id) ?? 0)));
  }
  return available;
}

export function withMarketAvailableQuantity<T extends ReservableItemRow>(
  rows: T[],
  availableQtyByInvId: Map<string, number>,
): T[] {
  return rows
    .map((row) => ({
      ...row,
      quantity: availableQtyByInvId.get(row.id) ?? row.quantity ?? 1,
    }))
    .filter((row) => (row.quantity ?? 0) > 0);
}

export function applyListingMarketAvailability<
  T extends {
    haveIds: string[];
    haveQtys: number[];
    haveLogic: "and" | "or";
  },
>(listing: T, availableQtyByInvId: Map<string, number>): T | null {
  const isAvailable = (id: string, index: number) =>
    (availableQtyByInvId.get(id) ?? 0) >= (listing.haveQtys[index] ?? 1);

  if (listing.haveLogic === "and") {
    return listing.haveIds.every(isAvailable) ? listing : null;
  }

  const nextIds: string[] = [];
  const nextQtys: number[] = [];
  for (let i = 0; i < listing.haveIds.length; i++) {
    const id = listing.haveIds[i];
    if (!isAvailable(id, i)) continue;
    nextIds.push(id);
    nextQtys.push(listing.haveQtys[i] ?? 1);
  }
  if (nextIds.length === 0) return null;
  return { ...listing, haveIds: nextIds, haveQtys: nextQtys };
}

function aggregateNeeded(ids: string[], qtys: number[]): Map<string, number> {
  const result = new Map<string, number>();
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    if (!id) continue;
    result.set(id, (result.get(id) ?? 0) + Math.max(1, qtys[i] ?? 1));
  }
  return result;
}

function pickRelationName(
  value: { name: string | null } | { name: string | null }[] | null | undefined,
): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0]?.name ?? null : value.name;
}

function buildInventoryLabel(row: InventoryCheckRow | undefined, id: string) {
  if (!row) return `ID: ${id.slice(0, 8)}`;
  const title = row.title?.trim();
  const groupName = pickRelationName(row.group);
  const characterName = pickRelationName(row.character);
  const goodsTypeName = pickRelationName(row.goods_type);
  const fallback = [groupName, characterName, goodsTypeName]
    .filter(Boolean)
    .join(" / ");
  return title || fallback || `ID: ${id.slice(0, 8)}`;
}

function labelInventoryKind(kind: string) {
  switch (kind) {
    case "for_trade":
      return "譲る候補";
    case "wanted":
      return "Wish";
    case "keep":
      return "自分キープ";
    default:
      return kind;
  }
}

function labelInventoryStatus(status: string) {
  switch (status) {
    case "active":
      return "交換対象";
    case "keep":
      return "自分キープ";
    case "traded":
      return "譲渡済み";
    case "reserved":
      return "予約中";
    case "archived":
      return "削除済み";
    default:
      return status;
  }
}

function buildAvailabilityError(issues: AvailabilityIssue[]): { error?: string } {
  if (issues.length === 0) return {};

  const visibleIssues = issues
    .slice(0, 5)
    .map((issue) => `・「${issue.label}」：${issue.reason}`)
    .join("\n");
  const extraCount =
    issues.length > 5 ? `\nほか ${issues.length - 5} 件あります。` : "";

  return {
    error:
      "交換条件に使えない譲グッズがあります。\n" +
      visibleIssues +
      extraCount +
      "\n対象のグッズを個別募集から外すか、マイ在庫で状態・在庫数を確認してください。",
  };
}

/**
 * 打診成立前の最終ガード。
 * 見た目上のマイ在庫 quantity は減らさず、合意済み打診で確保済みの数量を
 * 差し引いた「市場残数」でキャパ超過を止める。
 */
export async function assertProposalItemsMarketAvailable(
  supabase: SupabaseServerClient,
  input: {
    senderId: string;
    receiverId: string;
    senderHaveIds: string[];
    senderHaveQtys: number[];
    receiverHaveIds: string[];
    receiverHaveQtys: number[];
    excludeProposalId?: string;
  },
): Promise<{ error?: string }> {
  const senderNeeded = aggregateNeeded(input.senderHaveIds, input.senderHaveQtys);
  const receiverNeeded = aggregateNeeded(
    input.receiverHaveIds,
    input.receiverHaveQtys,
  );
  const allIds = Array.from(
    new Set([...senderNeeded.keys(), ...receiverNeeded.keys()]),
  );
  if (allIds.length === 0) return {};

  const [{ data: rows }, reservedQtyByInvId] = await Promise.all([
    supabase
      .from("goods_inventory")
      .select(
        "id, user_id, kind, status, quantity, title, group:groups_master(name), character:characters_master(name), goods_type:goods_types_master(name)",
      )
      .in("id", allIds),
    getAgreedReservedQtyByInvId(supabase, allIds, input.excludeProposalId),
  ]);

  const invById = new Map(
    ((rows as InventoryCheckRow[]) ?? []).map((row) => [row.id, row] as const),
  );

  const checkSide = (
    needed: Map<string, number>,
    ownerId: string,
  ): AvailabilityIssue[] => {
    const issues: AvailabilityIssue[] = [];

    for (const [id, qty] of needed) {
      const row = invById.get(id);
      if (!row || row.user_id !== ownerId) {
        issues.push({
          id,
          label: buildInventoryLabel(row, id),
          reason: row
            ? "このアカウントの譲グッズではありません"
            : "グッズが削除されているか、参照できません",
        });
        continue;
      }
      if (row.kind !== "for_trade") {
        issues.push({
          id,
          label: buildInventoryLabel(row, id),
          reason: `マイ在庫の分類が「${labelInventoryKind(row.kind)}」です`,
        });
        continue;
      }
      if (row.status !== "active") {
        issues.push({
          id,
          label: buildInventoryLabel(row, id),
          reason: `マイ在庫の状態が「${labelInventoryStatus(row.status)}」です`,
        });
        continue;
      }
      const available = Math.max(
        0,
        (row.quantity ?? 1) - (reservedQtyByInvId.get(id) ?? 0),
      );
      if (qty > available) {
        issues.push({
          id,
          label: buildInventoryLabel(row, id),
          reason: `交換可能数が不足しています（必要 ${qty} / 市場残数 ${available} / 登録数 ${row.quantity ?? 1}）`,
        });
      }
    }

    return issues;
  };

  const issues = [
    ...checkSide(senderNeeded, input.senderId),
    ...checkSide(receiverNeeded, input.receiverId),
  ];
  return buildAvailabilityError(issues);
}

/**
 * 譲在庫が削除・非 active 化された時に、開いている個別募集の譲条件から外す。
 * 全て外れてしまう listing は closed にして、市場にも一覧にも出さない。
 */
export async function removeUnavailableHavesFromListings(
  supabase: SupabaseServerClient,
  userId: string,
  inventoryIds: string[],
): Promise<void> {
  if (inventoryIds.length === 0) return;
  const removeSet = new Set(inventoryIds);

  const { data: listings } = await supabase
    .from("listings")
    .select("id, have_ids, have_qtys, status")
    .eq("user_id", userId)
    .in("status", ["active", "paused"]);

  for (const listing of
    (listings as {
      id: string;
      have_ids: string[] | null;
      have_qtys: number[] | null;
      status: string;
    }[]) ?? []) {
    const haveIds = listing.have_ids ?? [];
    if (!haveIds.some((id) => removeSet.has(id))) continue;

    const nextIds: string[] = [];
    const nextQtys: number[] = [];
    for (let i = 0; i < haveIds.length; i++) {
      const id = haveIds[i];
      if (removeSet.has(id)) continue;
      nextIds.push(id);
      nextQtys.push(listing.have_qtys?.[i] ?? 1);
    }

    if (nextIds.length === 0) {
      await supabase
        .from("listings")
        .update({ status: "closed" })
        .eq("id", listing.id)
        .eq("user_id", userId);
      continue;
    }

    await supabase
      .from("listings")
      .update({ have_ids: nextIds, have_qtys: nextQtys })
      .eq("id", listing.id)
      .eq("user_id", userId);
  }
}
