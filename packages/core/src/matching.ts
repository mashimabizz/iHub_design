export type MatchStrength =
  | "both_listing"
  | "one_listing"
  | "wish"
  | "unknown";

export function getMatchStrengthRank(strength: MatchStrength): number {
  switch (strength) {
    case "both_listing":
      return 0;
    case "one_listing":
      return 1;
    case "wish":
      return 2;
    case "unknown":
      return 9;
  }
}

export function compareMatchStrength(
  a: MatchStrength,
  b: MatchStrength,
): number {
  return getMatchStrengthRank(a) - getMatchStrengthRank(b);
}
