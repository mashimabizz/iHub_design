import { FoundationCard } from "../../src/components/FoundationCard";
import { Screen } from "../../src/components/Screen";

export default function WishesScreen() {
  return (
    <Screen>
      <FoundationCard
        eyebrow="WISH"
        title="Wish"
        body="Wish追加、列数変更、個別募集への導線をiOSの下部固定アクションとして再設計します。"
      />
    </Screen>
  );
}
