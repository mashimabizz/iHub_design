import { FoundationCard } from "../../src/components/FoundationCard";
import { Screen } from "../../src/components/Screen";

export default function TransactionsScreen() {
  return (
    <Screen>
      <FoundationCard
        eyebrow="TRANSACTIONS"
        title="打診・取引"
        body="打診中/進行中/完了、要対応/相手待ち、取引チャットをWebと同じ状態判定で動かします。"
      />
    </Screen>
  );
}
