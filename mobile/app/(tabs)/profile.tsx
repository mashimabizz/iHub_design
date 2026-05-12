import { FoundationCard } from "../../src/components/FoundationCard";
import { Screen } from "../../src/components/Screen";

export default function ProfileScreen() {
  return (
    <Screen>
      <FoundationCard
        eyebrow="PROFILE"
        title="プロフィール"
        body="推し設定、スケジュール、評価、本人の表示情報をiOSの右スライド遷移でつなげます。"
      />
    </Screen>
  );
}
