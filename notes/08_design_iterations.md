# Claude Design イテレーション記録（圧縮版）

（2026-04-27〜 ／ 2026-04-28 解決済イテレーションを圧縮）

---

## 現状サマリ

### 完了画面
ホーム → C-1〜C-3（打診→チャット→取引完了）→ B-1〜B-3（在庫管理＋撮影＋X投稿）→ AW（参戦予定編集）→ 一括再訪 → C-3 相違あり詳細フロー → コレクション図鑑（4画面）

### ファイル状況
- `iHub MVP.html`（統合版、4セクション×18アートボード）
- `iHub Dispute Flow _standalone_.html`（8.7MB、Dispute Flow 10画面）
- コレクション図鑑（独立4画面、ファイル名未確認）

### 完了確認（直近 イテレーション15・16）
- Dispute Flow standalone：前回フィードバック（②'ラベル修正・「任意で追加」明示・進捗バー3パターン分岐・申告者名警告・キャンセル理由中立化・⑥b評価ロジック）すべて反映済
- コレクション図鑑 4画面：F10達成感の具現化、譲るとして登録CTA・探し中パルス＋所持ユーザーリスト・コンプ演出、ハナ評価95点

---

## 確定設計判断（28項目）

詳細は [07_mvp_handoff.md](07_mvp_handoff.md) 参照。要約：
- 現地交換特化MVP／ジャンル横断スタート（KPOPから）／全公開モデル
- 4タブマッチング＋昇格導線／打診プロセス（両者通知→打診→諾否）／L4多者間はMVP外
- C-3① 証跡撮影：「左=相手 / 右=自分」固定
- AW 編集案①／② 両方残す（事前計画／当日現地）

---

## MVP仕様への追加機能（採用済 24件）

| # | 機能 | 出処 |
|---|------|------|
| 1 | メッセージトーン切替（標準／カジュアル／丁寧） | C-1 |
| 2 | 推奨合流ポイント自動提案＋@iHub推奨バッジ | C-1 |
| 3 | 取引完了時のX連携自動投稿 | C-3 |
| 4 | 「今すぐ交換」エクスプレス（5分以内合流） | AW |
| 5 | クローズ時間自動促進通知 | AW |
| 6 | 終了AWの自動アーカイブ | AW |
| 7 | AW一時無効トグル | AW |
| 8 | QR本人確認（相互スキャン） | C-2 |
| 9 | 送信前確認モーダル | C-1 |
| 10 | 服装写真の撮影 › CTA | C-1 |
| 11 | 「相違あり」進捗3ステップ表示 | C-3 |
| 12 | 「相違あり」5種カテゴリ（ドタキャン/遅刻分離） | C-3詳細 |
| 13 | 仲裁SLA（当日4h／それ以外24h） | C-3詳細 |
| 14 | 申告中の打診凍結（共に新規のみ） | C-3詳細 |
| 15 | 反論機会付与（相手側通知） | C-3詳細 |
| 16 | 受付番号採番 | C-3詳細 |
| 17 | 24h残時間カウンタ | C-3詳細 |
| 18 | 「書き方のコツ」アドバイス | C-3詳細 |
| 19 | キャンセル＝警告色／遅刻＝通常色 | 関連フロー |
| 20 | 遅刻30分以上→相手側キャンセル可 | 関連フロー |
| 21 | コンプ達成バッジ＋演出（MVP静的） | コレクション図鑑 |
| 22 | 図鑑→wish自動追加（1タップ） | コレクション図鑑 |
| 23 | 取引成立時の写真を図鑑で表示 | コレクション図鑑 |
| 24 | コレクションのXシェア | コレクション図鑑 |

---

## ターン1 実行内容（次のスコープ）

### A. Bフロー軽微修正
- 「下書き」→「**登録中**」表記統一
- 「自動」→「**補正**」（傾き・コントラスト補正の意）
- B-2 撮影モード3つ（通常／クイック／連続）の説明テキスト追加

### B. コレクション図鑑微調整
- ①「推し全員」→「全メンバー」リネーム
- ③ メトリクス3つ並びレイアウト修正
- ②「譲るとして登録」CTA は MVP採用済として維持
- ④ 達成メタは静的表示＋PRD付記
- ④ コンプ演出は静的SVG＋フルアニメは後フェーズ明記

### C. Dispute派生 B-1／B-2 画面追加（既存 Dispute Flow に派生）

| ID | 画面 | 仕様 |
|----|------|------|
| B-1 | 運営追加情報リクエスト UI | **D-5d 派生**として作る。仲裁中ステータスの「運営に追加情報を送る」ボタンの中身。進捗バーに「運営からの追加質問」ステップ挿入。中身：質問本文＋返信テキスト＋追加証跡アップロード。**「24時間以内に回答」表記入れる** |
| B-2 | 再審査申請＋受付ステータス | **D-6 から「結果に納得いかない場合」リンク → シンプル申立てフォーム**（理由500字＋追加証跡）。申立て後「**再審査受付中(48h)**」ステータス表示 |

### D. B-3 評価保留中バッジ仕様（今ターンは仕様確定のみ、実装はターン2）
- プロフ画面（自分／他者）：「★4.7 取引89回 ／ **保留中 1件**」サマリ表示
- ホーム画面マッチカード：「★4.5 取引157」に **「保留中1件」**追記
- 取引タブ（ターン2で作る）：保留中の取引行に**「保留中」バッジ**

---

## ターン分割計画

```
ターン1（実行中）：Bフロー軽微修正＋図鑑微調整＋Dispute派生 B-1/B-2
ターン2：MVP必須未画面化4画面（取引タブ／規約違反通報／運営問い合わせ／設定）
ターン3：オンボーディング（性別→推しグループ→メンバー→AW初期設定）
ターン4：MVP仕様書 v2 反映＋ハンドオフ完成
```

---

## MVP必須の未画面化エリア（ターン2以降で対応）

| # | 領域 | 必須度 | 備考 |
|---|------|--------|------|
| D | **取引タブの中身**（ボトムナビ） | **最重要** | 打診中／進行中／過去取引のタブ構成 |
| E | 利用規約違反通報 | 必須 | C-3 とは別系統、ユーザー単位の通報 |
| F | 運営問い合わせ動線 | 必須 | FAQ・規約違反・本人確認・機能要望 |
| G | 設定画面（最小版） | 必須 | 通知・プライバシー・アカウント管理 |

---

## 残課題（小）

- ⑤b（相手が認めた）／⑤c（24h無回答）の「提出済み証跡」セクションのラベル分岐（コピー artifact 可能性）
- 「相手の反論」詳細の開示範囲（プライバシー設計確定要）
- B-3 評価保留中バッジの実装（ターン2の取引タブ＋既存マッチカードで反映）

---

## 過去のイテレーション索引（参考のみ）

- 1〜4：ホーム＋C-1〜C-3 visual＋方針確定
- 5〜8：B 在庫管理＋撮影＋X投稿（11質問回答→出力評価）
- 9〜10：AW 方針＋一覧＋他人プレビュー（11質問→出力評価）
- 11：統合ファイル一括再訪（蓄積フィードバック消化）
- 12〜13：C-3 相違あり詳細方針（8質問→Dispute Flow 10画面出力）
- 14〜15：コレクション図鑑方針＋Dispute standalone 反映確認
- 16：コレクション図鑑 4画面出力（95点）
- 17：ターン1 完了（Bフロー軽微修正＋図鑑微調整＋Dispute派生3画面）

---

## イテレーション17：ターン1 完了確認

### 反映確認 ✅

**Bフロー軽微修正**：
- 「下書き保存中」→「登録中」（aw-edit）
- 「自動生成」→「補正済」「下書き作成」（b-inventory）
- B-2 撮影モード3種に説明＋現在モード説明バッジ

**図鑑微調整**：
- 「推し全員」→「全メンバー」
- メトリクス3つを単独カード化（ラベル位置上、数字大きく）

**Dispute派生3画面（既存ファイル拡張）**：
- ⑤d 運営追加質問：質問本文＋返信フォーム＋追加証跡＋24h残カウント
- ⑥c 再審査申立て：4種理由区分＋500字本文＋追加証跡＋7日期限
- ⑥d 再審査受付ステータス：48h可否判断＋進捗4ステップ＋評価再保留

### 気になる小さな点（次マイルストーン対応で OK）

1. **⑥d 進捗の「部下通知」タイポ** → 「結果通知」が正解
2. **⑤d「保存」ボタンの挙動補助**（ホバーテキスト or サブラベル）
3. **⑥c 理由区分の文言ソフト化**（事実認定に誤り → 事実の判断に納得できない 等）

---

## ターン2 仕様確定

### D. 取引タブ
- **3タブ構成**：打診中／進行中／過去取引
- **打診中タブ**：統合表示＋方向アイコン（送信→/受信←）＋行内ラベル「打診を送った/届いた」
- **進行中タブ**：B-3 評価保留中バッジ表示（仲裁中ステータスへの導線）
- **過去取引タブ**：完了＋キャンセル済両方含む／フィルタチップ（すべて／完了／キャンセル／申告不成立）／新着降順デフォルト＋★順・相手別ソート／各完了行に「コレクション図鑑へ」リンク／B-3バッジも表示
- **空状態UI**：3タブそれぞれに必須（次のアクション CTA 付き）

### E. 利用規約違反通報
- **起動口**：プロフ「・・・」メニュー＋ブロック後ボトムシート連携 の両方併設
- **理由カテゴリ**：6種（嫌がらせ／スパム／偽装／詐欺／不適切な内容／その他）＋「不適切」の例示プレースホルダー
- **証跡**：スクショ任意×3＋本文500字
- **通報後**：完了画面＋「ブロックする」CTA＋受付番号 #REP-xxxx 採番（C-3 #DPT- と整合）＋「48-72h で運営確認」表記

### F. 運営問い合わせ動線
- **構成**：FAQ一覧（検索バー付き）→「問い合わせる」CTA → カテゴリ選択 → フォーム の3ステップ
- **カテゴリ**：5種（機能の使い方／不具合報告／本人確認／機能要望／その他）
- **FAQ**：MVPは10件程度（5カテゴリ×2件）
- **返信**：メール優先＋アプリ内プッシュ通知（両方）

### G. 設定画面（最小版）
- アカウント（プロフ編集／推し設定／本人確認状態）
- 自分の AW 一覧
- 通知設定（プッシュ／メール、トピック別）
- プライバシー（ブロックリスト／公開範囲）
- ヘルプ＆問い合わせ（→ F へ）
- 利用規約／プライバシーポリシー
- **アプリ情報（バージョン・利用状況サマリ）** ← ハナ追加
- ログアウト／アカウント削除

### 配置場所
**新規ファイル**（仮）`iHub MVP Surfaces.html` または `iHub Account & Support.html`
- 4画面が密接に関連、別ファイルで管理

---

## イテレーション18：ターン2 完了確認（11画面）

### 反映確認 ✅

**D. 取引タブ（4画面）**：3タブ＋件数バッジ／送信→/←受信ラベル／申告中・仲裁中分離表示＋DPT番号＋SLA残時間／過去取引フィルタ4種＋図鑑リンク／空状態UI

**E. 規約違反通報（2画面）**：6カテゴリ＋説明文／受付番号#REP-3942／ブロックCTA連携

**F. ヘルプ・問い合わせ（2画面）**：FAQ検索＋クイックリンク＋アコーディオン／5カテゴリ＋環境情報自動添付

**G. 設定（3画面）**：プロフィールチップ／AW一覧ハブ＋本日バッジ＋未設定警告／通知トピック別12項目＋夜間モード

### 重要な flag 🚨：ボトムナビ変更

**「ホーム／在庫／取引／ウィッシュ／プロフ」→「ホーム／探索／取引／図鑑／マイ」** に変更されている。

- **要確認**：在庫管理・ウィッシュ管理の動線（マイ→深い階層？）
- **要確認**：「探索」タブと「ホーム画面の探索タブ」の関係
- 影響範囲：ホーム画面・B-1（在庫管理）・ウィッシュリスト管理

### 残った小さな点
- E通報：虚偽通報警告が画面で目立たない、CTA直前に注記検討
- 「Bフロー軽微修正」「図鑑微調整」の反映を画面で再確認したい

---

## 次の推奨：ホーム画面見直し → PRD更新 → オンボーディング

```
次：(b) ホーム画面の見直し（ボトムナビ整理＋Bフロー再確認＋マッチカード密度）
↓
(c) PRD更新（MVP仕様書 v2、採用機能30件超を反映）
↓
ターン3：オンボーディング（性別→推しグループ→メンバー→AW初期設定）
↓
ターン4：MVP最終ハンドオフ
```

---

## ボトムナビ確定（仕様書準拠＋役割分担明確化）

| # | タブ | 役割 | 中身 |
|---|------|------|------|
| 1 | **ホーム** | マッチ提案（出会いの場） | 4タブ：完全マッチ／私の譲が欲しい人／私が欲しい譲を持つ人／探索 |
| 2 | **在庫** | 自分の在庫管理（CRUD） | B-1〜B-3：一覧＋撮影＋X投稿、携帯モード切替、コレクション進捗バー |
| 3 | **取引** | 取引の進捗・履歴 | D：打診中／進行中／過去取引 |
| 4 | **ウィッシュ** | 自分のwish管理 | wish一覧＋優先度＋flexibility＋「探し中」ステータス |
| 5 | **プロフ** | アイデンティティハブ | プロフ編集／推し設定／**私の図鑑**／取引履歴サマリ／**自分のAW一覧**／**設定**（ヘルプ・問い合わせ・通報含む） |

### 動線確定
- **図鑑（F10・4画面）**：プロフ → 「私の図鑑」セクション → 図鑑詳細
  - 深いリンク：C-3取引完了の「あと5枚でコンプ」、取引タブ完了行「図鑑で見る ›」
- **設定（G・3画面）**：プロフ → 「設定」リンク
- **AW一覧（G-②）**：プロフ → 「自分のAW一覧」または「+AWを追加」
- **問い合わせ（F・2画面）**：プロフ → 設定 → ヘルプ＆問い合わせ
- **規約違反通報（E・2画面）**：プロフ画面の「・・・」メニュー or ブロック後ボトムシート連携
- **マッチ通知**：ホーム画面の「私が欲しい譲を持つ人」タブに集中（ウィッシュタブとは重複させない）

### ウィッシュタブ仕様（新規画面）
- 自分のwish一覧 CRUD
- 各行に：グッズ画像＋名前／優先度バッジ／flexibility表示／**「探し中」ステータス**（マッチあり◯件・AW近隣◯人・◯日前から探し中）
- タップで編集（優先度・flexibility・通知設定）

### (b) ホーム見直しのスコープ
1. ボトムナビを「ホーム／在庫／取引／ウィッシュ／プロフ」に戻す
2. プロフタブを **アイデンティティハブ**に再構成（図鑑・AW・設定・履歴を集約）
3. ウィッシュタブを新規作成（CRUD＋ステータス）
4. Bフロー軽微修正の画面確認（下書き→登録中、自動→補正）
5. マッチカード密度・優先度ロジック可視化の調整
6. **AW 仕様の修正**（重要）

---

## AW 仕様の修正（イテレーション18.5）

### 問題発覚
Claude Design の現状実装：
- AW = "**Active Window**"（アクティブウィンドウ）と誤解釈
- 「**イベントに参戦している／する予定**」が前提
- 位置主導モードでも「自動でイベントを推測」
- マッチングが「同じイベント参戦者」基準

### 確定仕様の再確認
[確定設計判断 #1] **「現地」の射程 = 場所＋時間の Availability Window を基本、イベントは便利タグ**

- AW = "**Availability Window（合流可能枠）**"
- 基本データモデル = 場所×時間×半径
- イベント = optional tag、UX ショートカット
- **イベントなしでも AW は成立**（販売会・突発交流・空き時間の現地交換等）

### 修正項目

| 項目 | 修正内容 |
|------|---------|
| AW 略称の意味 | "Availability Window（合流可能枠）" を明記 |
| AW 編集画面 | 位置主導で「イベントを紐付けない」を明示的に許容（イベント任意） |
| AW 一覧画面 | イベント名のないAWの表示パターン追加（例：「渋谷駅周辺 / 4/30 14:00-16:00」） |
| ホームのマッチ提案 | 「時空交差」が基本、イベント一致は加点要素として明記 |
| 画面文言 | 「参戦予定」→「合流可能枠」or「予定」、イベント前提でない表現に |

### 修正規模
軽微〜中規模（データモデルは元々 `availability_windows.event_id` nullable で設計済、UI と文言の調整が中心）

---

## 在庫＋コレクション図鑑 仕様修正（イテレーション18.6）

### 問題発覚
1. 在庫タブと図鑑タブが分離 → ナビ冗長
2. 図鑑が「シリーズ全種類コンプ」前提 → ヲタの楽しみ方が画一的
3. シリーズ全件カタログ化が運営負担として非現実的
4. 「自分用キープ」を表現する仕組みがない

### 新仕様（在庫タブに統合 ＋ wish ベース図鑑）

#### ボトムナビ
- 図鑑タブを廃止、「ホーム／在庫／取引／ウィッシュ／プロフ」のまま
- プロフから「コレクションサマリ」の小さい表示のみ

#### user_haves に新ステータス
- 既存：active / reserved / traded / withdrawn
- 追加：**keep**（自分用キープ、マッチング対象外、図鑑には反映）

#### 在庫タブの構造
- 上タブ：譲るもの / 求めるもの
- 譲るもの内のサブビュー：譲る候補 / 自分用キープ / 過去に譲った
- **表示モード切替**：📋 リスト / 📚 コレクション

#### コレクション表示モード（wish ベース）
| 状態 | 表示 |
|------|------|
| wish登録＋未取得 | シルエット＋「探し中」 |
| wish登録＋取得済（active/keep/traded 経験） | カラー |
| wish未登録 | 表示されない |

#### 達成演出の発火条件
- 旧：「シリーズ全種類取得」 → **廃止**
- 新：**「フィルタした範囲の wish 全件取得」** で発火
- 例：「スアのwish 4件全部取得」→「スアコレ コンプ達成！」演出

#### データモデル簡素化
- シリーズマスタの「全件カタログ化」は **不要**
- 運営マスタはジャンル → グループ → メンバー → グッズ種別の階層のみ
- コンプ判定は wish 基準で動的計算

### 修正対象ファイル
- iHub B Inventory.html（表示モード切替＋3サブビュー＋コレクション表示）
- iHub B Inventory.html（メタ入力に譲る/自分用キープ2択）
- iHub Collection Pokedex.html → **廃止**
- iHub Hub Screens.html プロフハブ（コレクションサマリのみ）
- iHub Home v2.html（マッチカードの文言を個人達成ベースに）
- iHub C Flow.html C-3（「あと◯枚でコンプ」を個人達成ベースに）

### 反映確認（イテレーション19）

✅ ナビ統一5タブ：ホーム／在庫／取引／ウィッシュ／プロフ
✅ リスト／コレクション切替の上タブ
✅ 3サブビュー（譲る候補 / 自分用キープ / 過去に譲った）＋切替時の説明文
✅ コレクション表示の wish 基準フィルタ（全wish 14 / スアのwish 4 / ヒナのwish 5）
✅ 「スアのwish 4/4 コンプ達成！」演出＋達成記念バッジ＋Xに投稿CTA
✅ 求めるもの ↔ ウィッシュタブの同期説明
✅ 重複検出警告「似たトレカが2件あります」

### 残った確認希望（次回スクショ）
- B-2 メタ入力 STEP3 の「譲る／自分用キープ」トグル
- コレクション表示で未取得 wish のシルエット表示
- 達成前のコレクション表示
- プロフハブの「コレクションサマリ」縮小版
- 達成記念をXに投稿 CTA の表示条件（常時？達成時のみ？）

---

## 進行中タスクと次のステップ

| # | タスク | 状態 |
|---|--------|------|
| A | 在庫＋コレクション統合 | ✅ 反映済 |
| B | AW仕様修正（位置主導でイベントなし可） | 反映状況要確認 |
| C | ターン3 認証＋オンボーディング | 投げ準備済 |
| D | (b) ホーム見直し＋プロフハブ＋ウィッシュタブ | ターン1の本来作業（再開） |
| E | ターン4 MVP仕様書 v2 ＋ハンドオフ | 最後 |

### 推奨順序
1. AW修正の反映確認
2. ターン3（認証＋オンボーディング）投げ
3. (b) ホーム見直し＋プロフハブ＋ウィッシュタブ
4. ターン4 PRD更新でMVP完成

---

## イテレーション19.7〜19.9：コレクション機能の最終整理

### 19.7 コレクションを在庫→ウィッシュへ移動
在庫タブに「リスト/コレクション切替」を入れていたが、コンセプト的に矛盾。
コレクションは wish 基準の達成感ビュー → ウィッシュタブへ移動

### 19.8 ウィッシュタブからもコレクション削除
ウィッシュ＝欲しいもの一覧、シンプルさ優先。コレクション機能は不要と判断。
- `WishlistCollection` / `WishCollectionTile` を hub-screens.jsx から削除
- `WishlistList` の view toggle 削除
- iHub Hub Screens.html から「コレクション表示」アートボード削除
- ウィッシュタブはリスト・空状態・編集 の 3画面のみ

### 19.9 自分用キープへの影絵追加案 → 不採用（A: 現状維持）
ヲタの達成感ビューを自分用キープにリッチ化する案を検討したが、ウィッシュリストとの機能重複を避けて却下。

### 達成感の演出は C-3 取引完了画面のみに残る
日常的に達成度を眺める専用画面はなし。取引で wish が埋まった瞬間にだけ演出。

### 最終的なタブ構造（確定）

| タブ／ビュー | 役割 |
|------------|------|
| ホーム | マッチ提案 |
| 在庫・譲る候補 | 譲渡可能な手持ち |
| 在庫・自分用キープ | 譲らない手持ち（シンプル一覧） |
| 在庫・過去に譲った | 履歴 |
| 取引 | 進捗・履歴 |
| ウィッシュ | 欲しいもの一覧 |
| プロフ | アイデンティティ・設定 |

---

## イテレーション48：メール構造を2つに簡素化 + ハンドル概念整理 + Supabase/Vercel 既設

### 背景

iter47 の確認後、ユーザーから3点の補足：
1. `privacy@ihub.tokyo` は実在しない（不要）
2. 「ハンドル名」の意味を確認 → 公式 X アカウント名のことと判明
3. Supabase / Vercel は既に作成済み（アカウント作成不要）

### 修正

#### メール構造を 3 → 2 に簡素化

| メール | 用途 |
|---|---|
| `support@ihub.tokyo` | メイン（新規登録・問い合わせ・サポート・**個人情報保護関係も**） |
| `info@ihub.tokyo` | お知らせ・通知系 |

`privacy@` は廃止、`support@` に統合。

#### 「ハンドル」用語の整理

2種類の意味を明確化：

| 種類 | 意味 | 例 | 必要性 |
|---|---|---|---|
| **A. iHubユーザーのハンドル** | アプリ内ユーザー識別子（システムフィールド） | `@hana_lumi`、`@lumi_sua` | **必須** |
| **B. iHub公式 X アカウント** | 運営の広報用 X アカウント | `@ihub_jp` 等 | **当面なし、Phase β以降検討** |

iter45-47 で「対外ハンドル `@ihub_jp` 暫定」と書いていたが、これは B（公式X）を指していた。
ユーザー判断：**当面 X アカウントは作らない**。Phase β（マネタイズ開始時期）以降に広報強化が必要になったら検討。

#### Supabase / Vercel：既設利用

ユーザーが既に Supabase / Vercel アカウントを作成済み。Phase 0a で**新規プロジェクトのみ作成**する：
- Supabase 新規プロジェクト作成（既アカウント内に iHub 専用）
- Vercel 新規プロジェクト作成（既アカウント内に iHub 専用）

### 変更ファイル

- `iHub/legal-pages.jsx`：`privacy@ihub.tokyo` → `support@ihub.tokyo`
- `notes/15_non_functional.md`：3メール → 2メール
- `notes/16_monetization.md`：
  - 3メール → 2メール
  - 「対外ハンドル」 → 「公式X アカウント未作成」
  - 未確定項目の「対外ハンドル」を Phase β 検討項目に
- `notes/17_legal_alignment.md`：
  - メールアドレスを 2構造に
  - 「プライバシーポリシーの個人情報保護管理者連絡先も support@ に統一」TODO追加

### Phase 0a 着手プラン（更新）

```
旧プラン:
  Step 1: Supabase アカウント作成 ← 不要（既設）
  Step 2: Vercel アカウント作成 ← 不要（既設）

新プラン:
  Step 1: GitHub 上に実装リポ作成（推奨：「ihub」小文字）
  Step 2: Next.js プロジェクト初期化（npx create-next-app@latest）
  Step 3: 既存 Supabase アカウントに iHub 専用プロジェクト作成
  Step 4: 既存 Vercel アカウントに iHub_app プロジェクト作成 → デプロイ
  Step 5: お名前.com で DNS 設定 → ihub.tokyo を Vercel に向ける
```

所要時間：1〜2 セッション（合計 2〜4 時間）

### 確認したい残事項

1. 実装リポジトリ名：**`ihub`**（小文字、ドメインと統一）でOK？
2. Supabase 新規プロジェクト名：**`ihub-mvp`** or 別案？
3. Vercel 新規プロジェクト名：**`ihub`** or 別案？

これらが決まったら **Phase 0a 即着手** 可能。

---

## イテレーション47：ドメイン・メール構造確定 + 弁護士OK 判明

### 背景

ユーザー報告：
1. **ドメイン取得完了**：`ihub.tokyo`（お名前.com）
2. **弁護士レビュー結果：「このまま OK」**（規約原典 docx を改訂不要）
3. **メール構造**：support@（メイン）、info@（通知）、privacy@（個人情報）の3つで運用
4. **legal-pages.jsx の方針**：「モックアップなので、実装でちゃんと反映してくれるように」

### 重要な判明事項

#### 弁護士判断「このまま OK」の意味

iter46 で「規約改訂が必要」と判断したが、弁護士は：
- 規約原典 docx を **そのまま運用 OK** と判断
- iHub MVP は規約の **SUBSET として実装**（MyLog・郵送 は実装しないが、契約上は許可されている）
- これは法的に正常（契約 SUPERSET、実装 SUBSET）

つまり：
- ✅ docx 改訂不要（弁護士費 $500 は使わずに済んだ）
- ✅ 将来 MyLog や 郵送 を追加する際も追加レビュー不要
- ⚠️ `legal-pages.jsx` は実装時に docx を完全反映する必要あり

iter46 で書いた「弁護士再依頼」プランは **不要**になった。

#### legal-pages.jsx の位置づけ確定

`legal-pages.jsx` は **画面UI のモックアップ**であり、実装時には docx を完全反映する：
- 利用規約：572 行 → そのまま反映
- プライバシーポリシー：218 行 → そのまま反映
- 特商法：70 行 → そのまま反映 + 価格 ¥500 等を確定値で埋める

これは `notes/17_legal_alignment.md` に「実装フェーズの TODO」として明記。

### 確定事項

#### ドメイン・URL

| 項目 | 値 |
|---|---|
| ドメイン | **`ihub.tokyo`** |
| API 本番 | `https://api.ihub.tokyo/v1` |
| API staging | `https://api-staging.ihub.tokyo/v1`（暫定） |
| GitHub Pages | `https://mashimabizz.github.io/iHub_design`（プレビュー用） |

#### メール構造

| メール | 用途 |
|---|---|
| **`support@ihub.tokyo`** | メイン連絡先（新規登録・問い合わせ・サポート） |
| **`info@ihub.tokyo`** | お知らせ・通知系（一斉送信） |
| **`privacy@ihub.tokyo`** | 個人情報保護関係 |

### 変更内容

- `iHub/legal-pages.jsx`：
  - `hello@ihub.example.com` → `support@ihub.tokyo`
  - `privacy@ihub.example.com` → `privacy@ihub.tokyo`
  - `株式会社iHub` → `iHub 運営者`（4箇所、規約原典の表現に合わせる）

- `notes/15_non_functional.md`：3 メールアドレス構造を反映

- `notes/13_api_spec.md`：ベースURL に `ihub.tokyo` 反映

- `notes/16_monetization.md`：3 メールアドレス構造を反映

- `notes/17_legal_alignment.md`：
  - 「弁護士 OK = docx 改訂不要」方針に大幅書き換え
  - 「実装フェーズの TODO」セクション追加（legal-pages.jsx を docx で完全置き換え）

### Phase 進捗

設計フェーズの最終整備が完了：
- ドメイン取得 ✅
- 弁護士レビュー ✅（このまま OK）
- メール構造確定 ✅
- legal-pages.jsx 実装方針確定 ✅

### 次のステップ

**実装フェーズ着手の準備完了。**

残タスク：
1. ハンドル名確認（`@ihub_jp` か `@ihub_tokyo` か）
2. お名前.com でメール転送設定（support@・info@・privacy@ を Gmail に）
3. **Phase 0a 着手**：
   - Supabase アカウント作成（ユーザー）
   - Supabase プロジェクト作成（一緒に）
   - Vercel 連携（一緒に）
   - Next.js プロジェクト初期化
   - 「Hello iHub」が表示されるところまで

### 関連ファイル

- `iHub/legal-pages.jsx`
- `notes/13_api_spec.md`
- `notes/15_non_functional.md`
- `notes/16_monetization.md`
- `notes/17_legal_alignment.md`

---

## イテレーション46：規約原典との整合・用語統一・運営者情報修正

### 背景

弁護士納品の規約原典（2024-07-18）が `利用規約など/` ディレクトリに存在することを iter45 後に発見。
読み込んで現状の iHub 設計と照らし合わせ、齟齬を整理。

iter45 で「松尾満天」を実名表示に変更したが、規約原典では「代表者情報は非公表」が方針だったため、**原典通りに戻す**。

ユーザー判断：
- MyLog 機能 → **削除**
- 郵送機能 → **削除**
- ダイレクトメッセージ → **取引チャットで統一**
- 交換依頼 → **打診で統一**
- 交換募集 → **概念消滅（在庫登録に吸収）**

### 変更内容

#### 新規ファイル
- `notes/17_legal_alignment.md`：規約原典との整合性管理（弁護士再依頼用資料）
  - 規約原典のサマリ（利用規約全40条、プライバシー、特商法）
  - 齟齬一覧（削除4 / 追加5 / 用語統一3 / 価格確定2 / 代表者情報1）
  - 削除事項詳細（MyLog第3章全削除、郵送関連 §3/§13/§17）
  - 追加事項詳細（待ち合わせfix、服装写真、現在地、Dispute詳細、通報）
  - 用語統一マッピング
  - 価格確定（Premium ¥500/月、ブースト ¥150/¥600/¥1,000）
  - 弁護士再依頼の概算費用（$500-800）
  - 変更後の規約構成案（38条、章立て見直し）

#### 更新ファイル
- `notes/10_glossary.md`：
  - §J 廃止用語に MyLog・郵送・交換依頼・交換募集・ダイレクトメッセージ等を追加
  - §M 規約原典マッピングを新設（規約原典 → iHub設計 の用語対応表）
  - 規約改訂が必要な箇所を弁護士再依頼対象として明示

- `iHub/legal-pages.jsx`：
  - 代表者名・所在地・電話番号を「**非公表**」（規約原典通り）に戻す
  - フッターの「松尾 満天（iHub 運営）」を「iHub 運営」に
  - iter45 で入れた実名表示を取り消し

- `notes/15_non_functional.md`：
  - §11-2 特商法を規約原典方針（非公表）に合わせて修正

- `notes/16_monetization.md`：
  - §1 運営者情報を「非公表方針」に修正
  - 内部情報セクション新設（運営者氏名は規約に書かない、請求対応のみ）

- `CLAUDE.md`：
  - 必読docs リストに `11_screen_inventory.md` 〜 `17_legal_alignment.md` を追加
  - 必読項目 6. に「法的文書に関わる作業は 17_legal_alignment.md を確認」追加
  - 「重要な用語ルール（iter46 確定）」セクション新設
  - 「法的文書の方針」セクション新設

- `.gitignore`：`利用規約など/` を除外（個人情報・著作権配慮）

### 確認した他docsの状態
- `02_system_requirements.md`：「郵送はYahooフリマと棲み分け」のみ言及。修正不要（戦略的記述）
- `03_strategy.md`：同上
- `07_mvp_handoff.md`：同上、`exchange_method='郵送'` も「UI非表示・データ型維持」で整合

### 影響範囲
- 設計ドキュメント全体の用語統一
- `iHub/legal-pages.jsx` の表示が規約原典と整合
- 弁護士に渡せる改訂依頼資料が完成
- `利用規約など/` ディレクトリは git 管理外として保護

### Phase 2 完了状況

USER_PLAYBOOK の 7タスクは iter44 で完了済。iter45（マネタイズ）+ iter46（法的整合）で**実装着手前の最終整備が完了**。

### 確認方法
- `notes/17_legal_alignment.md`
- `iHub/legal-pages.jsx`（特商法ページの表示）
- `notes/10_glossary.md` §J + §M

### 関連ファイル

新規:
- `notes/17_legal_alignment.md`

更新:
- `notes/10_glossary.md`
- `iHub/legal-pages.jsx`
- `notes/15_non_functional.md`
- `notes/16_monetization.md`
- `CLAUDE.md`
- `.gitignore`

### 次フェーズへの示唆

法的整合の最終ステップ：
1. **ドメイン取得 → メールアドレス確定**（hello@ihub.* 等）
2. **`notes/17_legal_alignment.md` を弁護士に共有 → 規約改訂依頼**（$500-800、ユーザー予算内）
3. **改訂版docx 受領 → `利用規約など/` に保管**
4. **`iHub/legal-pages.jsx` を改訂版docx に合わせて再更新**
5. これで Phase 0a 着手可能

これで設計フェーズ完全完了 + 法的整合まで整理。

---

## イテレーション45：マネタイズ戦略確定 + 運営者情報反映

### 背景

実装フェーズ移行決定を受けて、マネタイズ戦略を正式文書化。

ユーザーの当初プラン：
- 常時表示バナー広告
- 打診時 全画面広告（インタースティシャル）
- ブースト機能（広告スキップ + 上位表示）
- Premium = 保存検索通知 + 月3ブースト配布

ユーザーの問題意識：
- 「Premium = コア機能解放」は筋が悪い（保存検索通知はコア機能であるべき）
- 「コア機能は常時無料」を維持したい

### 確定事項

#### 運営者情報
| 項目 | 値 |
|---|---|
| 運営者氏名 | 松尾 満天 |
| 法形態 | 個人事業主（届出済） |
| 屋号 | なし |
| サービス名 | iHub |
| 対外ハンドル（暫定） | @ihub_jp |

#### マネタイズ戦略

**広告**：
- 打診時の全画面広告は **削除**（取引フロー離脱リスク高）
- 代わりに **取引完了時** や **マッチ閲覧時** に native ad
- Tier 1: HOM-main / SCH-main / WSH-list に native ad（5件毎）
- Tier 2: PRO-other / TRD-past / AW-list にフッターバナー
- Tier 3: 取引フロー全画面（C-0〜C-3）と認証・設定・法的・ヘルプは**完全に広告ゼロ**

**ブースト機能**：
- 単発 ¥150 / 5個 ¥600 / 10個 ¥1,000
- 24時間有効、上位表示＋広告非表示
- 1日2個発動上限（依存性防止）

**Premium 会員**（月¥500 / 年¥4,800）：
- コア機能の差は**ゼロ**
- 広告完全非表示・月3ブースト無料配布・装飾（背景・絵文字・バッジ）
- 副次的：メッセージ履歴永続・既読確認

**アフィリエイト**（Phase γ〜）：Amazon・楽天・公式チケット販売
**公式コラボ**（Phase δ〜）：ライブ運営との提携、法人化検討

### 変更ファイル

#### 新規
- `notes/16_monetization.md`：マネタイズ戦略 v1.0 完全版

#### 更新（マネタイズ反映）
- `notes/05_data_model.md`：§9 マネタイズ追加（subscriptions / boosts / transactions / ad_overrides テーブル）
- `notes/13_api_spec.md`：§15-17 追加（subscriptions / boosts / ads エンドポイント）
- `notes/14_implementation_phases.md`：§10b 追加（Phase β-γマネタイズ実装、合計 2.5-3 人月追加）
- `notes/15_non_functional.md`：決済セキュリティ・特商法対応追加
- `notes/11_screen_inventory.md`：広告配置注釈追加（HOM-main / SCH-main / WSH-list）、§K 広告配置サマリ追加
- `notes/10_glossary.md`：§L マネタイズ用語追加（ブースト・Premium・Native ad 等）
- `iHub/legal-pages.jsx`：特商法ページに実名「松尾 満天」反映、有料機能の表記追加

### Phase 2 完了状況

USER_PLAYBOOK の 7タスク中：
- ✅ タスク1〜6（iter38-44）
- 🟡 タスク7（02 機能要件 更新）— 任意

**Phase 2 完了に加えて、マネタイズ戦略 v1.0 確立**。

### 確認方法

- `notes/16_monetization.md`
- 特商法ページ：http://localhost:8000/iHub%20Legal%20Pages.html

### 関連ファイル

新規：
- `notes/16_monetization.md`

更新：
- `notes/05_data_model.md`、`13_api_spec.md`、`14_implementation_phases.md`、`15_non_functional.md`
- `notes/11_screen_inventory.md`、`10_glossary.md`
- `iHub/legal-pages.jsx`

### 次フェーズ

ドキュメント整備完了。次は：
1. 法務監修（プライバシーポリシー・利用規約・年齢制限）
2. ドメイン取得＋メールアドレス決定
3. **Phase 0a 着手：Supabase + Next.js プロジェクト作成**

Phase β（半年後）でマネタイズ実装着手の予定。

---

## イテレーション44：非機能要件（USER_PLAYBOOK タスク6）

### 背景

USER_PLAYBOOK タスク6。
機能要件（02）が「何を作るか」だとすると、非機能要件は「**どのレベルで作るか**」。Phase 0 着手前に整備して、設計時点で品質特性を確定。

iHub は **「現地で会うアプリ」** という特性上、一般的な交換アプリより配慮すべきリスクが多い：
- 対面取引でのトラブル（詐欺・暴力・ストーキング）
- 位置情報の悪用
- 未成年利用の安全性
- 服装写真の悪用

これらに対する明確な方針が必要。

### 変更内容

#### `notes/15_non_functional.md`（新規作成、約 600行）

**12 カテゴリ・約 80 要件**：

1. **iHub 特有のリスクと前提**：5 リスクの整理、KPOP 限定 MVP、対象年齢⚠️、有人運営前提
2. **プライバシー・個人情報保護**：取り扱う情報の種類分類、位置情報の特殊扱い、未成年対応、プライバシーポリシー要件
3. **セキュリティ**：認証（bcrypt/argon2、JWT、OAuth）、認可、HTTPS、入力検証、Rate limit、監査ログ
4. **パフォーマンス**：応答時間 SLA（p95/p99）、DAU 想定、DB インデックス、画像最適化、CWV 目標値
5. **可用性・スケーラビリティ**：稼働率目標（99.5%→99.9%→99.95%）、ステートレス設計、DB sharding（Post-MVP）
6. **アクセシビリティ**：WCAG 2.1 AA 目標、コントラスト・タップターゲット・キーボード操作
7. **ローカリゼーション**：MVP 日本語のみ、Post-MVP で韓国語・中国語・英語、i18n 基盤導入推奨
8. **ログ・監視・分析**：構造化ログ JSON、個人情報マスキング、エラー監視（Sentry/Datadog 等）、KPI ダッシュボード
9. **災害復旧・バックアップ**：日次フル+1h増分、RPO 1h / RTO 4h、半年に1回の復旧訓練
10. **運用・SRE**：CI/CD、オンコール体制、インシデント Sev 判定、キャパシティプランニング
11. **コンプライアンス・法的**：個人情報保護法、特商法、利用規約、著作権、18歳未満への配慮
12. **未確定項目まとめ**：18件を 5カテゴリで整理

**iHub 特有の重要設計**：
- 位置情報の3層分類（広域 / 取引相手のみ / メッセージ内）
- 服装写真の扱い（取引終了 30日後削除 ⚠️、顔ブラー Post-MVP）
- 同担拒否文化への配慮（プロフでブロック容易化）
- 対面取引の安全性（通報・dispute・運営仲裁）

### 影響範囲

- 設計ドキュメント完成（00-15 が揃った）
- Phase 0 着手前の最後の整備が完了
- 法務監修・PoC で詰めるべき 18 項目を明示

### Phase 2 進捗

USER_PLAYBOOK タスク：
- 🥇 タスク1（05 最新化） ✅ iter38
- 🎯 5論点擦り合わせ ✅ iter39
- 🥈 タスク2（11 画面マトリクス） ✅ iter40
- 🥈 タスク3（12_screens/ per-screen spec） ✅ iter41
- 🥉 タスク4（13 API spec） ✅ iter42
- 🥉 タスク5（14 実装フェーズ分割） ✅ iter43
- 🟡 **タスク6（15 非機能要件） ✅ iter44 ← 今回**
- 🟡 タスク7（02 機能要件 更新） — 任意

### 🎉 Phase 2 全 6/7 完了！

Phase 2 の主要 5 + 任意 1 完了。残るはタスク7（02 更新）のみで、これは古いままでも実害なし。

設計ドキュメント完全構造：
```
00-04, 06-07  要件定義（既存・更新候補あり）
05            データモデル v2（最新）
09            状態遷移
10            用語集
11            画面インベントリ（89画面）
12_screens/   per-screen spec（主要5画面）
13            API仕様（70+ endpoints）
14            実装フェーズ分割
15            非機能要件 ← 今回
```

### 確認方法

- `notes/15_non_functional.md`
- GitHub: https://github.com/mashimabizz/iHub_design/blob/main/notes/15_non_functional.md

### 関連ファイル

- `notes/15_non_functional.md`（新規）

### 次フェーズへの示唆

**実装フェーズへの完全準備完了**：
- 機能要件（02）+ 非機能要件（15）= 完全な仕様
- 状態遷移（09）+ データモデル（05）= 実装の正解
- API spec（13）+ 画面 spec（12）= フロント・バック契約
- 実装フェーズ分割（14）= ロードマップ
- 用語集（10）+ 画面インベントリ（11）= 一貫性の基盤

特に注力すべき法務確認事項：
1. 位置情報の保管期間（30日/90日/1年）
2. 服装写真の自動削除タイミング
3. 年齢制限（13/16/18歳）
4. 個人情報保護法対応の細部
5. 越境データ移転の同意取得方式

これらを法務確認後、Phase 0 着手可能。

---

## イテレーション43：実装フェーズ分割（USER_PLAYBOOK タスク5）

### 背景

USER_PLAYBOOK タスク5。**Phase 2 の最後の主要タスク**。
これまでの全 docs（00-13）を統合して、MVP 実装ロードマップを作る。エンジニア募集・着手の最終資料。

### 変更内容

#### `notes/14_implementation_phases.md`（新規作成、約 600行）

**Phase 0〜6 の構成**：

| Phase | 内容 | 概算工数 | 含む画面数 | 含むAPI数 |
|---|---|---|---|---|
| Phase 0 | 基盤・認証・オンボ | 1.5〜2人月 | 15 | 20 |
| Phase 1 | 在庫・AW・ウィッシュ | 1.5〜2人月 | 12 | 25 |
| Phase 2 | マッチング・C-0 | 1〜1.5人月 | 11 | 11 |
| Phase 3 | 打診・ネゴ・合意 | 1.5〜2人月 | 11 | 11 |
| Phase 4 | 取引・C-3 | 1.5〜2人月 | 11 | 11 |
| Phase 5 | Dispute・通報 | 1.5〜2人月 | 17 | 9 |
| Phase 6 | サポート・法的 | 0.5〜1人月 | 13 | （Phase 0と重複多） |
| **合計** | **MVP リリース** | **9〜12.5人月** | **89画面** | **70+ API** |

各 Phase に：
- ゴール（1文）
- 含む機能（要件 ID と紐付け）
- 含む画面（11_screen_inventory.md と紐付け）
- 含む API（13_api_spec.md と紐付け）
- 完了基準（DoD、チェックリスト）
- 概算工数（バックエンド・フロントエンド・インフラ別）
- 主な未確定項目（13_api_spec.md の項番号で参照）
- 並行開発の余地

**追加セクション**：

1. **前提・全体像**：
   - 想定チーム構成（最小3〜5人、3〜4ヶ月想定）
   - 技術スタック候補（⚠️ 要確認、Node/Go/Rails、PostgreSQL、PWA/RN/Flutter 等）
   - Phase 依存関係 mermaid 図

2. **横断的関心事**：
   - ロギング・モニタリング（Sentry、Datadog）
   - プッシュ通知（FCM、トピック別）
   - 国際化（MVP は日本語のみ）
   - パフォーマンス（マッチング計算スケーラビリティ）
   - セキュリティ（HTTPS、JWT、CSRF、XSS）
   - アクセシビリティ（WCAG AA）
   - テスト戦略（unit / integration / E2E / 負荷）

3. **Beta テスト戦略**：
   - 内部テスト（α、Phase 4 後）
   - クローズドβ（Phase 5 後、20-50人）
   - オープンβ（Phase 6 後、KPOP 限定）
   - 本リリース

4. **Post-MVP ロードマップ**：13項目を優先度3段階で整理（ジャンル拡大・GPS到着・WebSocket・国際化・郵送 等）

5. **リスク・前提**：
   - 技術リスク（4件）
   - ビジネスリスク（4件）
   - 法的・運用リスク（4件）
   - プロジェクト前提

### 影響範囲

- 設計ドキュメント完成（00-14 が揃った）
- 実装着手の準備が **完了** レベルに到達
- エンジニア募集の資料として活用可能

### Phase 2 進捗

USER_PLAYBOOK タスク：
- 🥇 タスク1（05 最新化） ✅ iter38
- 🎯 5論点擦り合わせ ✅ iter39
- 🥈 タスク2（11 画面マトリクス） ✅ iter40
- 🥈 タスク3（12_screens/ per-screen spec） ✅ iter41
- 🥉 タスク4（13 API spec） ✅ iter42
- 🥉 **タスク5（14 実装フェーズ分割） ✅ iter43 ← 今回**
- 🟡 タスク6（15 非機能要件） — Post-MVP判断
- 🟡 タスク7（02 機能要件 更新） — 任意

### 🎉 Phase 2 主要タスク完了！

Phase 2 の主要 5/5 完了。**実装フェーズへ移行できる状態**。

設計ドキュメント階層：
```
要件定義層     00-04, 06-07
基本設計層     05 + 09 + 10
詳細設計層     11 + 12_screens/ + 13
実装計画層     14
ガバナンス層   CLAUDE.md / README.md / USER_PLAYBOOK.md / 08
```

別環境の Claude / 別エンジニアでも、これだけあれば iHub を完全に再現・実装できる状態。

### 確認方法

- `notes/14_implementation_phases.md`
- GitHub: https://github.com/mashimabizz/iHub_design/blob/main/notes/14_implementation_phases.md

### 関連ファイル

- `notes/14_implementation_phases.md`（新規）

### 次フェーズへの示唆

**Phase 3：実装フェーズ着手**
- 技術スタック確定
- インフラ選定
- エンジニア募集（必要に応じて）
- Phase 0 から段階的に実装

**任意で残せるタスク**：
- タスク6（15 非機能要件）— Phase 0 着手前に整備推奨
- タスク7（02 機能要件 更新） — 古いままでも実害なし
- 残画面の per-screen spec（ホーム・AW・在庫等）— 実装と並行で OK

---

## イテレーション42：API仕様 v1 draft（USER_PLAYBOOK タスク4）

### 背景

USER_PLAYBOOK タスク4。
12_screens/ の per-screen spec で各画面の「関連 API（仮）」を明記したので、それらを集約して REST API 形式に落とす。
- 実装着手前の最後の壁
- 33件の未確定項目の半分くらいはここで解決の道筋がつく
- バックエンド・フロントエンド双方の正解集

### 変更内容

#### `notes/13_api_spec.md`（新規作成、約 800行）

**14 リソースグループ・約 70 エンドポイント**：

1. **Auth（認証）**：register / verify-email / login / OAuth / forgot-password / reset-password / logout / refresh — 9件
2. **Accounts（自分のアカウント）**：me / oshi / onboarding / delete-request / blocks — 9件
3. **Users（他ユーザー）**：参照系のみ — 4件
4. **Masters（マスタデータ）**：genres / groups / characters / goods-types / events — 6件
5. **AWs（活動予定）**：CRUD + pause/resume + intersect — 8件
6. **Items（在庫）**：CRUD + bulk + image upload + carrying toggle — 9件
7. **Wishes（ウィッシュ）**：CRUD + matches — 6件
8. **Matches（マッチング）**：4タブ + feed + saved searches — 6件
9. **Proposals（打診・ネゴ）**：CRUD + send/agree/reject/counter/revise/extend/share-inventory + revisions — 11件（最大ボリューム）
10. **Messages（メッセージ）**：取得・送信・画像アップロード — 3件
11. **Deals（取引）**：CRUD + arrivals + outfit-photos + evidence + approve + dispute + rate + cancel — 10件
12. **Disputes（異議申し立て）**：CRUD + reply + withdraw + admin-question + resolve + reappeal — 7件
13. **Reports（通報）**：通報作成・自分の通報一覧 — 2件
14. **Misc**：通知デバイス・通知設定・WebSocket — 5件

**共通仕様セクション**：
- 認証スキーム（JWT Bearer 推奨、⚠️ 要確認）
- ベースURL `/v1`（API バージョニング）
- リクエスト/レスポンス形式（JSON、ISO 8601、UUID v4）
- ステータスコード一覧
- エラーコード（VALIDATION_ERROR / STATE_CONFLICT 等）
- ページネーション（カーソル方式 + オフセット方式）
- Rate limiting（⚠️ 要確認の数値）
- ファイルアップロード（直接 vs 署名付きURL、MVP は直接）

**各エンドポイントの記述形式**：
```
### POST /api/v1/...
- **Auth**: 必須/不要
- **Request**: { ... }
- **Response 201**: { ... }
- **Errors**: 4xx 一覧
- **Side effects**: メール送信・DB変更・通知等
- **State**: 状態遷移 (09 と一致)
- **Screen**: 関連画面 (11/12 と一致)
- **備考**: ⚠️ 要確認 含む
```

**未確定項目セクション**：30件を5カテゴリで整理：
- 認証・基盤（5件）
- Proposal・ネゴ（6件）
- Deal・dispute（8件）
- マスタ・周辺（6件）
- 画像・ストレージ（3件）
- 通報・運営（2件）

### 影響範囲

- 実装着手の準備が完了レベルに到達
- バックエンドとフロントエンドの実装契約として機能
- 12_screens の各画面と完全クロスリファレンス

### Phase 2 進捗

USER_PLAYBOOK タスク：
- 🥇 タスク1（05 最新化） ✅ iter38
- 🎯 5論点擦り合わせ ✅ iter39
- 🥈 タスク2（11 画面マトリクス） ✅ iter40
- 🥈 タスク3（12_screens/ per-screen spec） ✅ iter41
- 🥉 **タスク4（13 API spec） ✅ iter42 ← 今回**
- 🥉 タスク5（14 実装フェーズ分割） → 次（残り最後の主要タスク）
- 🟡 タスク6（15 非機能要件）
- 🟡 タスク7（02 機能要件 更新）

Phase 2 の主要4タスク完了。**実装フェーズへ移行する準備の 90% が整った状態**。

### 確認方法

- `notes/13_api_spec.md`
- GitHub: https://github.com/mashimabizz/iHub_design/blob/main/notes/13_api_spec.md

### 関連ファイル

- `notes/13_api_spec.md`（新規）

### 次フェーズへの示唆

タスク5（実装フェーズ分割）：
- 13_api_spec の各エンドポイントを Phase 0〜6 に振り分け
- 11_screen_inventory の各画面を Phase に紐付け
- 依存関係を明確化（Auth が一番先、disputes が一番後 等）
- 各 Phase の完了基準・概算工数

これで iHub の実装ロードマップが完成し、エンジニア募集・着手の準備が整う。

---

## イテレーション41：per-screen spec（USER_PLAYBOOK タスク3）— 主要5画面

### 背景

USER_PLAYBOOK タスク3。
画面インベントリ（11）で全89画面を一覧化したので、次は **重要画面の詳細仕様**を per-screen で書く。
- 「この画面はどう作る？」「state/props/振る舞い/エラーは？」が一発で引ける一次資料
- JSX コードに暗黙的になっていた仕様を文章化
- 未確定項目は「⚠️ 要確認」マークで保留

### 変更内容

#### `notes/12_screens/` ディレクトリ新規作成

##### `notes/12_screens/README.md`
- ディレクトリの位置付け・命名規約・章立てテンプレ
- 各 spec 共通の章立て：画面の目的／入力データ／表示要素／アクション／バリデーション・エラー／エッジケース／関連API（仮）／関連docs／未確定項目

##### `notes/12_screens/C-0_propose_select.md`
- 6 variant（mine/theirs perfect、forward、backward、meetup-scheduled/now）を1ファイルでカバー
- 3タブ構造（mine / theirs / meetup）の詳細
- meetup タブの2モード（即時・日時指定）
- ステッパー UI（iter29 の数量管理）
- canProceed の判定ロジック
- 関連API：proposals 作成・送信、AW交差判定 等
- 未確定項目：5件（draft 保存タイミング、既存ネゴある相手への新規打診の振る舞い 等）

##### `notes/12_screens/C-1_receive.md`
- 受信側の画面（`C1ReceiveScreen`）
- Sender card / 提案内容カード / メッセージ / 自動添付情報 / 3択CTA
- 承諾モーダル流用 vs 専用化の議論（⚠️）
- 期限切れ・撤回・重複表示・dispute中 のエッジケース
- 未確定項目：5件

##### `notes/12_screens/C-1.5_nego_chat.md`
- 5シナリオ + 3モーダル/画面（合意確認・取引成立・相手の譲）を1ファイル
- 「現在の提案」pin card の構造
- リマインダーバナー（normal/r3/r6/expired/mine-agreed）
- システムメッセージの種別と event_type 値リスト（⚠️）
- API：messages 取得・送信、提案修正、合意送信、期限延長 等
- 未確定項目：7件（提案修正で last_action_at リセット、双方同時合意のレースコンディション 等）

##### `notes/12_screens/C-2_trade_chat.md`
- iter34 の最新仕様（場所・時間調整UI削除、当日ライブ運用集約）
- Pin card / 服装写真CTA / 4種メッセージタイプ / クイックアクション3種 / 到着ステータス
- 服装写真アップロードのバリデーション（顔ブラー等は要確認 ⚠️）
- 現在地共有の OS 権限ハンドリング
- 30分遅刻時のキャンセル権 UI（⚠️）
- 未確定項目：8件

##### `notes/12_screens/C-3_complete.md`
- 3ステップ：CaptureStep / ApproveStep / RateStep
- iter4 の「左=相手 / 右=自分」固定設計
- 撮影 → 評価まで連続した状態遷移
- 細分化評価（時間厳守・実物状態・メッセージ対応）の MVP 採用可否（⚠️）
- 内容相違時の D-flow への遷移
- 未確定項目：8件

### 影響範囲

- 設計ドキュメント全体（00-11 の構造化が更にレベルアップ）
- 実装着手の準備（API spec / 実装フェーズ分割の前提が整う）

### Phase 2 進捗

USER_PLAYBOOK タスク：
- 🥇 タスク1（05 最新化） ✅ iter38
- 🎯 5論点擦り合わせ ✅ iter39
- 🥈 タスク2（11 画面マトリクス） ✅ iter40
- 🥈 **タスク3（12_screens/ per-screen spec） ✅ iter41 ← 今回（主要5画面）**
- 🥉 タスク4（13 API spec） → 次
- 🥉 タスク5（14 実装フェーズ分割）

### 確認方法

- `notes/12_screens/README.md` から各 spec へリンク
- GitHub: https://github.com/mashimabizz/iHub_design/tree/main/notes/12_screens

### 関連ファイル

- `notes/12_screens/README.md`（新規）
- `notes/12_screens/C-0_propose_select.md`（新規）
- `notes/12_screens/C-1_receive.md`（新規）
- `notes/12_screens/C-1.5_nego_chat.md`（新規）
- `notes/12_screens/C-2_trade_chat.md`（新規）
- `notes/12_screens/C-3_complete.md`（新規）

### 次フェーズへの示唆

タスク4（API spec）は、これら spec の「関連 API（仮）」セクションを集約してREST設計に落とす作業。
未確定項目の多くは API spec 側で確定する：
- proposal 作成タイミング（C-0）
- 承諾確認モーダルの仕様（C-1）
- system message event_type 値リスト（C-1.5）
- 服装写真・現在地アップロードの API 形状（C-2）
- 評価の細分化採用可否（C-3）

**残りの主要画面** spec は次フェーズで追加（ホーム、AW、在庫、ウィッシュ、認証/オンボ、D-flow、検索）。
ただし API spec 完成のためには現状5画面で十分。

---

## イテレーション40：画面インベントリ作成（USER_PLAYBOOK タスク2）

### 背景

USER_PLAYBOOK タスク2。
データモデル（05）と状態遷移（09）の整備が一段落したので、次は「**画面のマップ**」を作る。
- 「どの画面はどの JSX ファイル？」「いつの iter で更新された？」「関連 docs はどれ？」を一発で引けるように
- mermaid フロー図でユーザー動線を可視化
- 廃止画面も削除せず履歴として保持

### 変更内容

#### `notes/11_screen_inventory.md`（新規作成）

iHub/*.html の `<DCArtboard>` を全スキャン、iHub/*.jsx の `function` 定義をクロスリファレンス。

**収録**：
- 最新画面 **89件**（5カテゴリ：認証/オンボ・主要フロー・ハブ・サポート設定・図鑑）
- 廃止画面 **12件**（J. セクションに保持）

**画面ID命名規約**：
- 3-4文字 prefix ＋ kebab-case 名（`AUTH-welcome`, `C0-mine-perfect`, `D-5a` 等）
- 実装でも同じ識別子を使うため、命名で揺れない

**マトリクスの列**：画面ID / 名称 / 関連JSX関数 / 関連iter / 関連docs

**収録した mermaid フロー図 4種**：
1. **F. メイン動線フロー図** — ユーザー全体ジャーニー（auth → onb → home → 各タブ → C-flow → C-3 → 図鑑）
2. **G. 取引フロー詳細図** — C-0 → C-1 → C-1.5 → 合意 → C-2 → C-3 の細かい状態遷移付き
3. **H. Dispute フロー詳細図** — D-flow（D-1〜D-6d、再審査含む）
4. **I. 認証・オンボフロー図** — Welcome → Sign-up/Login → Email認証 → オンボ5段階 → Home

### 影響範囲

- 設計ドキュメント全体（5種類が揃った：00-04 戦略・要件 / 05 データ / 09 状態 / 10 用語 / **11 画面**）
- 実装着手の準備（per-screen spec 作成のための土台）

### Phase 2 進捗

USER_PLAYBOOK タスク：
- 🥇 タスク1（05 最新化） ✅ iter38
- 🎯 5論点擦り合わせ ✅ iter39
- 🥈 **タスク2（11 画面マトリクス） ✅ iter40 ← 今回**
- 🥈 タスク3（12_screens/ per-screen spec）→ 次
- 🥉 タスク4（13 API spec）
- 🥉 タスク5（14 実装フェーズ分割）

### 確認方法

- `notes/11_screen_inventory.md`
- mermaid 図は GitHub 上で自動レンダリング：https://github.com/mashimabizz/iHub_design/blob/main/notes/11_screen_inventory.md

### 関連ファイル

- `notes/11_screen_inventory.md`（新規）

### 次フェーズへの示唆

`12_screens/` 着手時：
- まず重要画面（C-0 / C-1 / C-1.5 / C-2 / C-3）から per-screen spec を作る
- 各画面ファイル名は `notes/12_screens/[画面ID].md`（例：`C0-mine-perfect.md`）
- 各 spec は state / props / 入出力 / バリデーション / エラー / 関連API / 関連docs を網羅
- 89画面全部書くのは重いので、**重要15-20画面に絞ってから**残りは実装着手と並行で

---

## イテレーション39：データモデル擦り合わせ・5論点確定

### 背景

iter38 で `05_data_model.md` を v2 化し、未確定項目30件を整理した。
そのうち**実装着手前に最重要の5項目**を擦り合わせる必要があり、ユーザーと対話で決定。

### 確定内容

| # | 論点 | 確定 |
|---|---|---|
| 1 | Item の `kind=keep` は `in_negotiation` になりうるか | **🅰️ 完全分離**：ならない。譲りたくなったら `kind` を `for_trade` に変更してから |
| 2 | `meetup_scheduled_custom` を JSONB か別テーブルか | **🅰️ JSONB**（MVP段階）。将来検索性が必要なら別テーブル `proposal_meetups` に切り出し可 |
| 3 | `outfit_photo` を messages 内 vs 専用テーブル | **🅲️ 両方**：`deal_outfit_photos` で最新版管理＋`messages.message_type='system'` で「共有しました」を流す |
| 4 | 到着検知の仕組み | **🅰️ 手動のみ（MVP）**：「会場到着」ボタン。QR連動・GPS自動は Post-MVP |
| 5 | `disputes.resolution.decision` 値リスト | **推奨全部**：5値（sender_fault/receiver_fault/mutual_fault/no_fault/cant_determine）+ penalty 4段階（none/warning/temp_suspend/permanent_suspend）+ reason/next_steps |

### 変更ファイル

#### `notes/05_data_model.md`
- 5論点それぞれの該当セクションに `🔒 確定（iter39）` ブロック追加
- `user_haves` セクション：kind と status の組合せ制約を明示（`keep` × `in_negotiation` 禁止）
- `proposals.meetup_scheduled_custom`：JSONB 確定の注釈
- `deal_outfit_photos`：2層構成の運用説明（専用テーブル＋system message）
- `deal_arrivals`：MVPは `manual` のみ、Post-MVP で QR/GPS 検討
- `disputes.resolution`：JSONB 構造を完全定義（5+4 値表＋テンプレ）
- 末尾「⚠️ 未確定項目」表：5件を「✅ iter39 で確定済」に分離

#### `notes/09_state_machines.md`
- 末尾「未確定・要確認項目」表：該当する5件を「✅ iter39 で確定済」セクションへ移動

#### `notes/10_glossary.md`
- セクション H（ステータス・状態）に enum 値の正式リスト追加：
  - **Dispute resolution**：decision 5値、penalty 4値（iter39 確定）
  - **Message types**：text / image / outfit_photo / location_share / system
  - **Item kind**：for_trade / keep（制約付き）
  - **Match types**：perfect / forward / backward
  - **Meetup type**：now / scheduled

### 影響範囲

- データモデル全体（5箇所の確定 → 実装ブレ防止）
- 用語集（enum 値が辞書化され、実装で勝手に値追加するのを防止）

### 確認方法

- `notes/05_data_model.md` の 🔒 ブロックを検索
- `notes/10_glossary.md` セクション H の追加部分を確認

### 関連ファイル

- `notes/05_data_model.md`
- `notes/09_state_machines.md`
- `notes/10_glossary.md`

### 残未確定項目

25件。次フェーズ（USER_PLAYBOOK タスク2-7）で詳細化される過程で順次解決される予定。
特にPhase 2 タスク3（per-screen spec）でいくつか自然に決まる：
- `proposal_revisions` の履歴粒度（実装してみると粒度が見える）
- system message の `event_type` 値リスト（メッセージ画面の実装で確定）
- `cancelled_reason` の値リスト（C-2 キャンセルUI設計で確定）

---

## イテレーション38：データモデル v2 — iter24/29/33/34 反映

### 背景・問題意識

`notes/05_data_model.md` は v1（2026-04-27時点）のままで、**iter24（推し2階層）/ iter29（数量管理）/ iter33（meetup）/ iter34（服装写真・現在地）の更新が一切反映されていなかった**。

USER_PLAYBOOK のタスク1。実装着手の最終整備として、最新仕様をDBスキーマレベルに落とし込む。

### 変更内容

#### `notes/05_data_model.md` — 全面書き直し（v2.0）

旧版（232行）→ 新版（複数セクション、テーブル定義15+、未確定項目30件）

主な変更：

1. **状態名を 09_state_machines.md と完全整合**
   - 旧 `proposals.status: 'sent' / 'accepted' / 'rejected' / 'cancelled'`
   - 新 `proposals.status: 'draft' / 'sent' / 'negotiating' / 'agreement_one_side' / 'agreed' / 'rejected' / 'expired'`
   - 旧 `user_haves.status: 'active' / 'reserved' / 'traded'`
   - 新 `user_haves.status: 'available' / 'in_negotiation' / 'in_deal' / 'traded'` ＋ `kind: 'for_trade' / 'keep'` 分離（iter19.5）

2. **テーブル名を 10_glossary.md と整合**
   - 旧 `exchanges` → 新 `deals`（用語集が `deal` 推奨）

3. **iter28（match_type）対応**
   - `proposals.match_type: 'perfect' / 'forward' / 'backward'`

4. **iter29（数量管理）反映**
   - `proposals.sender_have_qtys: int[]` / `receiver_have_qtys: int[]` を追加
   - 1行=1個 の方針を本文で明示、UI集約と数量選択の関係を整理

5. **iter30（7日期限）反映**
   - `proposals.last_action_at` / `expires_at` / `extension_count` カラム追加
   - `proposal_revisions` テーブル新規（提案修正履歴）

6. **iter32（合意フロー）反映**
   - `proposals.agreed_by_sender` / `agreed_by_receiver` カラム追加（agreement_one_side 判定用）

7. **iter33（meetup）反映 — 最大の変更**
   - `proposals.meetup_type`（`now` / `scheduled`）必須化
   - `proposals.meetup_now_minutes`（5/10/15/30）
   - `proposals.meetup_scheduled_aw_id` → `availability_windows`
   - `proposals.meetup_scheduled_custom` JSONB（カスタム日時の date/time/lat/lng/place_name/register_as_aw）
   - `availability_windows.created_via`（`manual` / `auto_from_proposal`）
   - `availability_windows.created_from_proposal_id`（auto AW のトレース）

8. **iter34（C-2 ライブ運用）反映**
   - `messages.message_type` 拡張（`text` / `image` / `outfit_photo` / `location_share` / `system`）
   - `messages.metadata` JSONB（位置情報・systemイベント等）
   - `deals.status` 細分化（`agreed` / `on_the_way` / `arrived_one` / `arrived_both` / `evidence_captured` / `approved` / `rated` / `disputed` / `cancelled`）
   - `deal_arrivals` テーブル新規（到着ステータス追跡）
   - `deal_outfit_photos` テーブル新規（服装写真、専用化案）

9. **iter24（推し2階層）反映**
   - `user_oshi` テーブル新規（DD/箱推し対応）
   - `groups_master.kind`（'group' / 'work' / 'solo'、ソロアーティスト対応）

10. **D-flow（iter12-18）対応**
    - `disputes` テーブル新規（旧版未定義だった）
    - `dispute_replies` テーブル新規
    - `reports` テーブル新規（通報用）

11. **users 拡張**
    - `account_status`（09 Account Lifecycle と一致）
    - OAuth対応カラム（oauth_provider/subject）
    - `deletion_requested_at`（30日猶予の起点）

12. **付録：状態名の対応表**
    - 09 のすべての状態名と、05 のどのカラム値に対応するかをテーブルで明示
    - 命名変更時の同期忘れ防止

#### `notes/09_state_machines.md` — 未確定項目を拡張

5項目 → 18項目に拡張。3カテゴリに分類：
- 状態遷移ルール関連（11項目）
- 検知・トリガー関連（3項目）
- データ構造関連（4項目）

これらは `05_data_model.md` の30項目「⚠️ 未確定項目」とクロスリファレンス。

### 影響範囲

- データモデル全体（テーブル定義15+件、未確定項目30件）
- 状態名の整合性（09 ↔ 05）
- 用語整合性（10 ↔ 05、`deal` / `exchange` 問題）

### 確認方法

- `notes/05_data_model.md` を読む
- `notes/09_state_machines.md` 末尾の未確定項目表を確認
- 付録「状態名の対応表」で 09 と 05 の整合確認

### 関連ファイル

- `notes/05_data_model.md`（全面書き直し）
- `notes/09_state_machines.md`（未確定項目拡張）

### 次フェーズへの示唆（実装着手前の擦り合わせ項目）

特に重要な擦り合わせポイント：
1. **Item の `kind` と `status` の関係**（keep が in_negotiation になりうるか）
2. **proposals.meetup_scheduled_custom** を JSONB か別テーブルか（性能と正規化のバランス）
3. **outfit_photo を messages 内 vs 専用テーブル** どちらが運用しやすいか
4. **到着検知の仕組み**（プライバシー観点で慎重判断）
5. **disputes の resolution.decision 値リスト** 確定（仲裁ルール）

これら30項目を整理した次のタスクとして「USER_PLAYBOOK タスク2: 11_screen_inventory.md」 → タスク3: per-screen spec を進めれば、未確定項目が画面別に分解されてさらに具体化される。

---

## イテレーション37：USER_PLAYBOOK 作成（オーナー向け作業手順書）

### 背景・問題意識

iter36 でGitHub移行・スマホClaude ワークフロー基盤が整ったが、ユーザーから：
- **「Phase 2 の準備を進めるなら、スマホから何を指示して何をチェックすればいい？」**

という実務的な疑問。CLAUDE.md は Claude 向け、README.md は一般向け、で「**オーナーが次に何をすべきか分かるドキュメント**」が無かった。

### 変更内容

#### `notes/USER_PLAYBOOK.md` 新規作成
- Phase 2 タスク一覧（優先順 + 依存関係）
- 各タスクのスマホ指示テンプレート（コピペ可）
- 各タスクのチェックポイント
- 共通チェックポイント（用語整合・状態整合・⚠️要確認の正直さ・iter記録）
- スマホ vs PC 使い分けガイド
- スマホ指示のコツ（3原則、良い例・悪い例）
- トラブルシューティング
- 次にやること判断フロー

タスクは7件：
1. 🥇 05_data_model.md 最新化（iter24-34反映）
2. 🥈 11_screen_inventory.md 新規（画面マトリクス）
3. 🥈 12_screens/ 新規（per-screen spec、主要5画面から）
4. 🥉 13_api_spec.md 新規（API仕様）
5. 🥉 14_implementation_phases.md 新規（フェーズ分割）
6. 🟡 15_non_functional.md 新規（非機能要件）
7. 🟡 02_system_requirements.md 更新（iter24-34反映）

#### `CLAUDE.md` 更新
- 「⚠️ Claude が動作する前に必ずすること」に **5. オーナーがタスク的指示をした場合は USER_PLAYBOOK.md を確認**を追加
- ファイル構造マップに `USER_PLAYBOOK.md` を追加

#### `index.html` 更新
- ヘッダー導線に「📘 USER PLAYBOOK」ボタン追加
- 設計ドキュメントセクションに USER_PLAYBOOK.md カード追加

### 影響範囲

- ドキュメンテーション体系（用途別の3層化が完成）
  - `README.md`：一般来訪者向け
  - `CLAUDE.md`：Claudeセッション向け
  - `USER_PLAYBOOK.md`：オーナー向け
- スマホからの作業効率（テンプレ化で立ち上がりが早い）

### 確認方法

- リポジトリ：https://github.com/mashimabizz/iHub_design/blob/main/notes/USER_PLAYBOOK.md
- ランディングページからもアクセス可：https://mashimabizz.github.io/iHub_design/

### 関連ファイル

- `notes/USER_PLAYBOOK.md`（新規）
- `CLAUDE.md`
- `index.html`

### 次の Claude セッションへの示唆

- オーナーから「タスク◯◯を進めて」と言われたら、**USER_PLAYBOOK.md の該当セクションをまず読む**
- そこに書かれた指示テンプレ・チェックポイントに従って動作すれば品質が安定する

---

## イテレーション36：GitHub移行・CLAUDE.md強化・スマホ Claude ワークフロー整備

### 背景・問題意識

iPhoneからもClaudeに指示出ししたい、というユーザー要望。
当初は GitHub Issue 経由のワークフローを想定したが、claude.ai mobile が GitHub 直結できることが判明。
→ ワークフローの重心を「スマホ Claude が CLAUDE.md だけ読んで動ける」状態にシフト。

### 変更内容

#### GitHub 移行
- `mashimabizz/iHub_design` リポジトリ新設（既存の `iHub_renewal` とは分離）
- ローカル git 初期化、初期コミット 56ファイル push
- `gh` CLI を `~/.local/bin/gh` に直接インストール（Homebrew不要）
- `gh auth login` で認証完了
- credential helper 設定で次回以降の push 自動化

#### `CLAUDE.md` 強化（workflow-rich 化）
- **環境差分セクション**新設：PC（Claude Code）vs スマホ（claude.ai）でできること・できないことを明示
- **A. 設計・実装変更時のチェックリスト**を厳守事項として追加（07ステップ）
- **B. iteration エントリの形式**テンプレ追加
- **C-E. 用語追加・廃止・commit形式**のテンプレ追加
- **GitHub Pages URL** をスマホプレビュー用として記載
- **PC で便利なスラッシュコマンド**セクション追加

#### `/iter` スラッシュコマンド新設（PC専用）
- `.claude/commands/iter.md` 作成
- 設計変更を `notes/08` に記録 + `09`/`10` 更新診断 + commit までを自動化
- スマホ Claude では効かないので、CLAUDE.md のチェックリストを手動で踏む前提

#### `.gitignore` 修正
- 旧：`.claude/` 全体を ignore
- 新：`.claude/settings.local.json` と `.claude/cache/` のみ ignore
- → `commands/` `skills/` `agents/` は今後も含めて track できるように

#### PATH 設定
- `~/.zshrc` に `export PATH="$HOME/.local/bin:$PATH"` 追加
- 次回ターミナル起動から `gh` をフルパス指定不要

#### GitHub Pages 有効化
- `gh api repos/mashimabizz/iHub_design/pages -X POST` で API 経由有効化
- URL: `https://mashimabizz.github.io/iHub_design/`
- スマホ・他環境からプレビュー可能に

### 影響範囲

- リポジトリ全体（git管理化）
- 全 Claude セッション（PC/スマホ問わず CLAUDE.md を参照）
- ドキュメンテーション規律（チェックリスト厳守）

### 確認方法

- リポジトリ: https://github.com/mashimabizz/iHub_design
- GitHub Pages: https://mashimabizz.github.io/iHub_design/iHub/iHub%20MVP%20v1.html （ビルド完了まで数分かかる）
- ローカル: `python3 -m http.server 8000`

### 関連ファイル

- `CLAUDE.md`
- `README.md`
- `.gitignore`
- `.claude/commands/iter.md`
- `~/.zshrc`（ローカル、track外）

### 次フェーズへの示唆

- Phase 2 の `05_data_model.md` 更新を、スマホからでも Claude に依頼できるようになった
- 重要な workflow rule は CLAUDE.md にあるので、別環境でも同じ規律で動作する
- スマホで作業した内容も `[iter◯◯]` 形式で commit すれば履歴一元化される

---

## イテレーション35：再現可能性のための設計ドキュメント整備（state machines ＋ glossary）

### 背景・問題意識

実装フェーズ移行を前にした課題提起：
- **「これから実装に入るが、デザイン通りに作って欲しい」**
- **「環境が変わっても再現できるようにしたい」**
- **「デザインは手段の一つ。基本設計・詳細設計をちゃんと作っておきたい」**

JSX mockup が80画面以上あり完成度は高いが、それだけでは：
- 振る舞い・状態遷移・データ・ルールが暗黙的
- エッジケース・バリデーションが不明
- 別環境（別Claudeセッション・別エンジニア）で再現困難

### 不足層の特定

```
要件定義      ⭕ 既存 00, 01, 03, 06（ただし iter後の更新が必要）
基本設計 (HLD) ❌ 未整備（状態遷移・画面遷移・用語集・非機能）
詳細設計 (LLD) △ 部分的（05_data_model のみ、最新化必要）
実装計画      ❌ 未整備
```

### ROI 順での書く優先順位

1. 🥇 **状態遷移図** — 実装ブレを最も防ぐ
2. 🥈 **データモデル更新** — 全機能の土台（既存 05 を最新化）
3. 🥉 **用語集** — 一貫性の鍵
4. 画面遷移図
5. 画面仕様書（per-screen）
6. API 仕様
7. 実装計画

### 今回のスコープ（Phase 1 の最重要のみ）

🥇 と 🥉 だけ先行実装。これだけで再現可能性の80%確保が狙い。

#### `notes/09_state_machines.md` 新規作成
- 7つのライフサイクル（Proposal / Deal / Dispute / AW / Item / Wish / Account）
- 各エンティティに mermaid 状態図 + 状態定義 + 主要トリガー + ビジネスルール + 関連画面・ファイル
- エンティティ間の関係図
- 未確定・要確認項目を明記（ネゴ提案修正の期限カウンタ等5項目）

#### `notes/10_glossary.md` 新規作成
- 11カテゴリ（プラットフォーム概念／ユーザー・推し／グッズ／取引・プロセス／マッチング／場所・時間／画面識別子／ステータス／ルール・SLA／廃止用語／表記揺れ）
- 廃止用語セクション（コレクション在庫タブ／推し一致バッジ／QR の C-1.5 配置 等）を独立化、過去の判断を消さずに残す
- 表記揺れに迷う用語の使い分けルール（譲／求／待ち合わせ／ネゴ／打診／取引）

### 設計方針

- **markdown 中心** — 環境非依存、Claude が読み書きしやすい
- **mermaid 記法** — 状態図・ER図がコード化できる、GitHub でも描画される
- **Single source of truth** — 仕様 → デザイン → コード のリンクを張る（cross-reference）
- **更新ルールを明記** — 「デザイン変更したら該当 spec も更新」をプロセス化
- **新規Claudeセッションは最初にこのドキュメントを読む**ようプロンプトに含める想定

### 次フェーズの予定

Phase 2（後日）：
- `05_data_model.md` の最新化（iter24-34 の変更反映）
- `11_screen_inventory.md`（画面一覧＋遷移マトリクス）
- `12_screens/` ディレクトリ（per-screen spec）
- `13_api_spec.md`
- `14_implementation_phases.md`（フェーズ分割）

### 確認方法

- `notes/09_state_machines.md`
- `notes/10_glossary.md`

### ユーザー判断

- A 案（🥇🥉 のみ先行）を採用
- 「数日後に他もやる」前提で、今回は最小コスト最大効果に絞る

---

## イテレーション34：C-2 取引チャットの役割再定義（当日ライブ運用へ集約）

### 背景
イテレーション33で待ち合わせをC-0/C-1.5 に前倒ししたため、C-2 から場所提案カード・時刻チップ調整UIが不要になった。役割を「当日のライブ連絡＋合流＋証跡撮影への入口」に絞り込む。

### 削除した旧UI
- 場所提案カード（mini map ＋ OK/別を提案）— C-0で確定済
- 時刻チップ（18:50 / 19:00 / 19:10 / 19:20）— C-0で確定済

### 新C-2の構成

#### ① ヘッダー：到着ステータス表示
- アクティブ表示を「会場到着済（緑）／移動中（橙）」のステータスに置き換え
- 距離 169m を併記

#### ② Pinned card：取引内容＋確定済の待ち合わせ
- 上部固定（`borderBottom`）。取引アイテム両側＋日時＋場所＋mini map（92×60px 横並び）
- 「合意済」緑バッジで視覚的に確定状態を強調

#### ③ 服装写真をシェア CTA（強調）
- 紫→水色グラデの目立つカード（`linear-gradient(135deg, lavender, sky)`）
- 大きい 👕 アイコン＋装飾サークル
- あなた／相手の共有ステータスを2列で可視化（未シェア／✓ 共有済）
- 大きい白背景の「服装写真を撮影してシェア」ボタン
- 自分が共有済になると消える条件レンダリング（`!myOutfitShared && ...`）

#### ④ メッセージ領域
- 服装写真メッセージ（image bubble、紫ロンT＋トートバッグの SVGシルエット例）
- 現在地共有メッセージ（mini map付きbubble、自分位置・相手位置・待ち合わせ地点を3点表示）
- 「@lumi_sua が会場に到着しました」システムメッセージ（緑pillスタイル）
- 既存の「合流したら証跡を撮影」CTAチップは維持

#### ⑤ Composer 上部にクイックアクション行
- 📍 現在地を送る（lavender系ハイライト）
- 👕 服装写真（pink系ハイライト）
- 🖼️ 写真添付（subtle系）
- 横スクロール可能（`overflowX: 'auto'`）

### 新規追加ヘルパー
- `CF_MiniMap`: 俯瞰図 + 中央ピン + 任意で you/partner ピン3点表示

### 動線確認
```
合意 → C-2 開く
 ├ Pin card：取引内容＋待ち合わせ（常時参照）
 ├ 強調CTA：服装写真をシェア（合流支援）
 ├ Quick actions：現在地送信／服装写真／写真添付
 ├ Header：相手の到着ステータス
 └ 合流後：証跡撮影 → C-3
```

### 変更ファイル
- `iHub/c-flow.jsx`：ChatScreen を完全書き換え、`CF_MiniMap` ヘルパー追加
- `iHub/iHub C Flow.html`：C-2 アートボードラベル更新

### 確認方法
http://localhost:8000/iHub%20C%20Flow.html

### ユーザー要望（実装方針の決定）
- 遅刻通知は**実装しない**（ユーザー判断：「遅刻は別に大丈夫です」）
- 服装写真は**目立たせる**（ユーザー要望：「服装写真をアップする導線をもっと目立たせたい」）
- 現在地共有：**そのまま送れる**機能（ユーザー要望：「現在地をそのまま送れたらいい」）

---

## イテレーション33：待ち合わせ（meetup）を合意前にfix・AW連携・マップ表示

### 背景・問題意識
- 旧フロー：合意成立 → C-2 取引チャットで合流場所・時間を相談、というフロー
- 課題：合意したのに当日が合わない／場所がfixできず流れる、というリスクが残る
- ユーザー要望：「合流時刻も合意前にFixしておきたい。その場ですぐ、という場合もあれば、事前に何時くらい、という感じでFixしたい場合もあるでしょう」

### 解決方針：合意 = アイテム + 待ち合わせ（日時・場所） を一体で確定
1. **C-0 提示物選択画面に「📍 待ち合わせ」を3番目のタブとして追加**
2. **2モード切替**：
   - 🚀 **いますぐ**：5/10/15/30分以内チップ＋現在地周辺の合流場所＋マップ
   - 📅 **日時指定**：登録済AWから選択 OR カスタム日時＋AW自動登録チェックボックス
3. **AW連携**：
   - 自分のAWリスト（aw-edit.jsxと同概念）から候補選択
   - 相手と被るAWは「★ 相手と一致」バッジ
   - カスタム入力時は ☑ AW自動登録 で次回マッチングにも活用
4. **マップ表示**：「いつもなんちゃらドームとかで待ち合わせするわけではない」ので、mini map（俯瞰図 + 中央ピン）で場所を可視化

### 影響画面（変更ファイル）

#### `iHub/propose-select.jsx`
- `ProposeSelectScreen` に `initialMeetupType` プロパティを追加
- タブを2 → 3個に拡張（私が出す / 受け取る / 待ち合わせ）
- 待ち合わせタブのカウントバッジは ✓（緑）or !（warn色）で表示
- 即時/日時指定で完全に分岐したUI
- 日時指定モード：登録済AW radio list ＋ OR ＋ カスタム日時カード
- カスタム日時：日付・時刻・場所 + 自動登録 checkbox（デフォルトON）
- 選択中AWのmap preview（場所変更が頻繁なため）
- ボトム summary に待ち合わせ行を追加（提示物summary + 待ち合わせsummary）
- canProceed = 提示物両側 ＋ 待ち合わせ設定済 をすべて満たす
- `PS_MiniMap` ヘルパーSVGコンポーネント新設（俯瞰図 + 中央ピン + ラベル）

#### `iHub/iHub Propose Select.html`
- ⑤「日時指定モード」⑥「即時モード」のアートボード追加（DCSection: meetup）

#### `iHub/nego-flow.jsx`
- `NF_MiniMap` ヘルパーSVGコンポーネント新設
- **C-1受信**：「📩 提案内容」カード末尾に「📍 待ち合わせ」セクション追加（日時 + 場所 + AW一致バッジ + mini map）。「自動添付情報」から「推奨合流ポイント」を削除（提案に含まれるため）
- **C-1.5 ネゴチャット**：「現在の提案」カードに、提示物の下に dashed divider + 横並び（mini map ＋ 日時/場所テキスト）の待ち合わせブロック追加。常に視認できる
- **合意確認モーダル**：取引内容カードと別に「📍 待ち合わせ」カード（pinkグラデ背景）を追加。日時・場所・mini map を中央配置で大きく表示。注意文を「アイテム・日時・場所の変更不可」に拡張
- **取引成立画面**：「次のステップ」前に「📍 確定した待ち合わせ」カードを大きく配置（白bg + lavender border + box-shadow）。日時を 18px で大きく、mini map 100px、「カレンダーに追加」ボタン付き。次のステップは合流前提で簡潔化（旧「合流場所・時間を決める」→新「当日決まった場所・時間で合流」）

### 設計判断
- **デフォルトモードは「日時指定」**：MVPの主用途（事前計画した同担と現地で交換）に合わせる
- **AW自動登録checkboxはデフォルトON**：iHubの中核データ（AW）を増やす導線として
- **マップは「いつも有名会場ではない」前提**：駅前・カフェなど任意の場所でも視覚的に確認可能なよう、SVG俯瞰図ベースで作成
- **map表示は全proposal cardで一貫**：C-1 / C-1.5 / 合意確認 / 取引成立 すべてで mini map を表示し、迷いをゼロに

### 動線（更新後）
```
C-0 提示物＋待ち合わせ選択（3タブ）
  → C-1 打診送信
    → C-1.5 ネゴチャット（待ち合わせも交渉対象）
      → 合意確認モーダル（最終確認）
        → 取引成立画面（待ち合わせ確定情報を強調）
          → C-2 取引チャット（最終調整・現地連絡）
            → C-3 物理交換 → 評価
```

### 確認方法
- http://localhost:8000/iHub%20Propose%20Select.html （⑤⑥が新設）
- http://localhost:8000/iHub%20Nego%20Flow.html （①C-1 / ②C-1.5 / ⑦合意確認 / ⑧取引成立 すべてに meetup 反映）

---

## イテレーション32.5：C-1.5 ネゴチャットからQRボタン削除

### 背景
ネゴ中（合流前）にQR本人確認は文脈的に不要。QRは合流時の本人確認用なので、C-2取引チャット（合流場所・時間確定後）にのみあるべき。

### 修正内容
- nego-flow.jsx の C15NegoChatScreen ヘッダーから QR ボタンを削除（全状態 ②〜⑥）
- C-2 ChatScreen の QR は維持

---

## イテレーション32：合意フロー追加（合意送信前モーダル / 合意済状態 / 取引成立画面）

### 追加内容
1. **合意送信前モーダル**（ボトムシート、誤タップ防止）
2. **「あなた合意済・相手の合意待ち」状態のC-1.5**（disable CTA + システムメッセージ + 状態バッジ）
3. **取引成立画面**（紙吹雪＋スパークル＋取引内容＋次のステップ3つ＋C-2へCTA）

### 動線
合意して受諾 → 確認モーダル → 合意送信
  ├ 相手未合意 → C-1.5「あなた合意済」状態で待機
  └ 双方合意 → 取引成立画面（リッチ演出）→ C-2

### 実装ファイル
- `iHub/nego-flow.jsx`：C15AgreementConfirmModal / C15AgreementSuccess を追加、C15NegoChatScreen に 'mine-agreed' scenario 追加
- `iHub/iHub Nego Flow.html`：⑥⑦⑧アートボード追加

### 確認方法
http://localhost:8000/iHub%20Nego%20Flow.html

---

## イテレーション31：C-1.5 ネゴチャットの整理

### 修正
- クイックアクション横スクロール（相手の譲 / 自分の譲 / 提案修正 / 写真添付）**全削除**
- 「現在の提案」カード右上に **「✏️ 編集」ボタン**追加（C-0 編集モードへ）
- 「+」ボタンに通常のチャット機能を集約（写真・提案修正）

### 結果
LINE等の標準的なチャットUIに近い構造、機能性を維持しつつ冗長要素を削除。

---

## イテレーション30：受諾前ネゴシエーションフロー（C-1受信 / C-1.5 / モーダル）

### 背景
打診送信 → 即受諾/拒否 の二択は柔軟性に欠けた。
「他のグッズと交換できないか」「相手の他の譲を見たい」というネゴ需要に対応。

### 実装ファイル
- `iHub/nego-flow.jsx`：3コンポーネント（C1ReceiveScreen / C15NegoChatScreen / PartnerInventoryModal）
- `iHub/iHub Nego Flow.html`

### 画面構成
1. **C-1受信**：相手側の打診受信画面（承諾 / 反対提案 / 拒否 の3択）
2. **C-1.5 ネゴチャット**（4状態）：
   - 通常 / 3日目リマインド / 6日目リマインド / 期限切れ
   - 上部に「現在の提案」固定カード（変更箇所ハイライト）
   - クイックアクション（相手の譲 / 自分の譲 / 提案修正 / 写真添付）
   - 双方が「合意して受諾」で C-2 へ
3. **相手の譲モーダル**：ネゴ中に参照（wish一致＋提案中バッジ）

### 期限管理
- 総期限：7日
- リマインド：3日目・6日目
- 期限切れ：自動クローズ（拒否ではなく「期限切れ」状態）
- 延長：「+7日延長」ボタン（何回でも）

### 確認方法
http://localhost:8000/iHub%20Nego%20Flow.html

---

## イテレーション29：C-0 提示物選択に数量ステッパー追加

### 背景
同じグッズを在庫×3持っていても「全部出すか / 1個だけ出すか」を選べなかった。
ヲタ実態：だぶり前提のグッズで、何個提示するかは細かく決めたい。

### 修正内容
- propose-select.jsx の各アイテムに数量ステッパー `[− N/max +]` 追加
- チェックON時：自動で最大数（在庫の qty）に設定
- 在庫×1 のアイテムはステッパー非表示（「選択中 ×1」表記のみ）
- 上限・下限に達したらボタンがdisabled
- 下部サマリ・タブバッジを「合計枚数」で表示
- アイテム数 → 枚数集計（複数枚提示が反映）

### 確認方法
http://localhost:8000/iHub%20Propose%20Select.html

---

## イテレーション28：C-0 提示物選択を両側選択可能に拡張

### 背景
完全マッチ・片方向マッチ問わず、「ウィッシュリスト全部が自動で交換対象になる」のは柔軟性に欠ける。
ユーザーが具体的なアイテムを個別に選びたいニーズに対応。

### 修正内容
- propose-select.jsx を**両側選択可能**に再設計
- タブ切替（私が出す / 私が受け取る）で独立編集
- pre-check は「推奨」のみ、ユーザーが自由に追加・解除
- 下部にbothサマリ常時表示
- シナリオ別 pre-check ロジック（full / forward / backward）

### 4アートボードで全パターン表示
- ① 完全マッチ・私が出すタブ
- ② 完全マッチ・私が受け取るタブ
- ③ Forward 片方向
- ④ Backward 片方向

### 確認方法
http://localhost:8000/iHub%20Propose%20Select.html

---

## イテレーション27：C-0 提示物選択画面（片方向マッチ用打診ステップ）

### 背景
打診フロー（C-1）は完全マッチ前提で「両者の交換物が予め確定」している前提だった。
片方向マッチ（私が欲しい譲を持つ人 / 私の譲が欲しい人）から打診する時、片側を自分で選ぶステップが欠けていた。

### 実装ファイル
- `iHub/propose-select.jsx`：C-0 ProposeSelectScreen（forward/backward両対応）
- `iHub/iHub Propose Select.html`

### 画面構成
- **Forward**：「私が欲しい譲を持つ人」から打診 → 提示する譲を選ぶ
- **Backward**：「私の譲が欲しい人」から打診 → 相手から欲しいものを選ぶ
- 共通：固定カード（決定済の側）＋ 一覧（選ぶ側）＋ ★wish一致バッジ＋ 複数選択＋ 選択サマリ

### 動線（更新）
- 完全マッチ：[打診する] → C-1 → C-1' → 送信
- 片方向マッチ：[打診する] → **C-0 提示物選択** → C-1 → C-1' → 送信

### 確認方法
http://localhost:8000/iHub%20Propose%20Select.html

---

## イテレーション26：マッチカードの「推し一致」バッジ削除

### 背景
マッチカードの「推し一致」バッジは、マッチングロジック（譲×求＋AW時空交差）に直結しない装飾的な情報だった。同担拒否派にとっては逆効果になる場面もあり、認知負荷の割にUX価値が薄いと判断。

### 修正内容
- `home-v2.jsx` の MatchCard から **「推し一致」バッジを削除**
- 未使用となった `oshiMatch` 変数も削除（クリーンアップ）
- 残るバッジ：`COMPLETE`（完全マッチ）、`同イベント`（AW一致）

### 結果
カードの認知負荷↓、マッチ判断に直結する情報だけが残る構成に。

---

## イテレーション25：フィルタ「推し」を未登録推しまで拡張

### 問題
フィルタ画面の「推し」セクションが、自分の登録済み推しのみで絞り込み可能だった。
未登録の推し（他のグループ・作品）でも検索したいニーズに対応できなかった。

### 修正内容
- `search-filter.jsx` の FilterScreen に追加：
  - 検索バー（グループ・作品・キャラ名で検索）
  - 「あなたの推し」セクション（ピンクバッジで強調）
  - **「他の推しから検索」セクション**（新規追加）
    - ジャンルタブ：K-POP / アニメ / ゲーム / 2.5次元 / VTuber / 邦アイ
    - 各ジャンルの人気グループ・作品リスト
    - 運営への追加リクエスト

---

## イテレーション24：推しの2階層構造をUIに明示

### 問題
データモデル（genres → groups → characters）は3階層だが、フィルタチップやマッチカードのUIで階層が見えない箇所があった。

### 修正内容
- **search-filter.jsx**：フィルタ画面「推し」セクションを**ジャンルバッジ＋グループ名＋インデントされたメンバー**の階層表示に
- **b-inventory.jsx**：フィルタチップを「推し」と「種別」の**2軸に分離**（譲るもの・求めるもの両方）
- マッチカードのバッジ詳細化（C案）は保留 ─ ホーム画面サンプル見て判断

### 確認方法
- http://localhost:8000/iHub%20Search%20Filter.html （画面② フィルタ）
- http://localhost:8000/iHub%20B%20Inventory.html

---

## イテレーション23：検索・フィルタ・保存検索（3画面）

### 背景
ホーム画面の🔍と⚙️アイコンの先が未実装、「探索」タブの中身も未定義。
ユーザーがマッチ条件をカスタマイズできるように検索・フィルタ機能を追加。

### 実装ファイル
- `iHub/search-filter.jsx`：3画面
- `iHub/iHub Search Filter.html`

### 画面構成
1. **検索画面** ─ キーワード検索＋クイックフィルタ＋結果＋履歴＋人気
2. **フィルタ画面** ─ 距離/推し/種別/状態/★/取引実績/マッチ強度/並び替え＋保存CTA
3. **保存検索リスト** ─ ピン留め・ワンタップ適用・件数バッジ・件数0時の分岐

### 確認方法
http://localhost:8000/iHub%20Search%20Filter.html

---

## イテレーション22：プロフ補助 Phase 2（8画面）

### 実装ファイル
- `iHub/account-extras.jsx`：8画面
- `iHub/iHub Profile Extras.html`

### 画面構成
1. プロフィール編集（アイコン・ハンドル・自己紹介・性別・活動エリア・服装写真）
2. 推し設定編集（複数推し管理・メンバー追加削除）
3. ブロックリスト（理由表示・解除）
4. 在庫の公開設定（全部公開モデル＋休止モード）
5. 他人のプロフィール表示（マッチから遷移先・統計＋AW＋CTA）
6. 本人確認（メール認証バッジ＋追加オプション）
7. アプリ情報（バージョン・法的情報リンク・コピーライト）
8. アカウント削除完了（データ一覧＋7年保管注記＋再登録）

### 確認方法
http://localhost:8000/iHub%20Profile%20Extras.html

---

## イテレーション21：法的画面 Phase 1（利用規約・プライバシーポリシー・特商法）

### 背景
設定メニューに「利用規約／プライバシーポリシー」のリンクはあったが、本文ページの実体がなかった。
法的に必須なので Phase 1 として3画面を実装。

### 実装ファイル
- `iHub/legal-pages.jsx`：3画面（TermsOfService / PrivacyPolicy / LegalNotice）
- `iHub/iHub Legal Pages.html`：表示用 HTML

### 画面構成
1. **利用規約**：第1条〜第12条＋附則（全12条構成）
2. **プライバシーポリシー**：9セクション＋お問い合わせ窓口
3. **特定商取引法に基づく表記**：運営事業者情報＋サービス情報＋物々交換の補足

### 注意事項（実運用前 必須対応）
- 内容はすべてモック、法務/弁護士による内容レビュー必須
- 運営会社情報・連絡先は実情に差し替え
- 設定画面（SettingsTop）から遷移できるようリンク実装要
- 新規登録画面の「規約に同意する」チェックボックスからも遷移できるようにリンク実装要

### 確認方法
http://localhost:8000/iHub%20Legal%20Pages.html

---

## イテレーション20：ターン3 認証＋オンボーディング 自前実装

Claude Design 利用制限のため、ハナ自身が JSX 直接実装。

### 実装ファイル
- `iHub/auth-onboarding.jsx`（13画面分の React コンポーネント）
- `iHub/iHub Auth Onboarding.html`（表示用 HTML、Babel Standalone）

### 13画面の構成
1. ウェルカム（メアド/Google/ログインの3CTA）
2. 新規登録（メアド経由）
2'. Google経由同意（メール認証スキップ）
3. メール認証送信完了
4. メール認証完了
5. ログイン
6. パスワードリセット
7. アカウント削除（理由選択＋警告）
8〜12. オンボーディング（性別→推しグループ→メンバー→AWエリア→完了）

### 確認方法
ローカルサーバー起動：`python3 -m http.server 8000`（iHub ディレクトリ内）
http://localhost:8000/iHub%20Auth%20Onboarding.html

---

## イテレーション19.5：在庫タブの仕様修正（追加）

### 問題発覚
在庫タブに「譲るもの／求めるもの」の上タブがあるが、概念的に矛盾：
- 在庫 = 自分が持っているもの（譲る or 自分用キープ）
- 求めるもの = まだ持っていないもの（ウィッシュ）

### 修正方針

#### 在庫タブの構造（修正後）
- 上タブ「譲るもの／求めるもの」を **削除**
- 上部は「📋 リスト / 📚 コレクション」切替のみ
- リスト表示：サブビュー（譲る候補 / 自分用キープ / 過去に譲った）＋ フィルタチップ
- コレクション表示：wish基準シルエット表示＋進捗

#### ウィッシュタブ（独立）
- 求めるものの管理に専念（CRUD＋優先度＋flexibility＋探し中ステータス）

#### B-2 撮影フローの「譲る／求める／自分用キープ」3択トグル
- 譲る → 在庫の「譲る候補」へ
- 求める → ウィッシュタブへ（ウィッシュ追加）
- 自分用キープ → 在庫の「自分用キープ」へ

### 追加修正項目

1. 「達成記念をXに投稿」CTA はコンプ達成時のみ表示
2. コレクション表示の上部に「全wishの進捗バー」追加（例：9/14、69%）
3. プロフハブのメトリクス「5 SAVファ」の正体確認＋コレクションサマリ表記整理

### プロフハブ反映確認 ✅
- プロフィールカード（推し情報・エリア・取引マナー◎）
- メトリクス4つ並び
- コレクションサマリ縮小版（1行表示）
- アイデンティティ・活動・設定セクション分け
- ボトムナビ正しく5タブ

### ファイル構成方針

**新規 1ファイル統合**：`iHub Core Surfaces.html`（仮名、命名は依頼者判断）
- ホーム再確認＋プロフハブ＋ウィッシュタブの 6〜7画面を1ファイル統合
- 関連性が強い3画面群、横断確認が効く

**既存ファイルのナビ一括修正**（5画面構成「ホーム／在庫／取引／ウィッシュ／プロフ」に統一）：
- iHub B Inventory.html
- iHub Account & Support.html
- iHub Collection Pokedex.html
- iHub Dispute Flow.html
- iHub C Flow.html
- iHub AW.html
