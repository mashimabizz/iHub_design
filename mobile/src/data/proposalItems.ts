import { findCandidateContext } from "./homeMatches";

export type ProposalSide = "give" | "receive";

export type ProposalChoiceItem = {
  id: string;
  title: string;
  subtitle: string;
  glyph: string;
  hue: string;
  hint: string;
};

export type ProposalThumbItem = {
  id: string;
  label: string;
  glyph: string;
  color: string;
};

type CatalogItem = {
  title: string;
  subtitle: string;
  glyph: string;
  hue: string;
};

const GIVE_HINT = "相手がほしいものかも？";
const RECEIVE_HINT = "私がほしいものかも？";

const ITEM_CATALOG: Record<string, CatalogItem> = {
  "give-1": {
    title: "カリナ 春ver.",
    subtitle: "aespa / トレカ",
    glyph: "K",
    hue: "#f3c5d4",
  },
  "give-2": {
    title: "ジョンウ ラキドロ",
    subtitle: "NCT / トレカ",
    glyph: "J",
    hue: "#a8d4e6",
  },
  "receive-1": {
    title: "スア ラキドロ",
    subtitle: "LUMENA / トレカ",
    glyph: "S",
    hue: "#cbbcf4",
  },
  "receive-2": {
    title: "ニンニン 制服",
    subtitle: "aespa / アクスタ",
    glyph: "N",
    hue: "#d5cff4",
  },
  selected: {
    title: "スア ラキドロ",
    subtitle: "LUMENA / トレカ",
    glyph: "S",
    hue: "#cbbcf4",
  },
  "selected-alt": {
    title: "スア 会場限定",
    subtitle: "LUMENA / トレカ",
    glyph: "S",
    hue: "#f3c5d4",
  },
  "partner-have-1": {
    title: "ニンニン 制服",
    subtitle: "aespa / アクスタ",
    glyph: "N",
    hue: "#a8d4e6",
  },
  "partner-have-2": {
    title: "ウィンター 缶バッジ",
    subtitle: "aespa / 缶バッジ",
    glyph: "W",
    hue: "#d5cff4",
  },
  "my-have-1": {
    title: "カリナ 春ver.",
    subtitle: "aespa / トレカ",
    glyph: "K",
    hue: "#f3c5d4",
  },
  "my-have-2": {
    title: "ジョンウ ラキドロ",
    subtitle: "NCT / トレカ",
    glyph: "J",
    hue: "#a8d4e6",
  },
  "my-have-bad": {
    title: "V トレカ",
    subtitle: "BTS / トレカ",
    glyph: "V",
    hue: "#b7dceb",
  },
  "wish-partner-1": {
    title: "カリナ 店舗特典",
    subtitle: "aespa / トレカ",
    glyph: "K",
    hue: "#f7d5df",
  },
  "wish-mine-1": {
    title: "スア ラキドロ",
    subtitle: "LUMENA / トレカ",
    glyph: "S",
    hue: "#cbbcf4",
  },
  "wish-mine-2": {
    title: "ニンニン 制服",
    subtitle: "aespa / アクスタ",
    glyph: "N",
    hue: "#d5cff4",
  },
};

const BASE_IDS: Record<ProposalSide, string[]> = {
  give: ["give-1", "give-2"],
  receive: ["receive-1", "receive-2"],
};

export function parseProposalIdList(value?: string | string[]): string[] {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return [];
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export function buildProposalChoices(
  ids: string[],
  side: ProposalSide,
): ProposalChoiceItem[] {
  const orderedIds = uniqueIds([...ids, ...BASE_IDS[side]]);
  return orderedIds.map((id) => toProposalChoice(id, side));
}

export function buildProposalThumbs(
  ids: string[],
  side: ProposalSide,
): ProposalThumbItem[] {
  const orderedIds = ids.length > 0 ? uniqueIds(ids) : BASE_IDS[side];
  return orderedIds.map((id) => toProposalThumb(id, side));
}

function toProposalChoice(
  id: string,
  side: ProposalSide,
): ProposalChoiceItem {
  const item = resolveItem(id, side);
  return {
    id,
    title: item.title,
    subtitle: item.subtitle,
    glyph: item.glyph,
    hue: item.hue,
    hint: side === "give" ? GIVE_HINT : RECEIVE_HINT,
  };
}

function toProposalThumb(
  id: string,
  side: ProposalSide,
): ProposalThumbItem {
  const item = resolveItem(id, side);
  return {
    id,
    label: item.title,
    glyph: item.glyph,
    color: item.hue,
  };
}

function resolveItem(id: string, side: ProposalSide): CatalogItem {
  const catalogItem = ITEM_CATALOG[id];
  if (catalogItem) return catalogItem;

  const context = findCandidateContext(id);
  if (context) {
    return {
      title: context.candidate.label,
      subtitle: `${context.row.character} / ${context.row.goodsType}`,
      glyph: context.candidate.member,
      hue: context.candidate.hue,
    };
  }

  const label = id.replace(/[-_]/g, " ");
  return {
    title: label,
    subtitle: "プレビュー / グッズ",
    glyph: label.slice(0, 1).toUpperCase() || "?",
    hue: side === "give" ? "#a8d4e6" : "#cbbcf4",
  };
}

function uniqueIds(ids: string[]): string[] {
  return Array.from(new Set(ids.filter(Boolean)));
}
