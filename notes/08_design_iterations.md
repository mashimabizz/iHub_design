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

## イテレーション67.3：listings を「N×M × AND/OR」に拡張、wish exchange_type 復活

### 背景

オーナーから iter67.2 のあとに整理の続き：

> マッチについてですが…一つの譲に対して、ユーザーが個別募集で指定したものがあると思うので、それがマッチングのパネルにうまく表現できたらなと思っている。今の機能では、個別募集でしているす WISH が、AND 条件なのか OR 条件なのか指定ができないので、それは実装したい。
>
> 譲るものが複数あって、それが AND か OR かで話していたけど、私は WISH も同じ場合があると思うんですね…1 対複数または複数対 1 でも、OR 条件であれば比率を設定できればいい。AND 条件であれば、比率を考えるとややこしい。
>
> マッチングパネルにすべてを表現する必要はない。パネルには譲と求の組み合わせだけ、タップしたらポップアップで詳細の関係図を出す。
>
> Wish で設定するものには必ず同種か異種か同異種かを設定できるように。

### データモデルの方針（合意済み）

**listings：「N×M × AND/OR」マトリクス**

| 列 | 意味 |
|---|---|
| `have_ids[]` | 譲側のインベントリ（複数可） |
| `have_qtys[]` | 各譲の数量（≒比率を内包） |
| `have_logic` | 'and' or 'or'（複数のとき意味あり） |
| `wish_ids[]` | 求側のウィッシュ（複数可） |
| `wish_qtys[]` | 各 wish の数量 |
| `wish_logic` | 'and' or 'or' |

**「比率」概念は別カラムで持たない** — `qty` がそのまま比率を表現。
**OR × OR × 両側 ≥2 アイテムは禁止**（誰がどれを選ぶか曖昧、組合せ爆発）。

**listings.exchange_type は廃止**（per-wish の `goods_inventory.exchange_type` が source of truth）。

**wish レベルで exchange_type を必須に復活**（iter65.6 で廃止 → iter67.3 で戻す）。

### 変更内容

#### A. DB マイグレーション（`supabase/migrations/20260503180000_listings_and_or_matrix.sql`）

- 旧列削除：`inventory_id`、`exchange_type`、`ratio_give`、`ratio_receive`、`priority`
- 新列追加：`have_ids[]`、`have_qtys[]`、`have_logic`、`wish_qtys[]`、`wish_logic`
- 制約：
  - have/wish の ids[] と qtys[] の長さ一致 + 1 以上
  - all qty >= 1（trigger 内検証）
  - **OR × OR 両側 ≥2 アイテム 禁止**（CHECK）
  - have_ids 全件が `kind=for_trade` で listing 所有者と一致
  - wish_ids 全件が `kind=wanted` で listing 所有者と一致
- インデックス：`have_ids` GIN
- 既存データは delete（dev のみ・運用前）

#### B. matching.ts：AND/OR 対応

- `ListingForMatch` 型を新スキーマに変更（haveIds[]、wishIds[]、qtys[]、logic）
- `Match` 型に `matchedListings?: MatchedListingInfo[]` 追加（UI 用）
- `evaluateListingMatch()` 新関数：
  - wish_logic = AND ⇒ 全 wish_ids が「相手の譲群のいずれか」にヒット必要
  - wish_logic = OR ⇒ 1 件以上で OK
  - have_logic = AND ⇒ 全 have_ids を trade に出す
  - have_logic = OR ⇒ 1 件のみ仮表示（MVP）
- 数量 (qty) はマッチ判定では未使用（タグ表示のみ）。実数量は打診で個別調整

#### C. 個別募集 `/listings`：actions / page / View 全面更新

- `actions.ts`：input 形式を `haveIds[]/haveQtys[]/haveLogic/wishIds[]/wishQtys[]/wishLogic`、validateMatrix 関数で OR×OR ガード
- `page.tsx`：have_ids[] と wish_ids[] を flatten して in-clause で goods_inventory を一括取得
- `ListingsView.tsx`：上下 2 ブロック（譲群 / 求群）。各群に「全部 AND」or「いずれか OR」バッジ。アイテムは chip 表示で `×qty` バッジ + wish 側のみ exchange_type chip（同種/異種）

#### D. 個別募集作成 `/listings/new/ListingNewForm.tsx` 全面リファクタ

- 譲側：3 列のパネルカードで複数選択 + 各カードに ＋/− qty stepper 内蔵
- 求側：chip で複数選択 + 各 chip に ＋/− qty stepper
- 譲・求それぞれが ≥2 のとき AND/OR トグル表示
- OR × OR ガード（UI 警告 + submit 拒否）
- 譲・求ともに「推し / 種別」フィルタ chip 行

#### E. wish 作成/表示で exchange_type 復活

- `WishNewForm.tsx`：交換タイプ 3 ボタン（**同異種** / 同種のみ / 異種のみ）。デフォルト同異種。説明：「システムは弾きません（マッチング表示用のタグ）」
- `WishView.tsx`：wish カード内に exchange_type chip を表示

#### F. マッチカード：listing 経由の「セット / いずれか」バッジ

- `MatchCardData` に `listingBadge?: 'set' | 'any' | null` を追加
- `HomeView.matchToCard()` で `Match.matchedListings` を見て：
  - haveLogic=AND or wishLogic=AND が含まれる → `'set'`
  - その他の listing 経由 → `'any'`
- `MatchCard` 表示：
  - `'set'` → 紫背景の「📦 セット」ピル
  - `'any'` → 透明枠の「いずれか OK」ピル
  - 「※ 個別募集経由」注記

### TODO（次の iter）

- ~~iter67.3-G **詳細モーダル**~~ → ✅ 別 commit で実装（オーナー指示「A」）
- iter67-D：受信表示 `/proposals/[id]`

### 追加：iter67.3-G — 詳細モーダル（SVG 関係図）

別 commit で実装。

#### 仕様

- マッチカードに **「詳細→」** リンクを追加（listing 経由マッチのみ）
- 全画面モーダルで listing の関係を可視化：
  - 左カラム：私の譲（matched 分）
  - 右カラム：求（matched 分）
  - **SVG line で接続**：実線（AND）/ 点線（OR）
  - 数量バッジは各アイテム右上に「×N」
- 各 listing 1 セクション。複数 listing は縦に並ぶ
- 各セクションヘッダーに「全部 AND / いずれか OR」chip × 2（譲側 / 求側）
- OR で他にも候補ある場合は注記表示

#### 実装

- `web/src/components/home/MatchDetailModal.tsx` 新規
  - 固定サイズアイテム（76×96px）
  - 縦 gap 18px、横 col gap 110px で SVG line を計算的に描画
  - body scroll lock
- `MatchCard.tsx` に詳細ボタン + モーダル開閉 state
- `MatchedListingInfo` 型を full listing snapshot（haveIds/haveQtys/wishIds/wishQtys 含む）に拡張
- `HomeView.matchToCard()` で `myInvById` / `myWishById` を使って item details を hydrate
- `page.tsx` から HomeView へ `myInventory` / `myWishes` を追加で渡す

#### 設計判断

- MVP では **matched 分のみ表示**（OR の代替候補は注記で件数だけ示す）。完全な候補展開は将来オーナー要望次第
- 線の太さ：実線=2.2px、点線=1.6px。色 `#a695d8`、opacity 0.85
- listing.wish_qtys は「私が欲しい数量」として右側のバッジに表示（相手のインベントリ qty ではない）

### 設計判断

- **比率 = qty**：別概念にしない。OR の場合は候補ごとに違う qty を持てる。AND は群全体の数量が固定
- **MVP では数量はマッチ判定に使わない**（タグ表示のみ）。実数量は打診時に個別調整（プロポーザル送信フォームで stepper）
- **listings.exchange_type は廃止**。wish レベルが source of truth
- **OR × OR 両側 ≥2 は禁止**（DB CHECK + UI 警告）

### 関連ファイル

- `supabase/migrations/20260503180000_listings_and_or_matrix.sql`（新規）
- `web/src/lib/matching.ts`（型 + matchPair + evaluateListingMatch）
- `web/src/app/listings/{actions.ts, page.tsx, ListingsView.tsx, new/ListingNewForm.tsx}`
- `web/src/app/page.tsx`（listings select の列名更新）
- `web/src/app/wishes/new/WishNewForm.tsx`（exchange_type 復活）
- `web/src/app/wishes/WishView.tsx`（exchange_type chip）
- `web/src/components/home/MatchCard.tsx`（listingBadge）
- `web/src/components/home/HomeView.tsx`（matchToCard）

---

## イテレーション67.1：打診 C-0 改修＋ホームヘッダー整理

### 背景

iter67 で打診 C-0 ウィザードが動き出した。実機で触ったオーナーから整理依頼：

- 提示物選択で **wish 一致が下に埋もれる** → 上に並べてほしい
- 待ち合わせの「いますぐ / 日時指定」**トグルが面倒**。1 画面に統一して、相手が現地交換モードならその AW から自動入力したい。時間は **時間帯**（開始〜終了）で。地図も AW 編集と同じく必要
- フッターの **3 行サマリ（譲・受・待ち合わせ）は冗長** なので削除
- STEP 3 確認画面のグッズが文字一覧 → **マッチパネルみたいに画像** で表示。待ち合わせ場所も **地図** で表示
- ついでにホーム上部の「**オフライン中**」「**推し：LUMENA**」表記を削除（mock 残骸）

### 変更内容

#### A. `web/src/components/home/HomeView.tsx`
- Sync strip（オフライン中・最終同期・ローカル件数）削除
- タイトル行から「推し：LUMENA · スア」サブ表記を削除（h1「マッチング」だけ残す）

#### B. DB マイグレーション（新規 `supabase/migrations/20260503170000_simplify_meetup.sql`）

`proposals` テーブルから旧待ち合わせ列を削除し、新列に置換。

| 旧 | 新 |
|---|---|
| `meetup_type ('now'/'scheduled')` | （削除） |
| `meetup_now_minutes` | （削除） |
| `meetup_scheduled_custom JSONB` | （削除） |
| — | `meetup_start_at timestamptz` |
| — | `meetup_end_at timestamptz` |
| — | `meetup_place_name text (≤200)` |
| — | `meetup_lat numeric(9,6)` |
| — | `meetup_lng numeric(9,6)` |

CHECK 制約 `proposals_meetup_required`：`status='draft'` 以外なら 5 列すべて NOT NULL かつ end > start。

旧テストデータは `delete from proposals` で掃除（運用前なのでロスト懸念無し）。

#### C. `web/src/app/propose/[partnerId]/page.tsx`

server fetch を 1 つ追加：
```ts
supabase.from("user_local_mode_settings")
  .select("enabled, aw_id, last_lat, last_lng")
  .eq("user_id", partnerId)
```
`enabled && aw_id` なら `activity_windows` から `venue / center_lat / center_lng / start_at / end_at` を取得。
ProposeFlow には `partner.localModeEnabled` と `partner.localModeAW` を渡す。

#### D. `web/src/app/propose/[partnerId]/ProposeFlow.tsx` 全面リファクタ

**(1) 提示物選択：wish 一致を上にソート**
- `sortByWishFirst()` を `myItems` / `theirItems` 初期化時に適用

**(2) 待ち合わせの統一フォーム**
- now / scheduled トグル削除
- 単一フォーム：
  - 時間帯：`<input type="datetime-local">` × 2（開始・終了）
  - 場所：`<input type="text">` の「場所名」+ 地名検索バー（`/api/geocode`）+ 「📍 現在地を中心に」ボタン
  - 地図：`MapPicker`（leaflet、ピンのドラッグ・タップで lat/lng 更新）
- 相手が現地交換モード ON → 緑のバナー「@相手 は現地交換モード中」+ AW の値で 5 項目（start/end/venue/lat/lng）を pre-fill
- 相手が現地モード OFF → 1 時間後 〜 2 時間後 / 東京駅をデフォルト

**(3) 送信入力の形式変更**
- `createProposal()` の input から `meetupType`/`meetupNowMinutes`/`meetupScheduledCustom` を削除
- 代わりに `meetupStartAt` / `meetupEndAt` / `meetupPlaceName` / `meetupLat` / `meetupLng` を渡す

**(4) フッターの 3 行サマリ削除**
- `<SummaryRow>` / `<MeetupSummaryRow>` 撤去
- フッターは CTA ボタン 1 つだけに（pb 領域も縮小）

**(5) STEP 3 確認画面のリッチ化**
- 「交換内容」セクションを **マッチパネル風グリッド** に：
  - 左 = 相手の譲、中央 = ↔ 矢印、右 = あなたの譲
  - 各アイテムは `Tcg` ミニカード（写真 or イニシャル、36×48px、数量バッジ右上）
  - `MatchCard.tsx` の Tcg / SidePanel / ArrowDot を ProposeFlow 内で同型再実装
- 「待ち合わせ」セクションに **地図プレビュー**（160px 高、operations 無し read-only）

#### E. `web/src/app/propose/actions.ts`

input 形式を新 schema に合わせて更新：
```ts
meetupStartAt: string  // ISO
meetupEndAt: string    // ISO
meetupPlaceName: string
meetupLat: number
meetupLng: number
```
バリデーション：
- 全項目必須
- end > start
- lat / lng が finite

INSERT 時：`meetup_start_at`, `meetup_end_at`, `meetup_place_name`, `meetup_lat`, `meetup_lng`。`meetup_type` 系は INSERT に含めない（DB 側で削除済み）。

### 影響範囲

- ホーム画面：上部のごみ表記が消えてスッキリ
- `/propose/[partnerId]`：
  - mine / theirs：wish 一致が一番上
  - meetup：1 画面・地図付き・現地モード自動入力
  - フッター：CTA だけ
  - STEP 3：画像グリッド + 地図
- DB：proposals の待ち合わせ 5 列が新形式に

### 設計判断

- 「いますぐ」概念は **時間帯の中に内包**（5 分後〜30 分後の時間帯を入れれば「いますぐ」相当）。UI 上は分岐なし
- 相手が現地モード ON のときに **AW を読み込むだけ**（プロポーザル送信時に AW 自体は変更しない）。AW = マッチング演算用、proposal の meetup = この打診固有の待ち合わせ
- 確認画面の地図は read-only（`onCenterChange={() => {}}`）。STEP 1 の地図で確定済みのため

### 関連ファイル

- `web/src/components/home/HomeView.tsx`（ヘッダー削除）
- `supabase/migrations/20260503170000_simplify_meetup.sql`（新規）
- `web/src/app/propose/[partnerId]/page.tsx`（partner local mode + AW fetch）
- `web/src/app/propose/[partnerId]/ProposeFlow.tsx`（全面リファクタ）
- `web/src/app/propose/actions.ts`（input 形式変更）

---

## イテレーション67：打診（C-0/C-1）と個人スケジュール

### 背景

iter66 で実マッチング演算が動き出し、ホームに本物のマッチカードが並ぶようになった。次に必要なのは「打診を実際に送れる」こと。
オーナー選択：
- **Q1=C（フル装備の C-0）** … 在庫多選択 + qty stepper + メッセージトーン + カレンダー公開
- **Q2=Yes** … 待ち合わせは打診時に決める。AW から選ぶのはやめる（AW はマッチング演算専用）。代わりに **個人カレンダー（スケジュール）** を新設して打診相手にだけ公開できるようにする
- **Q3=案1** … `proposals` テーブルは modal-rich にしてフラグ列を充実させる方針
- **Q4=Yes** … 個別募集（listings）からの打診も同じフローを通る

### 変更内容

#### A. DB マイグレーション（`supabase/migrations/20260503160000_add_proposals_and_schedules.sql`）

- **`proposals`**：sender / receiver / match_type / sender_have_ids[] / sender_have_qtys[] / receiver_have_ids[] / receiver_have_qtys[] / message / message_tone / status (`sent`/`negotiating`/`agreed`/`rejected`/`expired`) / agreed_by_sender / agreed_by_receiver / last_action_at / expires_at / extension_count / rejected_template / **meetup_type** (`now`/`scheduled`) / meetup_now_minutes / **meetup_scheduled_custom**(JSONB: date/time/placeName) / expose_calendar / listing_id
  - **重要**：`meetup_scheduled_aw_id` は **入れない**。AW はマッチング演算専用に分離。
  - RLS：sender / receiver のどちらか一方のみが SELECT/UPDATE 可
- **`schedules`**：id / user_id / title / start_at / end_at / all_day / note
  - RLS：自分のスケジュールは自由に CRUD。`expose_calendar = true` で打診相手は SELECT 可

#### B. 個人スケジュール `/schedules`

`web/src/app/schedules/`：一覧（今後 / 過去で分割）／新規（`/new`）／編集（`/[id]`）／削除。
`ScheduleForm.tsx` で終日トグル・datetime-local 入力。

`profile/ProfileView.tsx` の「あなたの活動」に **「📅 スケジュール」** リンクを追加（自分の AW 動線は削除済み）。

#### C. 打診 C-0 `/propose/[partnerId]`

- **server**（`page.tsx`）：自分・相手の inventory（kind=for_trade, status=active）と wishes（kind=wanted, !=archived）を並列 fetch、`isHit()` で wishMatch フラグを付与してクライアントへ
- **server action**（`actions.ts`）：
  - `createProposal()` — 全フィールド検証 → `proposals` INSERT、`expires_at = now + 7d`、status='sent'。`/proposals` `/` を revalidate
  - `respondToProposal()` — accept / reject / negotiate（受信者用）
- **client wizard**（`ProposeFlow.tsx`、3 ステップ単一コンポーネント）：
  - **STEP 1 / 提示物選択**：3 タブ
    - mine / theirs：チェックボックス多選択 + qty stepper + 「★ wish 一致」バッジ + サムネ（写真 or character/group ID から hash で hue 決定）
    - meetup：「🚀 いますぐ（5/10/15/30 分）」or 「📅 日時指定（日付 + 時刻 + 場所、AW 選択は無し）」
    - matchType に応じた pre-check（perfect=両側 wishMatch、forward=mine wishMatch、backward=theirs wishMatch）
  - **STEP 2 / メッセージ**：標準 / カジュアル / 丁寧 トーン切替で **テンプレ自動生成**（partnerHandle / 自分の譲 / 受け取る / 待ち合わせ を埋め込み）。手で編集も OK。**スケジュール共有**チェックボックス
  - **STEP 3 / 送信確認**：交換内容グリッド + 待ち合わせ + メッセージ全文 + 「📨 この内容で打診を送信」CTA → 成功で `/` へ（取引タブはまだ無いので暫定）

#### D. マッチカード配線（`MatchCard.tsx` + `HomeView.tsx`）

`MatchCardData` に `partnerId` を追加し、`matchToCard()` で `m.partner.id` を埋め込み。
「打診する」ボタンを `<Link href="/propose/${partnerId}?matchType=${matchType}">` に変更。

### 影響範囲

- 新ルート：`/propose/[partnerId]`（C-0 ウィザード）
- 新ルート：`/schedules`、`/schedules/new`、`/schedules/[id]`
- ホーム → マッチカード → 打診 → 提示物選択 → メッセージ → 確認 → 送信 → ホーム
- DB：`proposals`, `schedules` 2 テーブル新設
- プロフ：「📅 スケジュール」エントリ追加

### 設計判断（重要）

- **AW と個人スケジュールは分離**。AW = 「この時間ここに**いる**」マッチング演算用。個人スケジュール = 「この時間 **忙しい**」打診相手向けの予定共有。打診時に AW を流用しない（オーナー指示）
- 待ち合わせは打診時に **fix される**（iter33 の方針継続）。打診を承諾した瞬間に日時・場所が確定する
- カレンダー公開は **全予定一括 ON/OFF**（個別共有は MVP では持たない）
- 取引画面（フッタータブ）は未着手。打診送信後の遷移は暫定 `/`、後で `/transactions` 等に差し替え

### 次（iter67-D 以降）

- `/proposals/[id]`（受信表示）：accept / reject / negotiate ボタン、相手の expose_calendar が ON ならスケジュール overlay
- C-1.5 ネゴチャット
- C-2 取引チャット / C-3 完了
- フッターに「取引」タブ追加

### 関連ファイル

- `supabase/migrations/20260503160000_add_proposals_and_schedules.sql`
- `web/src/app/schedules/{page.tsx,SchedulesView.tsx,actions.ts,ScheduleForm.tsx,new/page.tsx,[id]/page.tsx}`
- `web/src/app/propose/{actions.ts,[partnerId]/page.tsx,[partnerId]/ProposeFlow.tsx}`
- `web/src/components/home/MatchCard.tsx`（partnerId 追加 + Link 化）
- `web/src/components/home/HomeView.tsx`（matchToCard で partnerId 埋め込み）
- `web/src/app/profile/ProfileView.tsx`（スケジュール導線追加）

---

## イテレーション66：実マッチング演算（mock 撤去）

### 背景

iter65 シリーズで在庫・wish・AW・listings・現地モード設定 — 全部品が DB に保存されるようになったが、ホームのマッチカードは依然として **mock 4 件**。実際の交換相手を探せる状態ではなかった。
オーナー選択（A）で iter66 として「実マッチング演算」着手。

### 変更内容

#### A. `web/src/lib/matching.ts`（新規）

純関数のマッチング演算コア:

```ts
isMatching(my, theirs)        // 1 アイテム同士のマッチ判定
matchPair({ ... })             // 私 × 1 パートナーの組合せ → Match | null
computeAllMatches({ ... })    // 全パートナー走査 + ソート
buildLabel(items)              // UI ラベル生成
haversineMeters(...)           // 2 点間距離（時空交差用）
awsOverlap(myAW, theirAW)     // AW 同士の時空交差判定
```

**マッチ判定ルール**:
- `goods_type_id` が一致必須
- 双方が `character_id` 持ち → キャラ一致必須
- どちらか `character_id` null → `group_id` で一致判定（箱推し的）

**個別募集の優先**:
- 私の譲 X に listing がある場合、その listing.wish_ids 群を「私の wish」として優先使用
- listing がない譲は通常 wish との比較

**ソート**:
- complete > they_want_you = you_want_them
- 同タイプ内では viaListing 優先

#### B. `web/src/app/page.tsx`（拡張）

`Promise.all` の中身を 7 件 → 12 件に拡張:
- 自分の inventory + wishes + listings (active)
- 他者の inventory + wishes（公開分）
- 他者の users（display_name / handle / primary_area）
- 他者の AW（時空交差用）

ホーム描画前に `computeAllMatches` で計算 → `matches: Match[]` を HomeView に渡す。

**現地モード時のフィルタ**:
- `localMode.enabled === true` かつ `currentAW` がある場合
- 他者の AW を user_id 単位に集約
- `awsOverlap(myAW, theirAW)` でフィルタ
- どれか 1 つでも交差すればパートナーとして残す

#### C. `web/src/components/home/HomeView.tsx`（mock 撤去）

- `MOCK_CARDS_BY_TAB` 削除
- `matchToCard(m)` ヘルパで `Match → MockMatchCard`（既存 UI 互換のため型は維持）
- `cardsByTab` を `useMemo` でタブ別に振り分け
  - 0: complete / 1: they_want_you / 2: you_want_them / 3: 全部（探索）
- `tabCounts` で各タブの実件数表示

#### D. RLS と公開設定

既存ポリシー流用（変更なし）:
- `goods_inventory`: status in ('active', 'reserved') は誰でも読める
- `users`: 誰でも読める
- `activity_windows`: status='enabled' は誰でも読める
- `listings`: status='active' は誰でも読める

### 関連ファイル

- `web/src/lib/matching.ts`（新規）
- `web/src/app/page.tsx`（fetch + 計算拡張）
- `web/src/components/home/HomeView.tsx`（mock 撤去 + matchToCard 配線）

### スコープ外（後続 iter）

- 同種/異種タグの判定（現状は表示のみ・iter62 確定）
- 「断った」記録の除外（rejected_partners テーブル未作成）
- ブロックリスト除外（テーブル未作成）
- マッチング結果のキャッシュ（毎回計算でも 500 件 LIMIT で実用範囲）
- 距離の数値表示（現状は primary_area or 「広域」）

### セルフレビュー（CLAUDE.md absolute rule C）

- **A. デザイン整合性**: MatchCard の見た目は変更なし（mock → 実データ）✅
- **B. 仕様整合性**: notes/18 §B-1（タグは判定不使用）/ §B-2（listings 優先）/ §B-4（時空交差）と整合 ✅
- **C. レビュー記録**: 500 件 LIMIT は MVP 暫定。スケール時はサーバ側マッチ（PostGIS / 関数）に切替予定 ✅

---

## イテレーション65.9：プロフ画面 + プロフ編集 + 推し設定編集（案 Z ハイブリッド）

### 背景

オーナー要望: 「プロフ画面と推し設定画面が無いとテストできない」。
iter65.8 で BottomNav の「プロフ」タブからのリンク先がまだ無い状態を解消。
推し設定の動線について 3 案（X/Y/Z）を提示しオーナーが **案 Z（ハイブリッド）** を選択。

### 変更内容

#### A. `web/src/app/profile/actions.ts`（新規）

4 つの server action:
- `updateProfile(input)`: handle / display_name / gender / primary_area を更新（handle 重複チェック含む）
- `removeOshiGroup(groupId)`: グループ単位で user_oshi 全行削除
- `addCharacterToOshi({ groupId, characterId })`: メンバー追加。box 推しは specific 化、priority 自動採番
- `removeCharacterFromOshi({ groupId, characterId })`: メンバー削除。最後のメンバーを消すと box 復活

#### B. `/profile`（新規 + ProfileView.tsx）

モックアップ `hub-screens.jsx::ProfileHub` 準拠（**Q1 = B フル構成**）:
- ヘッダー（タイトル + 設定アイコン）
- アイデンティティ hero（紫グラデ + アバター + @handle + サブ + 統計 4 マス）
  - 統計: 評価（mock —）/ 取引（実 count）/ コレ（mock —）/ AW予定（実 count）
- コレクションサマリ（**準備中** chip）
- あなたの活動: 取引履歴（**準備中**）/ 自分の AW（実件数表示、ホームへリンク）
- アイデンティティ: プロフィール編集 / 推し設定 / 本人確認（メール認証済バッジ）
- 設定・サポート: 設定 / 通知 / ヘルプ（全部 **準備中**）
- ログアウト + アカウント削除（準備中）

#### C. `/profile/edit`（新規 + ProfileEditForm.tsx）

モックアップ `account-extras.jsx::ProfileEdit` ベース:
- アバター プレビュー（変更ボタンは disabled・準備中）
- ハンドル名 input（@ プレフィクス + 半角英数 + アンダースコア・3〜20）
- 表示名 input（必須）
- 性別 chip（女性/男性/その他/回答しない、トグル可）
- 主な活動エリア input（任意）

#### D. `/profile/oshi`（新規 + OshiEditView.tsx）— 案 Z ハイブリッド

- 自分の `user_oshi` をグループ単位でまとめてカード表示
- 各グループカード:
  - ヘッダー: グループ名 + イニシャル四角アイコン + 削除ボタン
  - 推しメンバー chip 群: 名前 + × でメンバー削除
  - 「+ 追加」chip → inline で同グループの**未選択**キャラを chip 表示
  - 「マスタに無いメンバーを追加リクエスト →」リンク → `/onboarding/members/request?groupId=X&return=profile`
- 「＋ 推しを追加（グループ・作品）」ボタン → `/onboarding/oshi?return=profile`

#### E. オンボ画面の `?return=profile` 対応

- `/onboarding/oshi/page.tsx`: searchParams から return を読み、HeaderBack の backHref / title を分岐
- `/onboarding/oshi/OshiForm.tsx`: useSearchParams で return 取得、保存後 router.push 先を `/profile/oshi` に分岐
- `/onboarding/members/request/page.tsx`: HeaderBack backHref を分岐
- `/onboarding/members/request/RequestForm.tsx`: 保存後の遷移先を分岐

### 関連ファイル

- `web/src/app/profile/{actions.ts, page.tsx, ProfileView.tsx}`（新規）
- `web/src/app/profile/edit/{page.tsx, ProfileEditForm.tsx}`（新規）
- `web/src/app/profile/oshi/{page.tsx, OshiEditView.tsx}`（新規）
- `web/src/app/onboarding/oshi/{page.tsx, OshiForm.tsx}`（return 対応）
- `web/src/app/onboarding/members/request/{page.tsx, RequestForm.tsx}`（return 対応）

### セルフレビュー（CLAUDE.md absolute rule C）

- **A. デザイン整合性**: hero card 紫グラデ・統計 4 マス・Section/Row UI を ProfileHub と同等にレイアウト ✅
- **B. 仕様整合性**: users / user_oshi / activity_windows / deals テーブルから実データ取得、未実装機能は **「準備中」chip** で明示 ✅
- **C. レビュー記録**: 評価 / コレクション統計は実装未着手のため `—` 表示。bio 列が users にないため自己紹介編集は省略（必要なら別 iter でカラム追加）✅

---

## イテレーション65.8：コンディション廃止・AW フッター除去・現地モード一体化

### 背景

オーナー要望:
1. グッズ登録時のコンディション入力・編集・表示は不要
2. AW はフッターから削除（独立タブとしては不要）
3. 現地交換モードは AW 別画面に飛ばず、シート内で場所・時間・半径を直接設定

### 変更内容

#### A. コンディション UI を全削除

- `CaptureFlow.tsx` (新規登録 meta ステップ): condition select 削除、レイアウトを「数量のみ」に
- `EditForm.tsx` (/inventory/[id]): 「コンディション」Section 削除、`condition` state と `setCondition` 削除、`updateInventoryItem` への condition 引数渡しを廃止
- DB 列 `goods_inventory.condition` は互換のため残置（NULL 許容）

#### B. BottomNav から AW タブ削除

- `BottomNav.tsx`: items 配列から `{ href: "/aw", label: "AW", ... }` を削除
- 5 タブ → 4 タブ（ホーム / 在庫 / wish / プロフ）
- `NavIcon` の `name` 型から `"aw"` を除外、対応 case 削除
- `/aw` ルート自体は残置（直接 URL アクセス可、ホーム経由で機能は使える）

#### C. LocalModeSheet 全面リファクタ

シート内で **AW 作成 + 場所・時間・半径** を完結。AW 編集画面に飛ばない。

新構成:
- **場所**: 検索バー (Nominatim) + 「現在地」ボタン（GPS）+ 地図 (Leaflet) 表示 + venue text input
- **半径**: スライダー (200〜2000m)、地図上に同期表示
- **時間**: 持続時間 chip (1h/2h/3h/6h/終日) + 「開始時刻も指定する」expand で datetime-local 2 個
- **持参グッズ**: `/inventory/select-carrying` への リンクカード + 解除ボタン

「現在のシート対象 AW (currentAW)」を `localMode.aw_id` から決定し、開いたときに既存値で初期化。
シートを開く度に DB 値で再初期化。

旧 prop `aws: SimpleAW[]` は廃止、`currentAW: SimpleAW | null` に変更。

#### D. applyLocalModeAW server action 追加

`web/src/components/home/actions.ts`:

```ts
applyLocalModeAW({ venue, centerLat, centerLng, radiusM, startAt, endAt })
```

ロジック:
1. バリデーション (venue 1-100 文字、半径 50-5000m、終了 > 開始)
2. `user_local_mode_settings.aw_id` を確認
3. 既存 AW があれば UPDATE、なければ INSERT で作成
4. 失敗時は新規作成にフォールバック
5. settings に aw_id・radius_m・last_lat/lng を upsert

これで「シート → 1 ボタンで AW 作成 + モード ON + 設定保存」が完結。

### 関連ファイル

- `web/src/app/inventory/new/CaptureFlow.tsx`
- `web/src/app/inventory/[id]/EditForm.tsx`
- `web/src/components/home/BottomNav.tsx`
- `web/src/components/home/LocalModeSheet.tsx` (大改修)
- `web/src/components/home/HomeView.tsx`
- `web/src/components/home/actions.ts` (`applyLocalModeAW` 追加)
- `web/src/app/page.tsx` (currentAW を選別して渡す)

### セルフレビュー（CLAUDE.md absolute rule C）

- **A. デザイン整合性**: シート内地図・検索・chip 群は既存 `aw/new/location` と統一トーン ✅
- **B. 仕様整合性**: 既存 `activity_windows` テーブル流用、`user_local_mode_settings.aw_id` で紐付け、別経路で AW を 1 つ作る運用 ✅
- **C. レビュー記録**: condition / aw タブは UI のみ廃止、DB / ルートは残置。AW 一覧画面は `/aw` で引き続きアクセス可能（直接 URL）✅

---

## イテレーション65.7：UI さらに簡素化（priority/フィルタ/モック/トグル削除、定価追加）

### 背景

オーナーから連続要望:
1. wish 一覧の「最優先」「2 番手」フィルタを削除
2. wish と個別募集で「定価」を選べるようにしたい
3. 現地モード持参選択画面の右上に「選択解除」ボタン
4. AW 追加で「イベントから埋める」モードを削除
5. 場所から作るモードの「このエリアの近日イベント」リスト削除
6. 場所から作るモードの「19:00」「19:30」固定 chip 削除
7. 「今すぐ交換」「動けます」トグルも削除

### 変更内容

#### A. Migration: 「定価」を goods_types_master に追加

`supabase/migrations/20260503150000_add_cash_goods_type.sql`:
- `('定価', 'other', 90)` を insert
- 既存 CHECK 制約に合わせて category は `other` を流用（cash 専用 category は追加しない）

#### B. WishView: priority フィルタ chip を削除

- 「最優先」「2 番手」「妥協 OK」フィルタ chip 行を削除
- `filter` state, `counts` useMemo, `filtered` ロジックを simplify
- カード内の priority バッジ表示も削除
- `PRIO_LABEL`, `useState`, `useMemo` import 削除

#### C. CarryingSelectView: 右上に「選択解除」ボタン

- ヘッダー下に説明文 + 右寄せの「選択解除」ボタンを配置
- 選択件数 0 のとき disabled
- 既存の inline「解除」ボタンは「表示全選択」のみ残置

#### D. AWAddEntry: 「イベントから埋める」を削除

- secondary card（🎤 イベントから埋める）の Link を削除
- prefetch から `/aw/new/event` を削除
- チューザーの選択肢は「📍 場所から作る」のみ
- `/aw/new/event` ルート自体は残置（直接 URL アクセスは可能）

#### E. LocationLedForm: 不要 UI を一括削除

- 「このエリアの近日イベント」section（イベントなし + MOCK_EVENTS リスト）→ 削除
- 「有効時間」chip から `19:00`, `19:30` を削除（残る: いま / 15分後 / 30分後）
- 「今すぐ交換」トグル削除
- 「動けます」トグル削除
- handleSubmit を `eventless: true, eventName: undefined` 固定に
- 終了時刻表示の chosenEvent 分岐を削除（常に「N 分間」表示）

未使用の MOCK_EVENTS / selectEvent / chosenEvent / express / mobile state を削除。

### 関連ファイル

- `supabase/migrations/20260503150000_add_cash_goods_type.sql`（新規）
- `web/src/app/wishes/WishView.tsx`
- `web/src/app/inventory/select-carrying/{page.tsx, CarryingSelectView.tsx}`
- `web/src/app/aw/new/AWAddEntry.tsx`
- `web/src/app/aw/new/location/LocationLedForm.tsx`

### セルフレビュー（CLAUDE.md absolute rule C）

- **A. デザイン整合性**: 既存の chip / button スタイルを流用、削除のみで新規追加 UI なし ✅
- **B. 仕様整合性**: 「定価」は goods_types_master の通常エントリとして追加（特殊ロジックなし）。AW の `eventless` 列はそのまま、保存時 true 固定 ✅
- **C. レビュー記録**: `/aw/new/event` ルートは残置（直 URL 可）。AWAddEntry チューザーの選択肢が 1 個だけになり「チューザーである必要性」は薄いが、UI 構造を急変させないため残置 ✅

---

## イテレーション65.6：現地モード簡素化・持参グッズ管理を全面再構成・AW 戻り先実装

### 背景

iter65.5 で wish/listings UI を整理した直後、オーナーから連続フィードバック:

1. 「現地交換モードでマッチ範囲を指定するな（AW のを使え）」
2. 「AW 未設定時に AW 追加 → 戻ってきたら現地モード画面に戻る」
3. 「持参グッズは画像で選ばせろ。グッズ一覧と同じ感じで」
4. 「現地モードの『求めるグッズ』選択は不要、削除」
5. 「マイ在庫から持参グッズを指定する機能は全削除」
6. 「wish 追加時の交換タイプも不要（個別募集の時に設定するから）」

### 変更内容

#### A. LocalModeSheet 大幅簡素化

- 半径スライダー削除（AW 自身の radius_m を使う）
- wish multi-select 削除（指定なし → 自動的に全件対象）
- 持参グッズ multi-select chip も削除し、**「グッズを選ぶ →」リンク**に置換
  → `/inventory/select-carrying?return=local-mode` に飛ぶ
- AW カードに「半径 N」chip を追加（AW 値の可視化）
- AW 追加リンクに `?return=local-mode` を付与

#### B. `/inventory/select-carrying` 持参グッズ選択画面（新規）

- 写真付きパネル（aspect 3/4 カード、in-place チェックマーク）
- 推し / 種別フィルタ chip 行
- 「全選択」「解除」ヘルパー
- 下部固定 CTA「N 件で確定して戻る」 → updateLocalModeSelections → router.push(returnTo)
- HeaderBack の戻るリンクも returnTo を尊重

#### C. AW 作成 → 戻り先伝搬

- `/aw/new/page.tsx`: searchParams.return を読み AWAddEntry に渡す
- `AWAddEntry`: location-led / event-led の Link href にクエリ伝搬、close ボタンも `?return=local-mode` のとき `/?openLocalMode=1` に
- `LocationLedForm` / `EventLedForm`: `useSearchParams` で return を取得、saveAW 後の `router.push` を動的化
- `app/page.tsx`: `?openLocalMode=1` を検知して `HomeView` に `autoOpenLocalSheet={true}` を渡す
- `HomeView`: `useEffect` で URL クエリを history.replaceState で除去（戻るボタン対策）

#### D. マイ在庫の持参グッズ管理を全削除

- `InventoryView`:
  - 外出モードバナー削除
  - 一括 carrying トグル（メニュー）削除
  - `toggleCarryingAll` / `toggleGoingOut` / `toggleItemCarrying` の import 削除
  - `isGoingOut` / `showMoreMenu` state 削除
  - `SubPanel` / `ItemCardWrapper` の `onCarryingToggle` prop 削除
- `ItemCard`:
  - 右上の carrying ドット（タップ領域）削除
  - `onCarryingToggle` prop 削除
- `inventory/page.tsx`:
  - `users.is_going_out` の fetch 削除
  - `InventoryView` から `isGoingOut` prop 削除

DB 列（`goods_inventory.carrying`、`users.is_going_out`、`toggleCarryingAll` server action）は互換のため残置。

#### E. wish から「交換タイプ」削除（オーナー追加要望）

- `WishNewForm`: EXCHANGE_OPTIONS / exchangeType state / chip section 削除
- `WishView`: EXCHANGE_LABEL / chip 表示削除、FLEX_LABEL も同時削除
- saveWishItem 呼び出しでは `exchangeType: "any"` 固定
- 交換タイプは個別募集（listings）作成時のみ設定

### 関連ファイル

- `web/src/components/home/{LocalModeSheet.tsx, HomeView.tsx, actions.ts}`
- `web/src/app/page.tsx`
- `web/src/app/inventory/select-carrying/{page.tsx, CarryingSelectView.tsx}`（新規）
- `web/src/app/aw/new/{page.tsx, AWAddEntry.tsx, location/LocationLedForm.tsx, event/EventLedForm.tsx}`
- `web/src/app/inventory/{InventoryView.tsx, ItemCard.tsx, page.tsx}`
- `web/src/app/wishes/{new/WishNewForm.tsx, WishView.tsx}`
- `notes/18_matching_v2_design.md` §11 追加（マッチング仕様 + 65.6 の決定事項）

### 残課題（iter66+）

- 個別募集マッチングロジック（その譲には listing の wish 群でしかマッチしない）の実装
- 現地モードの実マッチング演算（mock を実データに置換）
- 個別募集が登録された譲アイテムの通常マッチ抑制（要確認）

### セルフレビュー（CLAUDE.md absolute rule C）

- **A. デザイン整合性**: シート構造の変更でフットプリント減（半径・wish 選択 UI 削除）、リンク（「グッズを選ぶ →」）に既存 chip スタイル流用 ✅
- **B. 仕様整合性**: notes/18 §A-4（位置情報以外は記憶）、§A-5（wish 不要）と整合 ✅
- **C. レビュー記録**: DB 列削除はせず（マイグレーション影響大）、UI 廃止のみ。「個別募集の譲は通常マッチから除外するか」は要確認として記録 ✅

---

## イテレーション63〜65：マッチング v2 一気実装（ホームモード切替・個別募集・カレンダー overlay）

### 背景

iter62 までで Phase A（wish.exchange_type）が完了。残りの 3 フェーズ（B/C/D）を一気に実装したいというオーナー指示で、3 つの iter を 1 セッションでまとめて実装。

### iter63 — Phase B: ホーム広域/現地モード切替

#### Migration

`supabase/migrations/20260503120000_add_local_mode_settings.sql`:
- `user_local_mode_settings` テーブル新規（user_id PK、enabled、aw_id、radius_m、selected_carrying_ids[]、selected_wish_ids[]、last_lat/lng）
- updated_at trigger、RLS ポリシー

#### Server actions

`web/src/components/home/actions.ts`（新規）:
- `enableLocalMode({ lat, lng })`: 現地モード ON、GPS で位置上書き
- `disableLocalMode()`: 広域モードに戻す
- `updateLocalModeSelections(...)`: AW・半径・持参・wish 選択の永続化
- `resetLocalModeSelections()`: 持参・wish 一括リセット

#### UI

`web/src/app/page.tsx`:
- 並列 fetch: profile + localMode + AW 一覧 + 携帯候補 + wish 一覧
- HomeView へ props で渡す

`web/src/components/home/HomeView.tsx`（大改修）:
- 上部に **「🌐 広域 / 📍 現地交換」モード pill** 追加
- 現地モード ON 切替時に `navigator.geolocation` で GPS 取得 → enableLocalMode
- 現地モード ON 時: AW + 半径 + 件数のサマリ表示 + 「設定」ボタン
- venue banner は廃止（モード pill とサマリに統合）

`web/src/components/home/LocalModeSheet.tsx`（新規）:
- slide-up シート（aria-modal、body スクロールロック、ESC 等は今回省略）
- AW 選択 list（自分の active な AW から）
- 半径スライダー（200〜2000m）
- 持参グッズ multi-select chip
- wish multi-select chip
- 「選択を全解除」ボタン（一括リセット）
- 「この設定で表示」CTA

`web/src/components/home/MatchCard.tsx`:
- `exchangeType` prop 追加
- `any` 以外のときマッチカード末尾に紫 chip + 注釈表示

### iter64 — Phase C: 個別募集（listings）

#### Migration

`supabase/migrations/20260503130000_add_listings.sql`:
- `listings` テーブル新規（user_id, inventory_id, wish_id, exchange_type, ratio_give/receive, priority, status, note）
- ratio_give/receive は 1〜10 CHECK
- priority は 1〜5 CHECK
- status: `active` / `paused` / `matched` / `closed`
- **整合性 trigger** `validate_listing_refs`:
  - listings.user_id == inventory.user_id == wish.user_id
  - inventory は kind='for_trade'、wish は kind='wanted'
- RLS: 自分の全件可視、他人の active なものは誰でも閲覧

#### Server actions

`web/src/app/listings/actions.ts`（新規）:
- `createListing(...)`: 作成
- `updateListing(...)`: 部分更新（status / 比率 / 優先度 / メモ / exchangeType）
- `deleteListing(id)`

#### 画面

- `web/src/app/listings/page.tsx`（新規）: 個別募集一覧
  - join で inventory + wish を取得して一画面でカード表示
- `web/src/app/listings/ListingsView.tsx`（新規）:
  - status バッジ + 優先度 + 交換タイプ
  - 譲（写真 + メンバー）/ 比率（譲 N ↔ 受 M）/ wish（プレースホルダ）
  - 「一時停止」「再開」「削除」アクション
- `web/src/app/listings/new/page.tsx` + `ListingNewForm.tsx`（新規）:
  - 譲 select（自分の active な譲から、写真付き）
  - wish select（wish の exchange_type を引き継ぐ）
  - 交換タイプ chip
  - 比率 stepper（譲 1〜10 ↔ 受 1〜10）
  - 優先度 5 段階 chip
  - メモ
- `WishView.tsx` のヘッダーに「個別募集 →」リンク追加（動線）

### iter65 — Phase D: CalendarOverlay コンポーネント

#### コンポーネント

`web/src/components/calendar/CalendarOverlay.tsx`（新規）:
- props: myAWs / partnerAWs / days（default 7）/ fromDate / colors
- 横軸: 日付（7 日分、横スクロール可）、縦軸: 時刻（8:00〜24:00）
- 自分の AW を左半分に紫帯、相手を右半分にピンク帯で描画
- 重なる時間帯を黄色（#e0a847）でハイライト + 上下ボーダー
- 凡例（自分 / 相手 / 重なり）

打診画面（C-1 / propose-select）が iter67-68 で実装される時、`<CalendarOverlay myAWs={...} partnerAWs={...} />` で組み込む。

#### proposals テーブルへの列追加は保留

`proposals` テーブルが現状未作成のため、`expose_calendar` / `listing_id` の追加 migration は **打診機能実装時（iter67-68）に同時実行**。本 iter ではコンポーネントだけ用意。

### 関連ファイル

- `supabase/migrations/20260503120000_add_local_mode_settings.sql`
- `supabase/migrations/20260503130000_add_listings.sql`
- `web/src/app/page.tsx`
- `web/src/components/home/{actions.ts, HomeView.tsx, LocalModeSheet.tsx, MatchCard.tsx}`
- `web/src/app/listings/{page.tsx, ListingsView.tsx, actions.ts}`
- `web/src/app/listings/new/{page.tsx, ListingNewForm.tsx}`
- `web/src/components/calendar/CalendarOverlay.tsx`
- `web/src/app/wishes/WishView.tsx`（個別募集リンク追加）

### 残り課題

1. 現地モードのマッチング演算は引き続き mock（実演算は iter66+）
2. CalendarOverlay は単体テスト用のページがまだ無い → iter67-68 の打診画面で組み込む
3. 個別募集のマッチカード表示（match card に listing バッジを出す）も iter66+

### セルフレビュー（CLAUDE.md absolute rule C）

- **A. デザイン整合性**: モード pill / シート / 個別募集カード — 既存 iHub トーン（紫グラデ + 薄紫枠 + chip スタイル）と統一 ✅
- **B. 仕様整合性**: notes/05 / 09 / 18 のスキーマ・ライフサイクルと整合。listings の trigger で参照整合性を強制 ✅
- **C. レビュー記録**: proposals 列追加は打診画面実装時に統合と明記。実マッチング演算は iter66 以降 ✅

---

## イテレーション62：Phase A — wish に exchange_type 追加 + chip 表示

### 背景・問題意識

iter61.11 で確定したマッチング v2 仕様の最初の段階。wish に「同種交換 / 異種交換 / どちらでも」のタグを付けられるようにする。**自己申告タグ**であり、システムはマッチング判定に使わない（notes/18 §A-1）。

### 変更内容

#### A. Migration

**`supabase/migrations/20260503110000_add_exchange_type.sql`**

`goods_inventory` テーブルに `exchange_type` カラム追加:
- 値: `same_kind` / `cross_kind` / `any`（default `any`）
- CHECK 制約付き
- not null（default で埋まる）

**注**: notes/05_data_model.md §3 では `user_wants.exchange_type` と書いていたが、実装上は wish/譲を `goods_inventory` テーブルに統合しているため、`goods_inventory.exchange_type` として実装。`kind='wanted'` の行で wish 用、`kind='for_trade'` では譲側でも使える設計（譲側は iter64 で listings 経由で意味を持つ）。

#### B. Server action

**`web/src/app/wishes/actions.ts`**

- 型定義 `ExchangeType` をエクスポート
- `saveWishItem` に `exchangeType?: ExchangeType` 引数追加（default `any`）
- VALID_EXCHANGE 配列でバリデーション

#### C. wish 新規作成 UI（`WishNewForm.tsx`）

- `EXCHANGE_OPTIONS` 定数（3 件 chip）
- 「交換タイプ」Section 追加（許容範囲の下、メモの上）
- 3 列 grid の chip ボタン: `どちらでも / 同種のみ / 異種のみ`
- アクティブ時は紫グラデ
- 注釈: 「自己申告タグです。マッチング演算では弾かれません。相手の譲るグッズと並べてユーザー自身が判断する用途。」

#### D. wish 一覧表示（`WishView.tsx`）

- `WishItem` 型に `exchangeType: "same_kind" | "cross_kind" | "any"` 追加
- `EXCHANGE_LABEL` 定数追加
- カード右上のチップ群（priority + flexLevel）の右に exchangeType chip を追加
- `any` のときは表示しない（ノイズを避ける）
- 紫透明枠 + 紫文字で他の chip と差別化

#### E. wish 一覧の SELECT 拡張

**`web/src/app/wishes/page.tsx`**

- SELECT 句に `exchange_type` 追加
- `WishRow` 型に列追加
- mapping で `exchangeType: r.exchange_type ?? "any"` を渡す

### 後続フェーズへの繋ぎ

- iter63（Phase B）でホーム画面のマッチカードにも同じ chip を表示する予定（現状ホームは mock data なので未対応）
- iter64（Phase C）で listings にも同じ exchange_type 列を引き継ぐ
- iter65（Phase D）打診の calendar 公開フラグでカードをさらに拡張

### 関連ファイル

- `supabase/migrations/20260503110000_add_exchange_type.sql`（新規）
- `web/src/app/wishes/actions.ts`（saveWishItem 拡張）
- `web/src/app/wishes/new/WishNewForm.tsx`（chip 追加）
- `web/src/app/wishes/page.tsx`（SELECT + mapping）
- `web/src/app/wishes/WishView.tsx`（型 + chip 表示）

### セルフレビュー（CLAUDE.md absolute rule C）

- **A. デザイン整合性**: 既存 chip スタイル（rounded-full, 紫トーン）に揃えた ✅
- **B. 仕様整合性**: notes/18 §A-1（タグのみ・判定なし）と整合。実装上の `goods_inventory` 統合と仕様の `user_wants` の差は本ドキュメントで言及 ✅
- **C. レビュー記録**: ホームのマッチカードに chip 表示は iter63 で同時対応（現状ホーム mock のため）✅

---

## イテレーション61.11：マッチング v2 仕様を主要ドキュメントに反映

### 背景・問題意識

iter61.10 までで在庫まわりの UX が一段落。次の大きな展開（広域/現地マッチ・個別募集・カレンダー公開）に向けて、雑多メモ → notes/18 整理 → オーナー回答 §A の流れで仕様が確定。本 iter は **コード実装には入らず**、既存の主要ドキュメント 5 本に確定事項を反映するだけ。

これがないと iter62〜65 の実装着手時に CLAUDE.md の「着手前精読」ルールが機能しない。

### 変更内容（ドキュメントのみ）

#### A. `notes/10_glossary.md` §E に 11 用語追加

広域マッチ / 現地マッチ / 個別募集 / 同種交換 / 異種交換 / 混合交換 / 交換比率 / カレンダー公開 / カレンダー重ね見 を追加。「同種/異種は自己申告タグのみ」と明記。

#### B. `notes/02_system_requirements.md` F4 マッチング節を v2 に書き換え

- 「2軸構成」 → 「3軸構成（広域 / 現地 / 個別募集）」
- 通知制御は「MVP 範囲外」と明記
- 「同種/異種はタグのみ、システム判定なし」と明記
- 打診時のカレンダー公開（重ね見）を追加

#### C. `notes/05_data_model.md` に 4 つの追加

- `user_wants.exchange_type` 列追加（iter62）
- 新テーブル `listings`（iter64、wish_id 必須・ratio_give/receive・priority）
- 新テーブル `user_local_mode_settings`（iter63、現地モード永続化）
- `proposals.expose_calendar` + `proposals.listing_id` 列追加（iter65）

#### D. `notes/09_state_machines.md` に 3 つの新ライフサイクル追加

- **§8 Listing Lifecycle**: active / paused / matched / closed
- **§9 Calendar Disclosure**: not_disclosed / disclosed / auto_revoked
- **§10 Local Mode**: global / local / local_reset
- 旧 §8 付録は §11 にリネーム

#### E. `notes/11_screen_inventory.md` に 9 画面追加

- C-1 ホームに 4 行（モード pill / 現地 setup / 現地サマリ / カードタグ）
- C-3 ウィッシュに 3 行（exchange tag chip / 個別募集作成 / 個別募集一覧）
- B-2 打診に 2 行（カレンダー公開トグル / カレンダー overlay UI）

### 関連ファイル

- `notes/02_system_requirements.md`
- `notes/05_data_model.md`
- `notes/09_state_machines.md`
- `notes/10_glossary.md`
- `notes/11_screen_inventory.md`
- `notes/18_matching_v2_design.md`（前 iter で作成）

### 次の実装計画

| iter | 内容 | 範囲 |
|---|---|---|
| iter62 | Phase A: `user_wants.exchange_type` 追加 + chip 表示 | 小（migration + UI 1 箇所） |
| iter63 | Phase B: ホームモード切替 + 現地設定 + 一括リセット | 大（home-v2 大改修 + 新テーブル） |
| iter64 | Phase C: 個別募集（listings）UI + マッチング統合 | 大（新画面 2 つ + ロジック） |
| iter65 | Phase D: 打診カレンダー公開 + overlay UI | 中（proposals 列 + overlay コンポーネント） |
| iter66 | 検索＋フィルタ（後送り） | 中（元 iter62） |

### セルフレビュー（CLAUDE.md absolute rule C）

- **A. デザイン整合性**: 該当なし（コード変更なし）
- **B. 仕様整合性**: 5 本のドキュメント間で用語・テーブル名・列名が整合 ✅
- **C. レビュー記録**: 18 → 02/05/09/10/11 への反映漏れなし。「listing」は UI 表記から除外して「個別募集」に統一 ✅

---

## イテレーション61.10：審査中メンバーを在庫の選択肢に + シリーズ廃止

### 背景・問題意識

ユーザー要望:
1. 「グッズ登録の際、追加リクエストしたものも選べる選択肢に含めてほしい」
2. 「グッズの編集画面で『シリーズ』は削除してください。もう使わないので」

iter61.9 で追加リクエスト機能は付けたが、リクエスト中のメンバーは select に出てこず、登録すると `character_id = null` のまま保存され、後で承認されても紐付かなかった。
データモデルとして `goods_inventory.character_request_id` を追加し、user_oshi と同じ「承認時に自動置換」の仕組みを採用。

### 変更内容

#### A. Migration: `goods_inventory.character_request_id` 追加

**`supabase/migrations/20260503100000_add_inventory_character_request.sql`**

- `character_request_id uuid references character_requests(id) on delete set null`
- `character_id is null or character_request_id is null` の XOR 制約（同時に持たない）
- `idx_goods_inventory_character_request` インデックス
- `handle_character_request_approval()` trigger を拡張:
  - 承認時 (`status: pending → merged/approved`) に `goods_inventory.character_request_id → character_id` 置換
  - 却下時 (`pending → rejected`) は `character_request_id` を null にしてメンバー指定なしに戻す（user_oshi のように行ごと削除はしない）

#### B. 新規登録 (`CaptureFlow`) で pending メンバーを選択肢に

**`web/src/app/inventory/new/page.tsx`**

`character_requests` を並列 fetch（自分の `pending` ステータスのみ、推しグループに紐づくもの）し、CaptureFlow に `pendingMembers` prop で渡す。

**`web/src/app/inventory/new/CaptureFlow.tsx`**

- `CropMeta.characterId` の値を文字列のまま prefix encoding で持つ:
  - `""` = 指定なし
  - `"<UUID>"` = `characters_master.id`
  - `"req:<UUID>"` = `character_requests.id`（審査中）
- select に `<optgroup label="審査中">` で pending を表示（"○○（審査中）"）
- meta インラインリクエストフォーム送信成功時、`pendingMembers` ローカル state にも即追加 → select に瞬時に反映
- 保存時に `splitCharacterValue` で分岐し、`characterId` / `characterRequestId` を別々に渡す

**`web/src/app/inventory/actions.ts`**

`saveBatchInventoryItems` と `updateInventoryItem` に `characterRequestId?: string | null` 引数追加。XOR 制約に従い、片方しか入らないように保存。

#### C. 編集画面 (`/inventory/[id]`) でも pending サポート

**`web/src/app/inventory/[id]/page.tsx`**

- SELECT に `character_request_id` を追加、`character_requests` も並列 fetch
- `pendingMembers` prop で EditForm に渡す

**`web/src/app/inventory/[id]/EditForm.tsx`**

- `characterId` / `characterRequestId` を pack/split して `characterValue` 単一 state で管理
- chip UI で pending メンバーを破線枠 + 「審査中」バッジ付きで表示
- 「運営の承認後、自動でメンバーマスタに切り替わります」のヒント表示
- 保存時に分割して `updateInventoryItem` に渡す

#### D. 一覧画面で pending 名を解決

**`web/src/app/inventory/page.tsx`**

- SELECT に `character_request:character_requests(requested_name, status)` を join
- `memberName` の解決順を `character → character_request → group` に
- 「審査中」フラグ `isPending` を渡す

**`web/src/app/inventory/ItemCard.tsx`**

- `isPending` のとき、メンバー名プレートの右に紫の「審査中」バッジを併置

#### E. 「シリーズ」を UI から完全廃止

- `EditForm.tsx`: 「シリーズ」セクションを削除
- `page.tsx` (inventory list): SELECT から `series` を抜き、`series: null` 固定で渡す（ItemCard の表示は `{item.series && ...}` で条件付きなので何も出ない）
- `actions.ts` の DB カラム書き込み (`series`) は互換のため残置（既存データ非破壊、将来的に migration で drop 予定）
- CaptureFlow の `CropMeta.series` も互換のため残置（送信は常に空文字 → null）

### 動線まとめ

1. 在庫登録 → meta ステップ → メンバー select に審査中グループも出る
2. 「+ メンバー追加リクエスト」で送信すると即その場で select 候補に追加 → そのまま選択可能
3. 「審査中」のまま登録 → 一覧カードに「審査中」バッジ表示
4. 運営が承認 → trigger が自動で `character_id` に置換 → カードのバッジが消えて正規メンバー名に

### 関連ファイル

- `supabase/migrations/20260503100000_add_inventory_character_request.sql`（新規）
- `web/src/app/inventory/page.tsx`（pending join、シリーズ非表示）
- `web/src/app/inventory/ItemCard.tsx`（審査中バッジ）
- `web/src/app/inventory/[id]/page.tsx`（pending fetch）
- `web/src/app/inventory/[id]/EditForm.tsx`（pending サポート、シリーズ削除、auto-title）
- `web/src/app/inventory/new/page.tsx`（pending fetch）
- `web/src/app/inventory/new/CaptureFlow.tsx`（select に optgroup）
- `web/src/app/inventory/actions.ts`（characterRequestId 引数）

### セルフレビュー

- **A. デザイン整合性**: 審査中バッジは既存 onboarding の紫トーンと整合 ✅
- **B. 仕様整合性**: trigger で自動置換するので承認後の手動再選択は不要 ✅
- **C. レビュー記録**: シリーズは UI 廃止のみ、DB カラムは互換のため残置 ✅

---

## イテレーション61.9：在庫まわり 5 つの UX 改善

### 背景・問題意識

ユーザーから 4 つの要望:
1. 「グッズ一覧で押すと『キープに/譲渡履歴へ』が出てくる選択肢の中に『編集する』を追加してほしい（編集画面に直接飛ぶ動線ではなく、既存メニュー経由）」
2. 「編集画面で写真を撮り直せるようにしてほしい」
3. 「在庫登録で、タイトルは基本的に入力不要・非表示。グッズ種別『その他』選択時のみ表示」
4. 「メンバーが不足していたら、登録画面でも追加リクエストを入れられるように」
5. 「写真は1枚も取らなくても登録できるように」

### 変更内容

#### A. 既存メニューに「編集する」追加

**`web/src/app/inventory/ItemCard.tsx`**

- iter61.8 で `<Link>` 化していたのを元の `<div>` に戻す（既存の `ItemCardWrapper` がメニューを出す方式に戻す）
- carrying トグルは `e.stopPropagation()` のみ（preventDefault は不要）

**`web/src/app/inventory/InventoryView.tsx`**

`ItemCardWrapper` のメニューに 4 番目のアクション「編集する」追加:
- 紫グラデの prominent ボタン（`/inventory/[id]` への Link）
- 「譲る候補に / キープに / 譲渡履歴へ / 編集する / 閉じる」の順

#### B. 編集画面の写真撮り直し

**`web/src/app/inventory/actions.ts`**

`updateInventoryItem` に `photoUrls?: string[]` 引数追加。指定された場合は `photo_urls` 配列を完全置換。

**`web/src/app/inventory/[id]/EditForm.tsx`**

- 写真エリアを動的に再構築:
  - `<img>` フルブリード or「写真なし」プレースホルダ
  - オーバーレイ位置に「📷 撮り直す / 差し替え」ボタン
  - hidden file input + `capture="environment"`（カメラ起動）
- `handlePhotoChange`:
  - 画像タイプ / 10MB バリデーション
  - Supabase Storage `goods-photos` bucket に `{userId}/{ts}_{rand}.{ext}` で upload
  - `getPublicUrl` で URL 取得 → photoUrls の先頭に置換
  - 旧画像は best-effort で `remove([oldPath])`（ストレージ容量節約）
- `extractStoragePath` ヘルパで public URL から bucket 内 path を抽出

#### C. タイトルを「その他」選択時のみ表示

**`web/src/app/inventory/new/CaptureFlow.tsx`**

- meta ステップで `selectedGoodsType?.name === "その他"` の時のみタイトル input をレンダ
- それ以外は title state は空のまま、`handleBatchSave` 内で「メンバー名 + 種別名」を自動生成（既存ロジック）
- placeholder も「タイトル（その他なので入力）」に変更

#### D. 登録時のメンバー追加リクエスト動線

**`web/src/app/inventory/actions.ts`**

新規 server action `requestCharacterFromInventory(groupId, name, note?)`:
- `character_requests` テーブルに insert（既存スキーマと整合: `user_id`, `group_id`, `requested_name`, `note`）
- 返り値で `id` を返す

**`web/src/app/inventory/new/CaptureFlow.tsx`**

- meta ステップ上部に「+ メンバーが見つからない場合は追加リクエスト」ボタン
- クリック → inline form 展開（名前 + メモ）
- 送信 → `requestCharacterFromInventory` 呼び出し → 成功で local state `requestedNames` に追加
- 「送信済リクエスト」セクションに `審査中` バッジで表示
- 注意: リクエスト中の character は `goods_inventory.character_id` には紐付かない（FK 制約）。承認後に編集画面で再選択する運用

#### E. 写真ナシでも登録可能

**`web/src/app/inventory/actions.ts`**

`saveBatchInventoryItems` の各 item の `photoUrl` を任意化:
- 未指定なら `photo_urls: []` で保存（DB スキーマは default '{}' なので OK）

**`web/src/app/inventory/new/CaptureFlow.tsx`**

- shoot ステップに「写真なしで登録する →」リンク追加
- `skipPhotoToMeta()` で cropMetas に空の 1 件を初期化、step="meta" へ
- `noPhoto` フラグ（`crops.length === 0`）で UI 分岐:
  - meta タイトルを「登録内容を設定」に
  - サムネ表示・削除ボタンを非表示
  - 戻るボタン先を `crop` → `shoot` に
  - CTA 文言を「1 件登録（写真なし）」に
- `handleBatchSave` の noPhoto 分岐: cropMetas[0] のみで 1 件、photoUrl なしで登録

### 関連ファイル

- `web/src/app/inventory/ItemCard.tsx`（Link 戻し）
- `web/src/app/inventory/InventoryView.tsx`（メニューに編集追加）
- `web/src/app/inventory/[id]/EditForm.tsx`（写真撮り直し）
- `web/src/app/inventory/new/CaptureFlow.tsx`（C/D/E 一括）
- `web/src/app/inventory/actions.ts`（`updateInventoryItem` 拡張、`requestCharacterFromInventory` 新規、`saveBatchInventoryItems.photoUrl` 任意化）

### セルフレビュー

- **A. デザイン整合性**: 既存メニューの styling（黒半透明 overlay）に揃える、編集ボタンだけ紫グラデで differentiate ✅
- **B. 仕様整合性**: character_requests テーブルのカラム名（`user_id`, `requested_name`）を既存 onboarding actions と整合 ✅
- **C. レビュー記録**: リクエスト中キャラは FK 制約で紐付け不可 → 編集画面で承認後に再選択する運用と明記。タイトル自動生成ロジックは既存を維持 ✅

---

## イテレーション61.8：在庫アイテムの編集 / 削除画面（/inventory/[id]）

### 背景・問題意識

ユーザーから「在庫を削除できるようにしてほしい。あと編集も。編集画面に飛んで、削除できるのがいいかな」。
現状: 在庫一覧画面にカードがあるだけで、削除や編集の動線がなかった（`updateInventoryStatus` と `deleteInventoryItem` の server action は既存だが UI 未配線）。

### 変更内容

#### `web/src/app/inventory/actions.ts`

`updateInventoryItem` server action 追加:
- 編集対象: group / character / goodsType / title / series / description / condition / quantity
- バリデーション: title 1〜100、quantity 1〜999、condition は VALID_CONDITIONS のいずれか
- `revalidatePath("/inventory")` + `revalidatePath("/inventory/[id]")`

`deleteInventoryItem` は既存。

#### `web/src/app/inventory/[id]/page.tsx`（新規）

- dynamic route `/inventory/[id]`
- 並列取得: item 本体 + user_oshi + goods_types + characters
- アイテムが「現在の推し」に紐付かないグループに属している場合も groups_master から救済取得
- 該当グループに属するキャラだけフィルタしてフォームに渡す
- HeaderBack で `/inventory` への戻りリンク

#### `web/src/app/inventory/[id]/EditForm.tsx`（新規）

フィールド構成（モックアップ b-inventory のラベル UI 流用）:
- 写真表示（先頭 URL のみ、フルブリード）
- グループ（推しから選択）
- メンバー / キャラ（任意、グループ依存）
- グッズ種別（chip）
- タイトル（必須）
- シリーズ（任意）
- コンディション（chip、5 段階 + 指定なし）
- 数量（−/＋ + 直接入力、1〜999）
- 説明 / メモ（500 文字）
- ステータス（active / keep / traded を 3 列 grid）

下部 CTA:
- `PrimaryButton`「変更を保存」（紫グラデ）
- 区切り線の下に赤い「この在庫を削除」ボタン（confirm 必須）

#### `web/src/app/inventory/ItemCard.tsx`

- 外側 `<div>` を `<Link href="/inventory/[id]">` に置換
- カード本体タップで編集画面へ
- 右上の carrying トグルは `e.preventDefault() + e.stopPropagation()` で Link への伝搬を止める

### 動線

1. `/inventory` の在庫グリッドでカードタップ
2. `/inventory/[id]` 編集画面に遷移
3. フィールド変更 → 「変更を保存」 → `/inventory` へ戻る
4. 削除 → confirm → `deleteInventoryItem` → `/inventory` へ戻る
5. carrying ドット（右上）はカード上で個別操作（編集画面に行かない）

### 関連ファイル

- `web/src/app/inventory/[id]/page.tsx`（新規）
- `web/src/app/inventory/[id]/EditForm.tsx`（新規）
- `web/src/app/inventory/actions.ts`（updateInventoryItem 追加）
- `web/src/app/inventory/ItemCard.tsx`（Link 化、ストッププロパゲーション）

### セルフレビュー

- **A. デザイン整合性**: 編集フォームは AWNewForm / WishNewForm と同じ Section ラベル UI に揃えた。削除ボタンは赤系で他と差別化 ✅
- **B. 仕様整合性**: VALID_CONDITIONS / quantity 範囲 / status enum を新規 / 既存 action と整合 ✅
- **C. レビュー記録**: 写真の差し替えは未実装（次 iter で）、carrying トグルの伝搬制御を明示的に preventDefault で対応 ✅

---

## イテレーション61.7：AW slide-up シート + 「今すぐ開始」+ 在庫一覧で写真表示

### 背景・問題意識

ユーザーから 3 つの指摘:
1. 「『AWを追加』を押すと別画面に飛ぶけど、推した瞬間にしたからニュッと出てくる感じにしてほしい」
2. 「AWを今のものに有効にしてみたいんだけど、どうすれば？もしかしてその動線がない？」
3. 「グッズ登録で、登録したものが在庫一覧に乗ると思うけど、ちゃんと画像が表示されるようにしてほしい」

### 変更内容

#### A. AW チューザーを slide-up ボトムシート化

**`web/src/app/aw/AWView.tsx`**

- 「AWを追加」ボタンを `<Link href="/aw/new">` から `<button onClick={setIsAddOpen(true)}>` に変更
- `AWAddSheet` コンポーネントを内部に追加（AWAddEntry の内容を再描画）
- アニメーション:
  - backdrop: opacity 0 → 1（200ms）
  - sheet: translate-y-full → translate-y-0（300ms cubic-bezier(0.32, 0.72, 0, 1)）
- マウント制御: open 時即マウント、close 時 350ms 待ってアンマウント
- ESC キーで閉じる、body スクロールロック、aria-modal/role=dialog で a11y 対応
- シート内の「場所から作る」「イベントから埋める」は引き続き Link で別ルートへ遷移
- `/aw/new` ルート自体は残す（直接 URL アクセス時のフォールバック）

#### B. 「今すぐ開始」アクション

**`web/src/app/aw/actions.ts`**

`activateAWNow(id)` server action 追加:
- 元 AW の duration（end_at - start_at）を計算
- 安全範囲外（5 分未満 or 24h 超）は強制的に 2h
- 現在時刻を 1 分単位に丸めた値を新 start_at に
- new_end = new_start + duration
- status を `'enabled'` にもセット（disabled だった場合も復帰）

**`web/src/app/aw/AWView.tsx`**

SCHEDULED（enabled but not yet started）の AW カードに「今すぐ開始」ボタン追加:
- 紫グラデ背景の prominent ボタン
- クリックで `activateAWNow` → router.refresh() → 該当 AW が ACTIVE NOW セクションに移動
- 既存の「一時無効」「再有効化」ボタンは維持

#### C. 在庫一覧で写真を表示

**`web/src/app/inventory/page.tsx`**

- SELECT に `photo_urls` を追加（`text[]` カラム、すでに DB にあるが取得していなかった）
- `InventoryRow` 型に `photo_urls` 追加
- map 時に `photoUrl: r.photo_urls[0] ?? null` をセット

**`web/src/app/inventory/ItemCard.tsx`**

- `ItemCardData` に `photoUrl?: string | null` 追加
- 写真がある時:
  - 背景を `#3a324a`（dark）に
  - `<img>` でフルブリード `object-cover` 表示
  - メンバー名プレートを白文字 + 黒 backdrop-blur に
  - イニシャル文字（中央大）を非表示
- 写真がない時: 従来通りの縞模様カード

(Storage バケットは iter59 の migration で `public: true` 設定済、SELECT policy も「Anyone can view」なので URL アクセス OK)

### 確認方法

1. `/aw` で「AWを追加」 → シートが下からスッと出る
2. 「キャンセル」or backdrop タップ → スッと下に消える
3. SCHEDULED の AW カード → 「今すぐ開始」 → ACTIVE NOW に移動
4. `/inventory/new` で写真撮影 → 保存
5. `/inventory` 一覧 → 撮影した写真がカード全面に表示される

### 関連ファイル

- `web/src/app/aw/AWView.tsx`（再実装、AWAddSheet 追加）
- `web/src/app/aw/actions.ts`（activateAWNow 追加）
- `web/src/app/inventory/page.tsx`（photo_urls fetch）
- `web/src/app/inventory/ItemCard.tsx`（photo 表示）

### セルフレビュー（CLAUDE.md absolute rule C）

- **A. デザイン整合性**: AWAddEntry の内容は維持しつつアニメーションだけ追加。「今すぐ開始」は紫グラデ統一 ✅
- **B. 仕様整合性**: status 'enabled'/'disabled' 整合、duration 維持ロジック ✅
- **C. レビュー記録**: シートと旧 `/aw/new` ルート両立、安全範囲外 duration の fallback を実装 ✅

---

## イテレーション61.5：AW 編集に本物の地図を統合（Leaflet + OpenStreetMap + Geolocation + Nominatim）

### 背景・問題意識

iter61 で AW 編集 3 画面を実装したが、地図部分は SVG プレースホルダだった。ユーザーから「めっちゃ側だけつくってるやん。位置から指定する時、ちゃんとリアルの地図を呼び出す感じにしてよ。位置情報をユーザーから取得してさ。」と指摘され、本物の地図機能を実装。

### 技術選定

- **地図ライブラリ**: Leaflet + OpenStreetMap タイル
  - 無料・APIキー不要・MVP 向き（Mapbox は無料枠あるが将来課金リスク）
  - `react-leaflet` で React 統合
- **ジオコーディング**: Nominatim (OSM 公式)
  - 無料・APIキー不要
  - 1 req/sec 制限・User-Agent 必須
  - サーバー API ルート (`/api/geocode`) で proxy（CORS / User-Agent 付与）
- **位置情報取得**: Browser Geolocation API（標準）

### 変更内容

#### `web/src/app/api/geocode/route.ts`（新規）

- Nominatim プロキシ API
- `?q=横浜アリーナ` → forward geocoding
- `?lat=35.5&lon=139.7` → reverse geocoding
- User-Agent: `iHub/0.1 (https://ihub.tokyo; support@ihub.tokyo)`
- `next: { revalidate: 3600 }` で 1 時間キャッシュ

#### `web/src/components/map/MapPicker.tsx`（新規）

- `react-leaflet` ベースの client-only コンポーネント
- OSM タイル + radius circle (lavender) + ドラッグ可能ピン (DivIcon)
- iHub ブランドカラー (#a695d8) のカスタムピン
- center 変更を `onCenterChange(lat, lng)` で通知
- 地図クリック / ピンドラッグで center 更新

#### `web/src/app/aw/new/location/LocationLedForm.tsx`（再実装）

- SVG プレースホルダを完全廃棄、`MapPicker` を組み込み
- 初回ロード時に `navigator.geolocation.getCurrentPosition` で現在地取得（fallback: 渋谷駅）
- 検索バーは Nominatim API 経由で 350ms debounce → 結果ドロップダウン表示
- 結果クリックで地図中心移動 + 会場名自動入力
- ピン移動時に reverse geocoding で会場名候補を自動入力（ユーザー編集後は上書きしない）
- 「現在地を使う」ボタンで再度 Geolocation 呼び出し
- Geolocation エラー（permission denied 等）はトーストで表示

#### `web/src/app/aw/new/event/EventLedForm.tsx`

- SVG MiniMap を `MapPicker` に置き換え（180px 高さ）
- イベント選択時に Nominatim でその会場座標を自動取得
- 「現在地を使う」を機能化
- ピンドラッグ可能（同 venue 内の細かい場所調整用）

#### `web/src/app/aw/actions.ts`

- `saveAW` に `centerLat` / `centerLng` 引数追加
- バリデーション: 両方揃って範囲内（-90〜90, -180〜180）の時のみ保存
- `activity_windows.center_lat / center_lng` カラムに格納（既存 schema、iter61 マイグレーション）

#### `web/package.json`

- `leaflet@^1.9.4`, `react-leaflet@^5.0.0`, `@types/leaflet@^1.9.21` を追加

### 動作フロー

1. `/aw/new/location` 開く → 現在地取得トライ（fallback 渋谷駅）
2. 地図表示・ピン位置の reverse geocoding で会場名自動入力
3. ユーザーが検索 → Nominatim 結果リスト → クリックで pin 移動
4. ピンドラッグで微調整可
5. 半径スライダーで radius circle がリアルタイム更新
6. 「有効化」で `saveAW({centerLat, centerLng, ...})` 実行 → DB に座標保存

### 影響範囲

- `/aw/new/location`: 完全に本物地図に
- `/aw/new/event`: MiniMap 部分のみ本物地図に
- `/api/geocode`: 新規 API ルート
- `activity_windows.center_lat/lng` に座標が保存されるので、iter63（マッチングロジック）で時空交差計算に直接利用可能になった

### Nominatim 利用ポリシー遵守

- `User-Agent` ヘッダ必須 → サーバー側で付与
- 1 req/sec 上限 → ブラウザ debounce 350ms + サーバーキャッシュ 1h
- 商用利用増加時は別ホスト（Stadia Maps / MapTiler）への切替を検討

### 確認方法

1. `npm run dev` で http://localhost:3000/aw/new/location
2. 初回: ブラウザの位置情報ダイアログ → 許可 / 拒否どちらでも fallback
3. 検索: 「横浜アリーナ」入力 → ドロップダウン → クリックで pin 移動
4. ピンドラッグ: venue 名が reverse geocoding で更新
5. 「有効化」→ DB 確認: `select venue, center_lat, center_lng from activity_windows;`

### 関連ファイル

- `web/src/app/api/geocode/route.ts`（新規）
- `web/src/components/map/MapPicker.tsx`（新規）
- `web/src/app/aw/new/location/LocationLedForm.tsx`（再実装）
- `web/src/app/aw/new/event/EventLedForm.tsx`（部分更新）
- `web/src/app/aw/actions.ts`（saveAW 拡張）
- `web/package.json`（依存追加）

### セルフレビュー（CLAUDE.md absolute rule C 適用）

- **A. デザイン整合性**: モックアップは静的 SVG 地図、本実装は Leaflet+OSM。ピンの色・形状・shadow はモックアップに合わせる ✅
- **B. 仕様整合性**: `activity_windows` の `center_lat / center_lng` カラムを利用、saveAW のバリデーション追加 ✅
- **C. レビュー記録**: Nominatim 制限 / 商用ホスト切替の note を上記に記録 ✅

---

## イテレーション61：AW（合流可能枠）画面 — 一覧 + 編集 3 画面 ピクセル準拠実装

### 背景・問題意識

iter58〜60 で「ホーム / 在庫 / wish」を実装後、ユーザーから「全然デザイン案通りじゃないんだけど。ちゃんとデザインをみて、あと仕様？ちゃんと前に話して整理してルカらそれ通りにして」という強いフィードバック。CLAUDE.md に **「画面実装時の絶対ルール」** を追加し、(1) 着手前にデザイン精読 (2) 共通ルール遵守 (3) 着手後セルフレビュー — を必ず踏むように。

iter61 は AW 編集 3 画面（list / new chooser / new/location / new/event）をモックアップ aw-edit.jsx 完全準拠で再実装する iter。

### 変更内容

#### `web/src/app/aw/AWView.tsx`（一覧画面・iter61 前半 d50a29a で完了済）

- AWListScreen (line 19-114) 完全準拠で再実装
- ACTIVE NOW（pulse dot + LIVE badge）/ SCHEDULED / 自動アーカイブ の 3 セクション
- AWCard: gradient bg + counter row（完全マッチ 14 / 打診中 2 / クローズまで N分）+ 3-action row（一時無効・編集・X告知）
- 不足していた `hand` icon 追加（meta rows）
- shadow-[0_8px_20px_rgba(166,149,216,0.15)] / text-[15.5px] / tracking-[0.3px] などピクセル値完全一致

#### `web/src/app/aw/new/page.tsx` + `AWAddEntry.tsx`（チューザー）

- モックアップ AWAddEntry (1078-1237) 準拠
- 暗転バックドロップ + ボトムシート（rounded-t-22 / shadow 0 -10px 40px）
- 「📍 場所から作る」（おすすめバッジ・gradient bg・1.5px lavender border）→ /aw/new/location
- 「🎤 イベントから埋める」（ショートカットバッジ・白bg）→ /aw/new/event
- 「キャンセル」→ /aw

#### `web/src/app/aw/new/location/page.tsx` + `LocationLedForm.tsx`

- モックアップ AWEditLocationLed (693-998) 準拠
- 上部 360px の地図プレースホルダ（SVG ハッチ + 道路 + 半径200円 + ピン + 半径バブル + キャッシュバッジ）
- 検索バーは実 input（venue 入力）として動作
- ボトムシート: prominent radius slider（22px gradient bg）+ events nearby（イベントなしデフォルト + mock 3件）+ 有効時間 chips + 終了時刻ストリップ + 詳細編集（datetime-local 拡張）+ Express/動けますトグル
- CTA「有効化 — 時空交差を再計算」

#### `web/src/app/aw/new/event/page.tsx` + `EventLedForm.tsx`

- モックアップ AWEditEventLed (276-571) 準拠
- SheetHeader（× / 登録中 / クリア + タイトル）
- イベント picker: 選択済みは LUMENA-style カード（4/27 dateChip + マスタ登録済 pill + 変更 button）、未選択時は mock 3件 + 自由入力
- 位置と範囲: MiniMap + 半径スライダー
- 時間ウィンドウ: タブ（プリセット / 手動調整 / いま）+ 4 つのプリセットカード（開演前後30分推奨など、選択イベントから動的計算）
- 現地交換の希望: マルチ選択チェックボックス 4 種
- 運用オプション: Express toggle + クローズ時間 chips
- CTA「X告知も」+「保存して有効化」

### 影響範囲

- `/aw` 一覧画面のすべて
- `/aw/new` チューザー（旧シンプル form を完全置換）
- `/aw/new/location`, `/aw/new/event` 新規ルート
- `BottomNav.tsx` の AW タブ → `/aw` で正しく動作（iter60 で配線済）
- データ保存: 既存 `saveAW` server action 利用（venue / event_name / eventless / start_at / end_at / radius_m / note）

### 既知の差分（mockup と機能の差）

| 項目 | mockup | 実装 | 理由 |
|---|---|---|---|
| イベント master | 4/27 LUMENA など固定値 | mock 3件 + 自由入力フォールバック | events table 未実装、後続 iter で master 化 |
| 地図 | 静的 SVG | 静的 SVG（同じ） | OSM/Mapbox 連携は後続 |
| 「現在地を使う」「ピン調整」 | 動作 | UI のみ | Geolocation API 連携は後続 |
| 「X告知も」 | 動作 | UI のみ | X (Twitter) 連携は後続 |
| 「詳細編集」 | なし | datetime-local 2 個追加 | chips のみだと細かな時間調整不可、機能性最優先 |

### 確認方法

1. `npm run dev` で http://localhost:3000/aw を開く
2. 右上「AWを追加」→ チューザー（暗転 + ボトムシート）
3. 「📍 場所から作る」→ 地図 + ボトムシート → 「有効化」で /aw に戻る
4. 「🎤 イベントから埋める」→ イベント picker + 位置 + 時間 + 希望 + オプション → 「保存して有効化」

### 関連ファイル

- `iHub/aw-edit.jsx`（モックアップ）
- `web/src/app/aw/AWView.tsx`
- `web/src/app/aw/new/{page.tsx, AWAddEntry.tsx}`
- `web/src/app/aw/new/location/{page.tsx, LocationLedForm.tsx}`
- `web/src/app/aw/new/event/{page.tsx, EventLedForm.tsx}`
- `web/src/app/aw/actions.ts`（saveAW）
- `supabase/migrations/20260502120000_add_activity_windows.sql`

### セルフレビュー（CLAUDE.md absolute rule C 適用）

- **A. デザイン整合性**: モックアップの 3 関数すべて構造・カラー・ピクセル値合致を逐一確認 ✅
- **B. 仕様整合性**: activity_windows table のすべての列を埋める。enabled status 初期値で公開。RLS は既存 ✅
- **C. レビュー記録**: 既知差分を上記表に明記。後続 iter で解消する項目を todo 化済 ✅

---

## イテレーション57：Phase 0b-3 — Onboarding 5 画面 + 推し/メンバー追加リクエスト共有 + 速度最適化

### 達成事項

iter56 で認証系 UI を仕上げた直後、Onboarding（プロフィール設定）の 5 画面を一気に実装。同時に「マスタに無い推し / メンバーをユーザーが追加リクエストできる」仕組みを構築し、**運営承認時には全選択ユーザーに自動反映される設計**を採用。並行して Vercel リージョン変更・Server Action 高速化・ブランドカラー Tailwind 統合などの基盤強化も実施。**Phase 0b 完全完了**。

### サブセクション

#### A. UI / UX 補完（iter56 の延長）

1. **ボタン挙動 4 種統合**（PrimaryButton, secondaryBaseClass）
   - active:scale-[0.97]（押下時にキュッと縮小）
   - Ripple エフェクト（クリック位置から白い円が広がる）
   - pending 中スピナー（テキスト横で animate-spin）
   - hover:brightness-105 / disabled:opacity-50
2. **ブランドカラーを Tailwind theme に統合**
   - `globals.css` の `@theme`（inline でない）に `--color-ihub-lavender/sky/pink/warn/ok` を追加
   - 全コンポーネントで `bg-ihub-lavender` 等が使えるように
   - opacity 修飾子（`/35` 等）も `color-mix()` で動作
3. **ボタン色合い・サイズをモックアップ完全一致**
   - 旧：`bg-gradient-to-r from-purple-400 to-pink-300`（2色 90deg） → 誤
   - 新：`bg-[linear-gradient(135deg,#a695d8,#a8d4e6)]`（2色 135deg）← モックアップ AOPrimaryButton 準拠
   - rounded-[14px] / py-[14px] / text-sm / shadow-[0_4px_14px_rgba(166,149,216,0.33)]
4. **IHubLogo（モックアップ AOLogo 準拠）**
   - 角丸正方形（borderRadius: size×0.32）
   - 「iH」テキスト + Inter Tight 800
   - 2色グラデ（lavender → sky）
   - boxShadow: `0 8px 24px rgba(166,149,216,0.25)`
5. **全画面の背景グラデを再現**
   - Welcome / EmailConfirmed: `linear-gradient(180deg, #a695d822 0%, #a8d4e614 45%, #ffffff 100%)`
   - Signup / Login / VerifyEmail / PasswordReset: `#fbf9fc` 単色
6. **未認証ユーザーの再 signup 対応（iter56 続き）**
   - signup actions で「既存メアド + 未認証」の場合 admin API で削除 → 再登録可

#### B. 速度最適化

1. **Vercel region: `iad1` → `hnd1`（東京）**
   - vercel.json に `"regions": ["hnd1"]`
   - Supabase（東京）との RTT が 200-300ms → 5-10ms に
   - Server Action 全体が大幅高速化
2. **Server Action から redirect を排除**
   - 旧：`redirect("/onboarding/oshi")` → サーバーで次画面 full render してから返す（重い）
   - 新：`return undefined` だけ → Client 側で `router.push()` + `router.prefetch()`
   - 体感 1〜2 秒 → 200〜400ms
3. **revalidatePath で server invalidate**
   - 各 action 末尾で `revalidatePath("/path")`
   - `router.refresh()` 不要に
4. **DB クエリの並列化（Promise.all）**
   - `/onboarding/oshi`、`/onboarding/members`、`/onboarding/done` で 3〜4 クエリを並列実行
   - 4×RTT → 1×RTT

#### C. Onboarding 5 画面（モックアップ AOOnboard\*）

1. **`/onboarding/gender`** （1/4 性別選択）
   - 4 選択肢：女性 / 男性 / その他 / 回答しない
   - users.gender 更新 + account_status='onboarding' に遷移
2. **`/onboarding/oshi`** （2/4 推し選択）
   - groups_master + genres_master をジャンル横断で取得
   - ジャンルチップ（すべて / K-POP / 邦アイ / 2.5次元 / アニメ / ゲーム）
   - 検索（name + aliases）
   - 複数選択可
   - 「人気」バッジ（各ジャンル display_order 上位5件）
3. **`/onboarding/members`** （3/4 メンバー選択）
   - ユーザーの推しグループごとにセクション
   - 「箱推し」chip + 個別メンバー chip（複数選択可）
   - 既存 user_oshi の kind / character_id から initialSelections を構築
4. **`/onboarding/area`** （4/4 活動エリア）
   - 8 エリアチップ（東京/神奈川/千葉/埼玉/大阪/愛知/福岡/その他）複数選択可
   - 「あとで設定する」スキップ可
   - account_status='active' に遷移（onboarding 完了）
5. **`/onboarding/done`** （完了サマリー）
   - グラデ背景 + ✨ + 「iHub へようこそ！」+ @handle
   - 推し最大 3 件のサマリー + エリア表示
   - 「次は何をする？」3 カード（マッチ / 在庫 / wish）
   - 「ホームに進む」

#### D. 推し追加リクエスト機能（共有可）

1. **oshi_requests テーブル新規**（migration `20260501100000_add_oshi_requests.sql`）
   - 主要カラム: requested_name, requested_genre_id, requested_kind, note
   - status: `pending` / `merged`（既存master統合）/ `approved`（新規追加）/ `rejected`
   - approved_group_id（承認時の紐付け先 master）
2. **`/onboarding/oshi/request`** 画面（名前 / ジャンル / 種類 / メモ）
3. **RLS 緩和**（migration `20260501110000_share_oshi_requests.sql`）
   - 「自分のだけ」→「誰でも全ステータス読める」
   - user_oshi に `oshi_request_id` カラム追加（nullable, FK）
   - check 制約: group_id / character_id / oshi_request_id のいずれか必須
4. **共有**：推し選択画面で全ユーザーの pending を「審査中」chip 表示・selectable
5. **承認トリガー** `handle_oshi_request_approval`
   - status pending → merged/approved 遷移時、approved_group_id がセット済なら：
     - リンクされている全 user_oshi の group_id を一括 UPDATE
     - 紐づく character_requests も同様に更新（後述 E.6）
   - rejected 時：リンクされた user_oshi を全削除

#### E. メンバー追加リクエスト機能（共有可）

1. **character_requests テーブル新規**（migration `20260501130000_add_character_requests.sql`）
   - group_id（必須・どのグループのメンバーか）, requested_name, note
   - status: `pending` / `merged` / `approved` / `rejected`
   - approved_character_id（承認時の紐付け先）
2. **`/onboarding/members/request`** 画面（クエリ groupId or oshiRequestId 必須）
3. **user_oshi に `character_request_id` カラム追加**
   - check 制約: group_id / character_id / oshi_request_id / character_request_id のいずれか必須
4. **共有**：メンバー選択画面で全ユーザーの pending を「🕐」chip 表示・selectable
5. **承認トリガー** `handle_character_request_approval`
   - 承認時：リンクされている全 user_oshi の character_id を一括 UPDATE
   - 却下時：リンクされた user_oshi を全削除
6. **連鎖対応**（migration `20260501140000_link_character_requests_to_oshi_requests.sql`）
   - character_requests に oshi_request_id 追加（審査中グループへのメンバーリクエスト対応）
   - check 制約: group_id か oshi_request_id のいずれか必須
   - oshi_request 承認時、紐づく character_requests も group_id に書き換え（連鎖変換）

#### F. データ seed

1. **K-POP 主要 5 グループ × 31 メンバー**（migration `20260501120000_seed_characters.sql`）
   - BTS（7）/ TWICE（9）/ NewJeans（5）/ IVE（6）/ aespa（4）
   - aliases に韓国語表記・英字・別名を含める

#### G. account_status 自動同期

1. **`/auth/callback` で email 認証完了時**
   - `exchangeCodeForSession` 成功後、`account_status='registered'` の場合に `'verified'` に UPDATE
   - `email_verified_at` に現在時刻
2. **遷移ロジック完成**
   ```
   registered（signup 直後）
     ↓ メール認証
   verified
     ↓ saveGender
   onboarding
     ↓ saveArea（or スキップ）
   active
   ```

#### H. パスワードリセット完了画面

1. **`/auth/password-reset-confirm`** 新規
   - searchParams.code を `exchangeCodeForSession` で session 化
   - 新パスワード入力フォーム（強度メーター + 確認）
   - 完了後 `/login?password_reset=success`
2. **`setNewPassword` action**：`updateUser({ password })`
3. **`/login`** で `?password_reset=success` バッジ表示

#### I. Google OAuth 接続（コードのみ・要 Cloud Console 設定）

1. **trigger 改修**（migration `20260501150000_oauth_handle_generation.sql`）
   - handle が無い場合 `user_xxxxxxxx` 形式でランダム生成（衝突回避ループ）
   - display_name は Google プロフィール（full_name / name）→ handle の順 fallback
   - email_confirmed_at がある（OAuth）なら account_status='verified'
2. **`signInWithGoogle` action**：`signInWithOAuth({ provider: 'google' })`
3. **`GoogleAuthButton`** 共通コンポーネント（Welcome / Login で再利用）
4. **未完了**：Google Cloud Console プロジェクト作成と Supabase Dashboard での Provider 有効化（ユーザー作業）

#### J. Email Templates 日本語化（手動設定）

1. **`notes/19_email_templates.md`** に整備
2. Confirm signup / Reset password の HTML テンプレ全文（iHub ブランド準拠）
3. 設定済（ユーザーが Supabase Dashboard でコピペ完了）

### 設計判断・トレードオフ

1. **handle 自動生成 vs 入力必須**
   - iter56 では signup 時に handle 入力必須にした（モックアップ準拠）
   - Google OAuth では handle が取れないので、trigger で `user_xxxxxxxx` 自動生成
   - 後で Phase 1 にハンドル変更画面を追加する前提
2. **追加リクエストの公開範囲**
   - 自分の申請のみ表示 vs 全ユーザー pending 表示
   - 後者を採用：同じ推しを複数人がリクエストする無駄を避け、「審査中」共有でコミュニティ感を出す
3. **メンバーリクエストの親グループ**
   - 既存 master のみ vs 審査中グループも対応
   - 後者を採用：「LUMENA」未承認時もそのメンバー「スア」をリクエスト可能、連鎖変換で承認時一括反映
4. **proxy での onboarding 未完了強制リダイレクト**
   - 今は実装しない：保護対象ページ（/home, /inventory）が未実装のため
   - Phase 1 で実装

### 関連ファイル

**新規 migration**:
- `supabase/migrations/20260501100000_add_oshi_requests.sql`
- `supabase/migrations/20260501110000_share_oshi_requests.sql`
- `supabase/migrations/20260501120000_seed_characters.sql`
- `supabase/migrations/20260501130000_add_character_requests.sql`
- `supabase/migrations/20260501140000_link_character_requests_to_oshi_requests.sql`
- `supabase/migrations/20260501150000_oauth_handle_generation.sql`

**新規ページ**:
- `web/src/app/onboarding/{gender,oshi,members,area,done}/`
- `web/src/app/onboarding/{oshi,members}/request/`
- `web/src/app/auth/password-reset-confirm/`

**新規コンポーネント**:
- `web/src/components/auth/PrimaryButton.tsx`（PrimaryButton + PrimaryLinkButton + secondaryBaseClass）
- `web/src/components/auth/Spinner.tsx`
- `web/src/components/auth/useRipple.tsx`
- `web/src/components/auth/ProgressDots.tsx`
- `web/src/components/auth/GoogleAuthButton.tsx`

**新規 actions**:
- `web/src/app/onboarding/actions.ts`（saveGender / saveOshi / saveOshiRequest / saveMembers / saveCharacterRequest / saveArea）
- `web/src/app/auth/actions.ts` に `signInWithGoogle` / `setNewPassword` 追加

**改修**:
- `web/src/app/page.tsx`（Welcome ビューを root に統合 + GoogleAuthButton）
- `web/src/app/login/`（モックアップ準拠 + Google ボタン）
- `web/src/app/auth/callback/route.ts`（account_status sync）
- `web/src/app/globals.css`（Tailwind theme + Ripple keyframe）
- `web/vercel.json`（regions hnd1）
- `web/src/app/layout.tsx`（Inter Tight フォント追加）

**ドキュメント**:
- `notes/19_email_templates.md`

### Phase 0b 完了報告

```
✅ Phase 0a:    Vercel + Supabase 接続（iter49-51）
✅ Phase 0b-1:  DB マイグレーション（iter52）
✅ Phase 0b-2:  Auth 実装 + メール送信基盤（iter53-55）
✅ Phase 0b-3:  認証 UI 完成 + Onboarding 5画面 + 共有リクエスト（iter56-57）
🔵 Phase 0c:    実機能（ホーム / 在庫管理 / wish / 打診 / 取引チャット）← 次
```

### 次の課題

- **Phase 0c 開始**：iter58 以降で実機能の実装
- ハンドル変更画面（OAuth ユーザー向け）
- Google OAuth の最終接続（ユーザー側で Cloud Console + Supabase 設定）
- proxy で onboarding 未完了強制リダイレクト（保護対象ができてから）
- データモデル変更を `notes/05_data_model.md` に反映
- 用語 `notes/10_glossary.md` に追加：「追加リクエスト」「審査中」「マージ」「連鎖変換」等
- 状態遷移 `notes/09_state_machines.md` に追加：oshi_requests / character_requests のステート

---

## イテレーション56：認証系 UI をモックアップ忠実化 + 構造バグ対応

### 達成事項

iter53-55 で動作する認証フローはあったが、UI が `auth-onboarding.jsx` のモックアップと乖離していた。本 iter で **AO* 全画面をモックアップ忠実に再実装**。並行して、iter53 で発覚した「未認証ユーザーが残ってハンドル占有 → 再登録不可」のデッドロック問題を解消。

### 背景・問題意識

iter55 完了時点での課題：
1. UI は最低限動くがモックアップとは見た目が違う（`bg-gradient-to-b from-purple-50 via-white to-pink-50` 一様、ヘッダーも仮）
2. signup 試行を繰り返すと `auth.users` に未認証レコードが残り、同じハンドル/メアドで再登録不可
3. 認証メールリンクが期限切れすると詰む（resend ボタンはあるが UI が貧弱）
4. パスワードリセット画面が未実装

### 変更内容

#### 共通コンポーネント（新規）

**`web/src/components/auth/HeaderBack.tsx`**
- モックアップ AOHeaderBack 準拠：sticky ヘッダー + 戻るアイコン + タイトル + サブ + 進捗
- 半透明 + backdrop-blur

**`web/src/components/auth/IHubLogo.tsx`**
- モックアップ AOLogo 準拠：紫→水色→ピンクのグラデ円 + 星アイコン
- size プロパティで大小切り替え可

#### 画面実装（モックアップ忠実）

**`web/src/app/page.tsx`** — Welcome（AOWelcome）
- 未ログイン時：iHub ロゴ大（88px）+ 「iHub」+ 「グッズ交換を、現地で、もっと簡単に。」+ CTA 2 つ
- ログイン時：暫定ホーム（既存表示・Phase 1 で本実装予定）
- 「メールアドレスで新規登録」+ 「Googleで新規登録」（disabled）+ 「すでにアカウントをお持ちの方は ログイン」

**`web/src/app/signup/SignUpForm.tsx`** — Signup（AOSignup）
- 表示名フィールド削除（display_name は handle で初期化）
- ハンドル名（@プレフィックス + 「後から変更可能」ヒント）
- パスワード強度メーター（4本バー + ラベル「弱い/普通/強い/最強」）
- パスワード確認（リアルタイム一致チェック、ボーダー赤化）
- 利用規約・プライバシーポリシーチェックボックス
- 「次へ」ボタン

**`web/src/app/auth/verify-email/page.tsx`** — VerifyEmail（AOEmailSent）
- ヘッダー：「メール認証」、戻る先 `/signup`
- 紫＆水色グラデの丸 + メールアイコン
- 「確認メールを送りました」（過去形・モックアップ準拠）
- メアド表示（白枠で囲む）
- ピンク背景の注意書き「📧 メールが届かない場合 / 迷惑メールフォルダ・再送・別メアドを試す」
- 60秒クールダウン付き再送ボタン（`ResendButton` で initialCooldown 受け取り）
- 「メールアドレスを変更する」リンク
- `?resent=1` クエリで「✓ 確認メールを再送しました」表示

**`web/src/app/auth/email-confirmed/page.tsx`**（新規） — EmailConfirmed（AOEmailConfirmed）
- 中央：紫→水色グラデの円（96px）+ 大きいチェックマーク + 影
- 「認証完了！」
- 「プロフィール設定へ進む」 → `/onboarding/gender`（iter57 で実装）
- onboarding 完了済（gender 設定済）ユーザーが来たら `/` へ自動転送

**`web/src/app/login/page.tsx` + `LoginForm.tsx`** — Login（AOLogin）
- ヘッダー：「ログイン」
- iHub ロゴ小（60px）+ 「おかえりなさい」
- メアド + パスワード入力
- 「パスワードを忘れた方」リンク（右寄せ・小）
- 「ログイン」ボタン
- 「または」divider + 「Googleでログイン」（disabled）
- 「アカウントをお持ちでない方は 新規登録」

**`web/src/app/password-reset/page.tsx` + `ResetForm.tsx`**（新規） — PasswordReset（AOPasswordReset）
- ヘッダー：「パスワードリセット」、戻る先 `/login`
- 「パスワードを再設定します」+ 説明
- メアド入力 → `resetPasswordForEmail` → `/auth/verify-email?purpose=reset`

#### 構造バグ対応：actions.ts

**signup の既存メアド + 未認証ユーザーへの対応**：
```
signup() で signUp が "already registered" エラー
  ↓
resend({type: "signup"}) を試行
  ├ 成功 = 未認証 → /auth/verify-email?resent=1 へ転送
  └ 失敗 = 認証済 → 「既に登録済み、ログインしてください」エラー
```

これで iter53 のデッドロック（同じメアド/ハンドルで再 signup できない）を解消。

**`passwordReset` 関数追加**：
- `resetPasswordForEmail` を呼んで `/auth/verify-email?purpose=reset` に遷移
- rate limit エラーの日本語化

#### callback route.ts

- `next` パラメータのデフォルトを `/` から `/auth/email-confirmed` に変更
- 認証直後は EmailConfirmed → Onboarding 入口、onboarding 済なら自動的に `/` へ

### 影響範囲

- 既存 signup フォームと挙動が変わる：display_name フィールド消滅、パスワード確認必須
- 既存 login フォーム見た目が変わる
- メール認証完了時の遷移先：`/` → `/auth/email-confirmed`（新中継ページ）
- 暫定ホーム画面はログイン時のみ表示

### 確認方法

1. シークレットウィンドウで https://ihub.tokyo/ → Welcome 表示
2. https://ihub.tokyo/signup → ハンドル + パス強度メーター + パス確認 動作確認
3. https://ihub.tokyo/login → 「パスワードを忘れた方」リンク存在確認
4. https://ihub.tokyo/password-reset → 「パスワードを再設定します」表示
5. signup 試行を 2回（同じメアドで）→ 2回目は「✓ 確認メールを再送しました」で verify-email に着地

### 関連ファイル

新規:
- `web/src/components/auth/HeaderBack.tsx`
- `web/src/components/auth/IHubLogo.tsx`
- `web/src/app/auth/email-confirmed/page.tsx`
- `web/src/app/password-reset/page.tsx`
- `web/src/app/password-reset/ResetForm.tsx`

改修:
- `web/src/app/page.tsx`（Welcome ビュー追加）
- `web/src/app/signup/page.tsx`
- `web/src/app/signup/SignUpForm.tsx`
- `web/src/app/login/page.tsx`
- `web/src/app/login/LoginForm.tsx`
- `web/src/app/auth/verify-email/page.tsx`
- `web/src/app/auth/verify-email/ResendButton.tsx`
- `web/src/app/auth/callback/route.ts`
- `web/src/app/auth/actions.ts`

### 次の課題（iter57）

- Onboarding 5画面実装（Gender / Oshi / Member / Area / Done）
- proxy で onboarding 未完了 → 強制リダイレクト
- account_status sync DB trigger（confirm で verified、profile 完成で onboarded）
- パスワードリセット完了画面（/auth/password-reset-confirm）
- Google OAuth 接続（後回し）

---

## イテレーション55：Brevo SMTP セットアップ完了 + Phase 0b-2 認証フロー全動作確認

### 達成事項

iter53 の Auth フロー実装＋ iter54 のフォールバック対応を経て、本 iter で **メール送信の本番運用基盤（Brevo）を構築し、認証フローが iHub.tokyo 上で end-to-end で動作することを確認**。Phase 0b-2 を完全完了。

### 背景・問題意識

iter53 直後に発生した問題：
- Supabase 組み込み SMTP のレート制限（1時間3〜4通）に即詰まる
- `email rate limit exceeded` で開発・テスト不可
- 本番リリース前にカスタム SMTP 必須

検討した選択肢：
| 選択肢 | 結論 |
|---|---|
| Firebase Auth に戻す | ❌ Supabase RLS / Postgres 設計を全捨てになる |
| AWS SES | △ コスパ最強（$0.10/1000通）だがサンドボックス解除など設定複雑 |
| **Brevo（旧 Sendinblue）** | ⭐ 永続無料 300/日 / 設定簡単 / Supabase 公式手順あり |
| Resend | △ 100/日（Brevo の1/3） |
| ZeptoMail | △ 設定難易度中 |

→ **Brevo 採用**（MVP 期は無料で運用可、スケール時は AWS SES へ移行）

### 作業内容

#### A. Brevo アカウント設定
- 既存アカウント（前プロジェクト Bubble.io 用）に iHub 用 SMTP Key を追加発行
- SMTP Key 名前：`iHub Production`（Standard variant・64文字）

#### B. ドメイン認証（DKIM/SPF/DMARC）
- お名前.com の DNS 管理画面で 4 レコード追加：

| Type | Name | Value | 用途 |
|---|---|---|---|
| TXT | （空欄）| `brevo-code:b948bda79e385f2a3935fadb98f04ca7` | ドメイン所有確認 |
| CNAME | `brevo1._domainkey` | `b1.ihub-tokyo.dkim.brevo.com` | DKIM 1 |
| CNAME | `brevo2._domainkey` | `b2.ihub-tokyo.dkim.brevo.com` | DKIM 2 |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com` | DMARC |

→ Brevo の Authentication 完了

#### C. Supabase に SMTP 接続情報を設定
- Auth → SMTP Settings → Enable Custom SMTP: ON
- Host: `smtp-relay.brevo.com`
- Port: `587`
- Username: Brevo の SMTP Login（`7b1d8e001@smtp-brevo.com`）
- Password: Brevo SMTP Key
- Sender email: **`support@ihub.tokyo`**
- Sender name: **`iHub`**

#### D. Brevo IP blocking の解除
- Supabase Cloud（AWS 東京 `13.113.119.158` 等）が Brevo の Authorized IPs に含まれず、初回送信時に保留＋本人確認メールが飛ぶ事象が発生
- **Brevo Security → Authorized IPs → SMTP keys → Deactivate for SMTP** を実施
- 理由：Supabase Cloud は IP が変動するため個別認証は運用負担大／SMTP Key 厳重管理でセキュリティ担保

#### E. End-to-end テスト成功
- signup（Gmail エイリアス使用）
- メール `iHub <support@ihub.tokyo>` から到着
- 「Confirm your mail」リンク → `/auth/callback` で `exchangeCodeForSession` 成功
- ホーム画面に「ログイン中 / ましま / @mashima / ログアウト」表示
- iter54 のフォールバック（root に code が来た時の `/auth/callback` 転送）も正常動作

### 影響範囲

- 本番ドメイン `ihub.tokyo` から正規メール送信可能（DKIM/SPF/DMARC 完備）
- 配信成功率：DKIM 認証済みのため Gmail/Yahoo 等での迷惑メール判定回避
- 永続無料 300/日 → MVP 期は完全無料で運用可
- スケール時の AWS SES 移行は SMTP credentials 差し替えのみ（DKIM/SPF レコードは流用可能）

### Phase 0b-2 完了報告

```
✅ Phase 0a:    Vercel + Supabase 接続（iter49-51）
✅ Phase 0b-1:  DB マイグレーション（iter52）
✅ Phase 0b-2:  Auth 実装 + メール送信基盤（iter53-55）
🔵 Phase 0b-3:  Onboarding 実装（次）
```

### 関連ファイル

- 設定（コード変更なし）
- `notes/08_design_iterations.md`（本 iter 追記）

### 次の課題（メモ）

- 認証メールのテンプレート日本語化（Supabase Auth → Email Templates）
- Phase 0b-3：Onboarding（性別 / 推し / AW 初期）UI + Server Actions
- Phase 0c：本登録時の `users.account_status` を `registered` → `verified` に同期する DB トリガー追加

---

## イテレーション54：認証メール `/?code=xxx` フォールバック対応

### 背景・問題意識

iter53 で Auth フロー実装後、`Confirm your mail` メールリンクをクリックすると以下のような URL に飛んでしまう事象が発生：

```
❌ https://ihub.tokyo/?code=9961e53b-2a89-41bf-b972-d156d3e97f73
```

期待していた挙動：
```
✅ https://ihub.tokyo/auth/callback?code=xxx
```

ルート (`/`) は `page.tsx` がレンダリングされるだけで code 処理ロジックがないため、**確認コードが検証されないままトップページが表示され、ユーザーは認証完了状態にならない**。

### 原因

Supabase Auth の Redirect URLs allowlist 未設定／設定遅延／メールテンプレ古版／www サブドメイン経由など、本番環境で `redirect_to` が想定外の値になるケースが複数存在する。

ユーザー側の Supabase URL Configuration は本 iter 時点で正しく設定済（Site URL=`https://ihub.tokyo`、Redirect URLs に 3 つの `/auth/callback` を登録）だが、**設定変更前に送信された確認メールには古い fallback URL が焼き込まれている**ため、過去メールでの認証は失敗する。

### 変更内容

#### `web/src/app/page.tsx`
- `searchParams` を Props で受け取り、`code` クエリ検出時に `/auth/callback?code=xxx` へサーバーサイドリダイレクト
- `error` クエリ検出時には `/auth/auth-error?error=xxx&error_code=xxx&error_description=xxx` へリダイレクト
- 既存のログイン状態判定ロジックは維持

```typescript
type Props = {
  searchParams: Promise<{
    code?: string;
    error?: string;
    error_code?: string;
    error_description?: string;
  }>;
};

export default async function Home({ searchParams }: Props) {
  const params = await searchParams;
  if (params.code) {
    redirect(`/auth/callback?code=${params.code}`);
  }
  if (params.error) {
    const errorParams = new URLSearchParams({
      error: params.error,
      ...(params.error_code && { error_code: params.error_code }),
      ...(params.error_description && { error_description: params.error_description }),
    });
    redirect(`/auth/auth-error?${errorParams.toString()}`);
  }
  // ... 既存のログイン状態判定
}
```

### 効果

- メールが古い設定状態で送信されていても、root に飛んできた認証コードを `/auth/callback` で正しく検証できる
- Supabase 側の設定漏れに対する保険として恒常的に機能（ローカル開発・別ドメイン経由など）
- 認証エラー（`?error=access_denied&error_code=otp_expired` など）も `/auth/auth-error` に正しく誘導される

### 確認方法

1. `npm run build` でビルド成功（6 routes 不変）
2. Vercel 再デプロイ後、新たに signup → 受信メールリンクをクリック
3. `/auth/callback` または root → `/auth/callback` 転送経由でログイン状態に到達

### 関連ファイル

- `web/src/app/page.tsx`（修正）
- `web/src/app/auth/callback/route.ts`（既存・修正なし）
- `web/src/app/auth/auth-error/page.tsx`（既存・修正なし）

---

## イテレーション53：Phase 0b-2 — Auth フロー実装（signup / login / logout）

### 達成事項

iter52 で DB マイグレーション完了 → 本 iter で **認証フロー UI + Server Actions** を実装。
ユーザーが自分でアカウント作成・ログインできる状態に到達。

### 作業内容

#### Server Actions（`web/src/app/auth/actions.ts`）
- `signup(formData)`：メアド + PW + handle + 表示名で登録、確認メール送信、`/auth/verify-email` へ
- `login(formData)`：メアド + PW でログイン、`/` へ
- `logout()`：セッション削除、`/login` へ
- `resendVerification(formData)`：認証メール再送

バリデーション:
- email: `@` 含むこと
- password: 8文字以上
- handle: `^[a-z0-9_]{3,20}$` 正規表現（DBの CHECK 制約と一致）
- display_name: 1〜50文字
- accepted_terms: 必須（規約同意）

ハンドル重複チェック: 事前に `public.users` を select で確認。

#### Auth Callback（`web/src/app/auth/callback/route.ts`）
- メール認証リンクから `/auth/callback?code=xxx` でアクセス
- `exchangeCodeForSession(code)` で session に交換
- 認証成功 → `/` へ、失敗 → `/auth/auth-error` へ

#### UI ページ
- `web/src/app/signup/page.tsx` + `SignUpForm.tsx`
- `web/src/app/login/page.tsx` + `LoginForm.tsx`
- `web/src/app/auth/verify-email/page.tsx` + `ResendButton.tsx`
- `web/src/app/auth/auth-error/page.tsx`

すべて Server Component（既ログインなら `/` へリダイレクト）+ Client Component フォーム（フォーム状態管理）。

iHub ブランドカラー（紫→ピンクグラデ）+ Noto Sans JP 統一。

#### `web/src/app/page.tsx` 更新
- ログイン状態を Server Component で取得
- ログイン中：「ようこそ {display_name} @{handle}」+ ログアウトボタン
- 未ログイン：「新規登録」「ログイン」リンク
- Phase 表示：0a → 0b に更新

### 実装したルート（6つ）

```
/             ホーム（ログイン状態切替）
/signup       新規登録フォーム
/login        ログインフォーム
/auth/verify-email  認証メール送信完了画面（再送ボタン付）
/auth/callback Route Handler（メール認証リンクの戻り）
/auth/auth-error  認証エラー画面
```

### ビルド確認

```
$ npm run build
✓ Compiled successfully in 1327ms
✓ Generating static pages 9/9
Route (app)
┌ ƒ /
├ ○ /_not-found
├ ○ /auth/auth-error
├ ƒ /auth/callback
├ ƒ /auth/verify-email
├ ƒ /login
└ ƒ /signup
```

### 09_state_machines / 規約原典との整合

`signup` Server Action は規約原典 §2 会員登録に対応：
- email + password での登録
- 利用規約・プライバシーポリシー同意必須
- ハンドル名は `^[a-z0-9_]{3,20}$` で検証（規約より厳格、DB と一致）

状態遷移（09 §7 Account Lifecycle）：
- `auth.users` INSERT → `handle_new_user()` トリガー → `public.users.account_status = 'registered'`
- メール認証完了 → callback で `email_confirmed_at` セット
  - ※ public.users.account_status の自動更新は未実装、後の iter で auth トリガー追加

### Vercel デプロイ後の必要作業（ユーザー対応）

#### 1. Supabase Auth 設定
Supabase ダッシュボード → Authentication → URL Configuration:

```
Site URL: https://ihub.tokyo

Redirect URLs:
- https://ihub.tokyo/auth/callback
- https://www.ihub.tokyo/auth/callback
- http://localhost:3000/auth/callback  ← ローカル開発用
```

#### 2. Vercel に本番URL 環境変数追加（任意）
```
NEXT_PUBLIC_APP_URL=https://ihub.tokyo
```
これがあると signup の emailRedirectTo が確実に本番URLに。
無くても VERCEL_URL でフォールバック動作する。

### 関連ファイル

新規（8ファイル）:
- `web/src/app/auth/actions.ts`（Server Actions）
- `web/src/app/auth/callback/route.ts`（Route Handler）
- `web/src/app/auth/verify-email/page.tsx` + `ResendButton.tsx`
- `web/src/app/auth/auth-error/page.tsx`
- `web/src/app/signup/page.tsx` + `SignUpForm.tsx`
- `web/src/app/login/page.tsx` + `LoginForm.tsx`

更新:
- `web/src/app/page.tsx`（ログイン状態対応）

### 次のステップ

1. **動作確認**：本番（ihub.tokyo）で実際にユーザー登録 → メール受信 → リンククリック → ログイン状態表示まで
2. **Supabase Auth URL設定**（ユーザー対応）
3. **Phase 0b-3：オンボーディング画面**：性別選択、推しグループ選択、推しメンバー選択、AW初期設定

これで Phase 0 の認証部分完了、次はオンボードへ。

---

## イテレーション52：Phase 0b-1 — Supabase CLI セットアップ + 初回マイグレーション

### 達成事項

リモート Supabase プロジェクトに **DB スキーマ + マスタデータ**を投入。
Phase 0 範囲（基盤・認証・マスタ）の DB 側準備完了。

### 作業内容

#### Supabase CLI セットアップ
- `~/.local/bin/supabase` v2.95.4 をバイナリで配置（Homebrew 不要）
- Personal Access Token（`sbp_xxx`）でログイン
- リポルートで `supabase init` → `supabase/` ディレクトリ作成
- `supabase link --project-ref kwpnlcojzseicqbxefih` でリモート接続

#### 初回マイグレーション作成・適用
- `supabase/migrations/20260501025213_initial_schema.sql`（253 行）
- 以下を作成：
  - **マスタ4つ**: `genres_master` / `groups_master` / `characters_master` / `goods_types_master`
  - **ユーザー拡張**: `public.users`（auth.users と 1:1、ハンドル・推し情報・状態管理）
  - **推し登録**: `user_oshi`（DD/箱推し対応、kind='box'/'specific'/'multi'）
  - **トリガー**:
    - `set_updated_at()`：updated_at 自動更新
    - `handle_new_user()`：auth.users INSERT 時に public.users 自動作成
  - **RLS（Row Level Security）**：全テーブル有効化、適切なポリシー設定
- **シードデータ**：
  - ジャンル 5（K-POP / 邦アイ / 2.5次元 / アニメ / ゲーム）
  - グッズ種別 11（トレカ / 生写真 / 缶バッジ / アクスタ / ペンライト 等）
  - K-POP 主要 10グループ（BTS / TWICE / NewJeans / IVE / Stray Kids / SEVENTEEN / aespa / LE SSERAFIM / ENHYPEN / TXT、aliases 込み）

#### 適用結果
```
$ supabase db push --include-all
Applying migration 20260501025213_initial_schema.sql...
Finished supabase db push.

$ supabase migration list
Local: 20260501025213 | Remote: 20260501025213 ✓ 一致
```

REST API 経由でシードデータも確認済：
- `GET /rest/v1/genres_master` → 5件取得
- `GET /rest/v1/groups_master` → 10件取得（aliases 含む）

### 09_state_machines / 10_glossary との整合

`account_status` の値リストは 09 §7 Account Lifecycle と完全一致：
- registered / verified / onboarding / active / suspended / deletion_requested / deleted

`user_oshi.kind` の値リストは 10 §B 推し関連と一致：
- box / specific / multi

### 関連ファイル

新規:
- `supabase/config.toml`（Supabase CLI 設定）
- `supabase/.gitignore`（ローカル一時ファイル除外）
- `supabase/migrations/20260501025213_initial_schema.sql`（253行）

### 次のステップ

**Phase 0b-2: Auth フロー実装（UI）**
- `/signup` ページ（メアド + パスワード + ハンドル）
- `/login` ページ
- `/logout` API
- /auth/callback（メール認証クリック後の遷移先）
- 認証後のセッション維持確認（既存 proxy.ts）

実装後、ブラウザで実際にユーザー登録 → ログイン → Supabase Studio で確認 → セッション維持確認 までを通す。

---

## イテレーション51：Phase 0a 完了 — https://ihub.tokyo で本番公開 🎉

### 達成事項

設計フェーズ（iter1-48）+ 実装初期（iter49-50）を経て、**本番URL `https://ihub.tokyo` で iHub アプリが動作**するようになった。

### 完了作業

#### Vercel デプロイ
- 新規 Vercel プロジェクト「ihub」作成
- GitHub `iHub_design` 連携、Root Directory `web/` 設定
- Application Preset 自動検出が UI 上は失敗したが、`web/vercel.json` の `framework: nextjs` でカバー
- Build / Install / Output コマンドはデフォルト使用
- 環境変数 4つ登録（NEXT_PUBLIC_SUPABASE_URL, _PUBLISHABLE_KEY, SUPABASE_SECRET_KEY, NEXT_PUBLIC_APP_ENV）
- 初回デプロイ成功

#### ドメイン接続（ihub.tokyo）
**Vercel 側設定**:
- `ihub.tokyo`（apex）: Production 環境に Connect
- `www.ihub.tokyo`: Production 環境に Connect（後で apex への redirect 化検討）

**お名前.com DNS 設定**:
- A レコード `@` → `216.198.79.1`（新しい Vercel IP に更新）
- CNAME `www` → `6a1fed19304af02c.vercel-dns-017.com.`（新プロジェクトの専用 CNAME）
- 旧プロジェクトの www CNAME（`668c44...vercel-dns-017`）を更新
- 旧 Firebase 関連レコード4つ削除（CNAME firebase1/2 _domainkey、TXT firebase=、TXT v=spf1 firebaseemail）
- NS レコード4つ（01-04.dnsv.jp）は保持
- TTL: 3600（標準）

**反映確認**:
- Vercel ダッシュボードで両ドメイン「Valid Configuration」（緑）
- HTTPS 証明書 Let's Encrypt 自動発行
- ブラウザで `https://ihub.tokyo` アクセス成功

#### 動作検証

ユーザーがブラウザで確認した結果：
- ✅ ページ表示成功
- ✅ 「★ iHub」バッジ表示
- ✅ 「Hello iHub」見出し表示
- ✅ 3カード表示（Phase 0a / Stack Next.js 16 / **Supabase: ✓ 接続（緑）**）
- ✅ Server Component で Supabase auth.getUser を呼び出し → 接続成功
- ✅ HTTPS 通信

つまり：
- Next.js 16 + React 19 が Vercel で正常動作
- Supabase Auth が SSR で動作
- 環境変数が正しく Vercel に渡っている
- Proxy（旧 middleware）が動作してセッション処理OK

### Phase 0a 達成状況

```
✅ Step 1: web/ ディレクトリ作成 + Next.js 16 初期化（iter49）
✅ Step 2: 「Hello iHub」ページ実装（iter49）
✅ Step 3: Supabase クライアント初期化（iter50）
✅ Step 4: ローカル npm run build 成功（iter50）
✅ Step 5: Supabase 既存削除 → 新規作成（ユーザー対応）
✅ Step 6: API Keys 設定 → web/.env.local（iter50）
✅ Step 7: Vercel 既存削除 → 新規作成（ユーザー対応、iter51）
✅ Step 8: 環境変数登録（ユーザー対応、iter51）
✅ Step 9: 初回デプロイ成功（ユーザー対応、iter51）
✅ Step 10: ドメイン DNS 設定（ユーザー対応、iter51）
✅ Step 11: https://ihub.tokyo 表示確認（ユーザー対応、iter51）
✅ Step 12: Supabase 接続確認 ✓ 緑（ユーザー対応、iter51）
```

**Phase 0a 完全完了**。

### 主要URL

| 項目 | URL |
|---|---|
| 本番（apex） | https://ihub.tokyo |
| 本番（www） | https://www.ihub.tokyo |
| GitHub リポ | https://github.com/mashimabizz/iHub_design |
| Vercel ダッシュ | https://vercel.com/mashimabizzs-projects/ihub |
| Supabase ダッシュ | https://supabase.com/dashboard/project/kwpnlcojzseicqbxefih |
| GitHub Pages（design preview） | https://mashimabizz.github.io/iHub_design/ |

### 関連ファイル

更新なし（実装は iter49-50 で完了済、本 iter は本番反映の記録）

### 次のステップ

**Phase 0b へ移行**：
1. Supabase CLI セットアップ
2. `supabase/` ディレクトリ初期化、リモートとリンク
3. 初回 DB マイグレーション（最小構成）：
   - `users`（auth.users 拡張）
   - `user_oshi`（推し登録）
   - マスタテーブル4つ（genres / groups / characters / goods_types）
4. Auth フロー実装：
   - `/signup` ページ（メアド + パスワード + ハンドル）
   - `/login` ページ
   - `/logout` API
5. 確認：実際にユーザー登録 → ログイン → セッション維持

これで Phase 0 の半分（基盤）+ Phase 1 の入口（マスタ）に到達。

---

## イテレーション50：Supabase 接続 + Next.js 16 Proxy 対応

### 背景

iter49 で web/ プロジェクト初期化済。次はSupabase 接続。
ユーザーが新規 Supabase プロジェクト `ihub` を作成し、API URL + Publishable key + Secret key を共有。

### 作業中の発見

#### 新キーフォーマット（Supabase 2024+）

旧:
- `eyJhbGciOiJIUzI1NiI...` JWT形式の anon key / service_role key

新:
- `sb_publishable_xxx`（旧 anon key、ブラウザ用、公開可）
- `sb_secret_xxx`（旧 service_role key、サーバー専用、秘密）

`web/.env.local.example` も新naming convention で更新。

#### Next.js 16 で `middleware` → `proxy` にリネーム

ビルド時に warning：
> The "middleware" file convention is deprecated. Please use "proxy" instead.

Next.js 16 の規約変更。`src/middleware.ts` を `src/proxy.ts` にリネーム、関数名も `middleware()` → `proxy()` に変更。機能は同じ。

### 変更内容

#### `web/.env.local`（gitignore済、commit対象外）
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
- SUPABASE_SECRET_KEY

#### `web/.gitignore` 修正
- `.env*` のままだと `.env.local.example` も除外される問題を修正
- `!.env.local.example` `!.env.example` を追加して例外指定

#### Supabase ライブラリインストール
- `@supabase/supabase-js@2.105.1`
- `@supabase/ssr@0.10.2`（Next.js SSR 対応、旧 auth-helpers の後継）

#### `web/src/lib/supabase/` 新規作成
- `client.ts`: `createBrowserClient`（Client Component 用）
- `server.ts`: `createServerClient`（Server Component / Route Handler 用）+ `createServiceRoleClient`（特権処理用）
- `middleware.ts`: `updateSession`（セッション refresh ヘルパー）

#### `web/src/proxy.ts`（旧 middleware.ts）
- Next.js 16 規約に従って `proxy.ts` にリネーム
- 関数名 `middleware()` → `proxy()` に変更
- 全リクエストでセッション更新（matcher で静的ファイルは除外）

#### `web/src/app/page.tsx` 更新
- Supabase 接続テスト追加（auth.getUser を試行）
- 接続状態を3列目のカードで表示（`✓ 接続` 緑 / `✗ 失敗` 赤）

### 動作確認

```bash
cd web && npm run build
# ✅ ビルド成功、警告なし
# ✅ Proxy (Middleware) で表示される
# ✅ static + dynamic ルート両方OK
```

### Phase 0a 進捗

```
✅ Step 1-5: Next.js 初期化（iter49）
✅ Step 6: Supabase 既存削除（ユーザー）
✅ Step 7: Supabase 新規作成（ユーザー、Tokyo region）
✅ Step 8: API keys 共有（Publishable + Secret）
✅ Step 9: web/.env.local 設定
✅ Step 10: Supabase クライアント初期化（browser / server / SSR proxy）
✅ Step 11: 接続テスト追加（page.tsx）

📋 残タスク:
[ ] Vercel 既存削除（ユーザー）
[ ] Vercel 新規プロジェクト作成（ユーザー、GitHub iHub_design 連携）
[ ] Vercel に環境変数登録（ユーザー、Supabase URL/keys）
[ ] Vercel デプロイ確認
[ ] Vercel カスタムドメインに ihub.tokyo 設定（ユーザー）
[ ] お名前.com で DNS 確認/更新（ユーザー）
[ ] https://ihub.tokyo で「Hello iHub」表示確認
```

### 関連ファイル

新規:
- `web/src/lib/supabase/client.ts`
- `web/src/lib/supabase/server.ts`
- `web/src/lib/supabase/middleware.ts`
- `web/src/proxy.ts`（旧 middleware.ts をリネーム）

更新:
- `web/.gitignore`：env.example の除外解除
- `web/.env.local.example`：新キー名に更新
- `web/.env.local`：実値設定（gitignore で除外）
- `web/package.json`: @supabase/supabase-js + @supabase/ssr 追加
- `web/src/app/page.tsx`: Supabase 接続テスト追加

⚠️ `.env.local` は git に push されない（.gitignore済）。Secret key は安全に管理。

### 次のステップ

ユーザー対応待ち：
1. Vercel 既存 ihub プロジェクト削除
2. Vercel 新規プロジェクト作成・GitHub iHub_design 連携
3. 環境変数登録（Supabase の3つ + APP_ENV）
4. デプロイ → ihub.tokyo 接続

---

## イテレーション49：Phase 0a 着手 — Next.js 16 プロジェクト初期化

### 背景

設計フェーズ完了後、いよいよ実装着手。
ユーザー方針：
- リポは `iHub_design` をそのまま monorepo 化（新規リポ作成しない）
- 既存 Supabase / Vercel `ihub` プロジェクトは削除して再作成（クリーンスタート）
- ドメイン `ihub.tokyo` は新 Vercel プロジェクトに繋ぎ直し

### 変更内容

#### `web/` ディレクトリ新規作成

```bash
npx create-next-app@latest web \
  --typescript --tailwind --eslint \
  --app --src-dir --import-alias "@/*" --no-turbopack
```

導入バージョン：
- **Next.js 16.2.4**（破壊的変更あり、要 docs 確認）
- **React 19.2.4**
- TypeScript / Tailwind CSS / ESLint / App Router / src/ 構成

ビルド確認済（`npm run build` 成功）。

#### `web/src/app/layout.tsx` カスタマイズ
- Geist フォント → **Noto Sans JP**（日本語向け）
- title / description を iHub 用に
- lang="ja"

#### `web/src/app/page.tsx` カスタマイズ
- 「Hello iHub」ランディング
- iHub ブランドカラー（紫→ピンク gradient）
- Phase 0a / Stack 情報カード
- 設計 iter数を表示

#### `web/next.config.ts` 設定
- `turbopack.root` を明示的に `web/` に固定（lockfile 検出警告の抑制）

#### `web/.env.local.example` 作成
- Supabase 接続情報のテンプレート（NEXT_PUBLIC_SUPABASE_URL, anon key, service_role key）

#### `vercel.json` 作成（リポ root）
- buildCommand: `cd web && npm run build`
- outputDirectory: `web/.next`
- installCommand: `cd web && npm install`
- framework: nextjs

これで Vercel が `web/` サブディレクトリを Next.js プロジェクトとして認識・ビルド・デプロイ。

#### `CLAUDE.md` 更新
- `web/` ディレクトリ構造を追記
- Next.js 16 注意事項（破壊的変更、AGENTS.md / docs 確認）
- 動作確認コマンド一覧

### Phase 0a 進捗

```
✅ Step 1: web/ ディレクトリ作成 + Next.js 初期化
✅ Step 2: 「Hello iHub」ページ表示確認（npm run build 成功）
✅ Step 3: vercel.json 設定
✅ Step 4: .gitignore 確認（既存で十分カバー）
✅ Step 5: CLAUDE.md 更新

📋 残タスク（ユーザー対応 + 私の作業）:
[ ] ユーザー: 既存 Supabase ihub プロジェクト削除
[ ] ユーザー: 既存 Vercel ihub プロジェクト削除
[ ] ユーザー: Supabase 新規 ihub プロジェクト作成（Region: Tokyo）
[ ] ユーザー: Supabase API URL + anon key + service_role key を共有
[ ] 私: web/.env.local 設定 + Supabase クライアント初期化
[ ] ユーザー: Vercel 新規 ihub プロジェクト作成（GitHub iHub_design 連携）
[ ] ユーザー: Vercel に環境変数登録（Supabase keys）
[ ] ユーザー: Vercel カスタムドメインに ihub.tokyo 設定
[ ] ユーザー: お名前.com で DNS 確認/更新
[ ] 私: デプロイ確認、https://ihub.tokyo で「Hello iHub」表示
```

### 確認方法

ローカル：
```bash
cd web && npm run dev
# http://localhost:3000 で「Hello iHub」表示
```

GitHub：
```
https://github.com/mashimabizz/iHub_design/tree/main/web
```

### 関連ファイル

新規:
- `web/`（Next.js 16 プロジェクト一式、約 360 packages）
- `web/.env.local.example`
- `vercel.json`

更新:
- `CLAUDE.md`（web/ 構造追記）

### 次のステップ

ユーザーがクラウド側を削除→再作成 → 私が Supabase クライアント・初期マイグレーションを設定。
1〜2 セッションで「https://ihub.tokyo で Hello iHub」状態に到達予定。

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
