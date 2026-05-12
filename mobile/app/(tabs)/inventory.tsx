import { FoundationCard } from "../../src/components/FoundationCard";
import { Screen } from "../../src/components/Screen";

export default function InventoryScreen() {
  return (
    <Screen>
      <FoundationCard
        eyebrow="INVENTORY"
        title="マイ在庫"
        body="Web版の在庫状態、列数、下部アクションシートをiOS向けに作り直す予定です。"
      />
    </Screen>
  );
}
