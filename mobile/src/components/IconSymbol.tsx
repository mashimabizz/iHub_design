import { Text, type TextStyle, type StyleProp } from "react-native";

export type IconSymbolName =
  | "add"
  | "arrow-forward"
  | "ban-outline"
  | "calendar-outline"
  | "camera-outline"
  | "checkmark-circle-outline"
  | "chevron-down"
  | "chevron-forward"
  | "close"
  | "close-circle-outline"
  | "create-outline"
  | "document-text-outline"
  | "lock-closed-outline"
  | "mail-outline"
  | "mail-unread-outline"
  | "notifications-outline"
  | "receipt-outline"
  | "scale-outline"
  | "search"
  | "shield-checkmark-outline"
  | "sparkles-outline"
  | "star-outline"
  | "time-outline"
  | "warning-outline";

const GLYPHS: Record<IconSymbolName, string> = {
  add: "+",
  "arrow-forward": "→",
  "ban-outline": "⊘",
  "calendar-outline": "□",
  "camera-outline": "▣",
  "checkmark-circle-outline": "✓",
  "chevron-down": "⌄",
  "chevron-forward": "›",
  close: "×",
  "close-circle-outline": "×",
  "create-outline": "✎",
  "document-text-outline": "▤",
  "lock-closed-outline": "⌂",
  "mail-outline": "✉",
  "mail-unread-outline": "✉",
  "notifications-outline": "!",
  "receipt-outline": "▧",
  "scale-outline": "⚖",
  search: "⌕",
  "shield-checkmark-outline": "✓",
  "sparkles-outline": "✦",
  "star-outline": "★",
  "time-outline": "◷",
  "warning-outline": "!",
};

export function IconSymbol({
  color,
  name,
  size,
  style,
}: {
  color: string;
  name: IconSymbolName;
  size: number;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text
      allowFontScaling={false}
      style={[
        {
          color,
          fontSize: size,
          fontWeight: "900",
          lineHeight: Math.round(size * 1.12),
          textAlign: "center",
        },
        style,
      ]}
    >
      {GLYPHS[name]}
    </Text>
  );
}
