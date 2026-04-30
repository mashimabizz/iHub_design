# データモデル設計

> **目的**：iHub の全エンティティのDBスキーマ設計と、状態・マッチング・取引のデータフロー定義。
> 実装の正解集。`09_state_machines.md` と完全に整合させ、`10_glossary.md` の用語を使う。

最終更新: 2026-05-01
ステータス: Draft v2.0（iter24/29/33/34 反映済）

## 最新化履歴

| Rev | 日付 | 変更 |
|---|---|---|
| v1.0 | 2026-04-27 | 初版（マスタ階層、availability_windows、proposals 等） |
| **v2.0** | **2026-05-01** | **iter24/29/33/34 反映（meetup, outfit, location_share, 状態名統一、deals リネーム）** |

## このドキュメントの位置付け

- **状態識別子（status等）は `09_state_machines.md` と完全一致**
- **用語は `10_glossary.md` と完全一致**（`deal` を使う、`exchange` は旧）
- **「⚠️ 要確認」は実装着手前に擦り合わせる項目**
- 表記揺れに気づいたら `10_glossary.md` に追加・更新

---

## 目次

1. [マスタテーブル](#1-マスタテーブル)
2. [ユーザー・アカウント](#2-ユーザーアカウント)
3. [在庫・ウィッシュ](#3-在庫ウィッシュ)
4. [活動予定（AW）・イベント](#4-活動予定awイベント)
5. [打診（Proposal）・ネゴ・メッセージ](#5-打診proposalネゴメッセージ)
6. [取引（Deal）・到着・服装・位置共有](#6-取引deal到着服装位置共有)
7. [評価・通報・断った記録](#7-評価通報断った記録)
8. [Dispute（異議申し立て）](#8-dispute異議申し立て)
9. [マッチング計算ロジック](#9-マッチング計算ロジック)
10. [⚠️ 未確定項目](#10-未確定項目)

---

## 1. マスタテーブル

iter24 で「推し2階層」（グループ/作品 → メンバー/キャラ）を UI で明示化。データモデル側は既存設計を維持。

### `genres_master`

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid | PK |
| `name` | text | "K-POP" / "邦アイ" / "2.5次元" / "アニメ" / "ゲーム" 等 |
| `kind` | text | 'idol' / 'anime' / 'game' / 'other' |
| `display_order` | int | 表示順 |
| `created_at` | timestamptz | |

### `groups_master`

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid | PK |
| `genre_id` | uuid | → genres_master |
| `name` | text | "BTS" / "TWICE" / "呪術廻戦" 等 |
| `aliases` | text[] | ["방탄소년단", "防弾少年団"] 等の表記揺れ |
| `kind` | text | 'group' / 'work' / 'solo'（iter24対応：ソロアーティストの取扱い、⚠️要確認） |
| `display_order` | int | |
| `created_at` | timestamptz | |

### `characters_master`

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid | PK |
| `group_id` | uuid nullable | → groups_master（グループ所属の場合） |
| `genre_id` | uuid | → genres_master（グループ非所属でも参照） |
| `name` | text | "ジョングク" / "虎杖悠仁" 等 |
| `aliases` | text[] | |
| `display_order` | int | |
| `created_at` | timestamptz | |

### `goods_types_master`

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid | PK |
| `name` | text | "トレカ" / "生写真" / "缶バッジ" / "アクスタ" 等 |
| `category` | text | 'card' / 'photo' / 'pin' / 'figure' / 'other' |
| `display_order` | int | |
| `created_at` | timestamptz | |

---

## 2. ユーザー・アカウント

### `users`

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid | PK |
| `email` | text unique | |
| `password_hash` | text nullable | OAuth のみの場合は NULL |
| `oauth_provider` | text nullable | 'google' / 'apple' 等 |
| `oauth_subject` | text nullable | OAuth の sub |
| `handle` | text unique | @hana_lumi 等 |
| `display_name` | text | |
| `avatar_url` | text nullable | |
| `gender` | text nullable | 任意（オンボで聞く） |
| `primary_area` | text nullable | "東京都" 等の粗い検索用エリア |
| `account_status` | text | `registered` / `verified` / `onboarding` / `active` / `suspended` / `deletion_requested` / `deleted` (09と一致) |
| `email_verified_at` | timestamptz nullable | |
| `deletion_requested_at` | timestamptz nullable | 30日猶予の起点 |
| `last_login_at` | timestamptz nullable | |
| `created_at` / `updated_at` | timestamptz | |

⚠️ 要確認：
- パスワード以外の auth method（passkey, magic link）対応するか
- `gender` を必須にするか任意にするか（マッチング条件に使う？）

### `user_oshi`（推し登録）

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | → users |
| `group_id` | uuid nullable | → groups_master（L1） |
| `character_id` | uuid nullable | → characters_master（L2） |
| `kind` | text | 'box'（箱推し）/ 'specific'（特定メンバー）/ 'multi'（複数メンバー） |
| `priority` | int | 1=メイン推し、2以降=サブ |
| `created_at` | timestamptz | |

⚠️ 要確認：
- 1ユーザーが複数推し（DD）登録できる前提でOKか
- L1のみ・L2のみ・両方の組み合わせ可否

---

## 3. 在庫・ウィッシュ

### `user_haves`（=「棚」=在庫）

iter29 で 1行=1個 の方針確定。UI で集約表示し、選択時は N 行を押さえる。

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | → users |
| `genre_tag_id` | uuid | → genres_master（**必須**、iter24） |
| `character_id` | uuid nullable | → characters_master（iter24、新マスタ参照、表記揺れ排除） |
| `goods_type_id` | uuid | → goods_types_master（**必須**、iter24） |
| `title` | text | 旧 `genre_name`/`character_name` 由来の表示名 |
| `description` | text nullable | |
| `condition_tags` | text[] | 美品 / コーティング有 / シリアル付き 等 |
| `exchange_method` | text | 'hand'（手渡し）/ 'mail'（郵送、MVPでは UI 非表示） |
| `kind` | text | `for_trade`（譲る候補）/ `keep`（自分用キープ） |
| `status` | text | `available` / `in_negotiation` / `in_deal` / `traded`（09 Item Lifecycleと整合） |

> **🔒 制約（iter39 確定）**：`kind='keep'` のアイテムは `status='in_negotiation'` または `status='in_deal'` に**なれない**。
> `keep` を譲りたくなったら、まず `kind='for_trade'` に変更してから提案を受ける。アプリケーションレベルでバリデーション必須。

| `is_carrying` | boolean | 「今日持参する」フラグ（F2 携帯モード） |
| `carry_event_id` | uuid nullable | → events |
| `created_at` / `updated_at` | timestamptz | |

⚠️ 要確認：
- ~~`kind=keep` のアイテムは `status=in_negotiation` になり得るか~~ → ✅ **確定（iter39）：ならない（完全分離）**
- `traded` のアイテムは `kind` を保つか reset するか
- 旧 `hand_prefecture` カラムは廃止して `users.primary_area` に統合してOKか

### `user_have_images`

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid | PK |
| `user_have_id` | uuid | → user_haves |
| `image_url` | text | 400×400 JPEG (F1) |
| `order` | int | 表示順 |
| `created_at` | timestamptz | |

### `user_wants`（=「鏡」=ウィッシュ）

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | → users |
| `genre_tag_id` | uuid | → genres_master（**必須**） |
| `character_id` | uuid nullable | → characters_master（任意、flexibility 考慮） |
| `goods_type_id` | uuid nullable | → goods_types_master（任意、flexibility 考慮） |
| `title` | text | |
| `description` | text nullable | |
| `flexibility` | int | 1（厳格）〜 5（緩い）。character/goods_type の照合スキップ条件 |
| `priority` | int | 1（高）〜 5（低）。マッチング表示順に使用 |
| `status` | text | `active`（探し中）/ `matched`（マッチあり）/ `in_negotiation`（打診中）/ `achieved`（達成）（09 Wish Lifecycleと整合） |
| `created_at` / `updated_at` | timestamptz | |

⚠️ 要確認：
- `flexibility` の具体的な意味（1=完全一致のみ、5=ジャンル一致だけでOK 等）の定義
- `matched` 状態の継続性（09 未確定項目#5 と紐付け）

---

## 4. 活動予定（AW）・イベント

### `availability_windows`（=AW）

iter33 で AW自動登録機能追加（C-0 待ち合わせタブから）。

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | → users |
| `start_at` / `end_at` | timestamptz | 時間範囲 |
| `lat` / `lng` | double precision | 中心点 |
| `radius_m` | int | デフォルト 500m |
| `place_name` | text nullable | "ナゴヤドーム前矢田駅" 等の表示用 |
| `event_id` | uuid nullable | → events |
| `note` | text nullable | |
| `status` | text | `draft` / `active` / `paused` / `ended` / `archived`（09 AW Lifecycleと一致） |
| `created_via` | text | `manual`（AW画面で作成）/ `auto_from_proposal`（iter33、C-0で「AWに自動登録」チェック） |
| `created_from_proposal_id` | uuid nullable | → proposals（auto_from_proposalの場合） |
| `created_at` / `updated_at` | timestamptz | |

⚠️ 要確認：
- `ended` から `archived` への自動遷移時間（09 未確定項目#2）
- `auto_from_proposal` で作られた AW は、対応する取引が cancel/dispute になったら削除？保持？

### `events`（公演／物販イベントタグ）

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid | PK |
| `name` | text | "TWICE 名古屋ドーム公演" 等 |
| `start_at` / `end_at` | timestamptz | |
| `lat` / `lng` | double precision | |
| `venue_name` | text | "ナゴヤドーム" |
| `genre_id` | uuid | → genres_master |
| `group_id` | uuid nullable | → groups_master |
| `created_by` | uuid | → users（ユーザー作成タグ） |
| `is_verified` | boolean | 運営承認済か（重複名寄せ後） |
| `created_at` | timestamptz | |

⚠️ 要確認：
- ユーザー作成タグの即公開 vs 運営承認後公開
- 重複検出（同名・同会場・同時間）の自動マージ運用

---

## 5. 打診（Proposal）・ネゴ・メッセージ

### `proposals`（打診）

iter28（match_type）/ iter29（数量）/ iter30（7日期限）/ iter32（合意状態）/ iter33（meetup）反映。

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid | PK |
| `sender_id` | uuid | → users（打診送信者） |
| `receiver_id` | uuid | → users（受信者） |
| `match_type` | text | `perfect`（完全マッチ）/ `forward`（私が欲しい譲を持つ人）/ `backward`（私の譲が欲しい人）（iter28） |
| `sender_have_ids` | uuid[] | 送信者が出す `user_haves` IDs |
| `sender_have_qtys` | int[] | 各 IDの選択数（iter29、長さは sender_have_ids と一致） |
| `receiver_have_ids` | uuid[] | 受信者が出す `user_haves` IDs |
| `receiver_have_qtys` | int[] | 各 IDの選択数 |
| `message` | text | |
| `status` | text | `draft` / `sent` / `negotiating` / `agreement_one_side` / `agreed` / `rejected` / `expired`（09と一致） |
| `agreed_by_sender` | boolean default false | iter32、agreement_one_side 判定用 |
| `agreed_by_receiver` | boolean default false | iter32 |
| `last_action_at` | timestamptz | iter30、7日カウント起点 |
| `expires_at` | timestamptz | iter30、自動計算（last_action_at + 7days） |
| `extension_count` | int default 0 | iter30、+7日延長回数 |
| `rejected_template` | text nullable | 旧定型文選択 |
| `meetup_type` | text | iter33、`now` / `scheduled`（必須） |
| `meetup_now_minutes` | int nullable | iter33、5/10/15/30 (`meetup_type='now'`時のみ) |
| `meetup_scheduled_aw_id` | uuid nullable | → availability_windows（AWから選択した場合） |
| `meetup_scheduled_custom` | jsonb nullable | iter33、`{date, time, lat, lng, place_name, register_as_aw: bool}`（カスタム日時の場合）。**iter39 確定：MVPは JSONB で固定。将来検索性が必要になったら別テーブル `proposal_meetups` に切り出し可**。 |
| `created_at` / `updated_at` | timestamptz | |

⚠️ 要確認：
- ネゴ中の提案修正で `last_action_at` リセットするか（09 未確定項目#1）
- `cancelled` 状態を追加するか（送信前に取消・送信後に sender が取消等）
- ~~`meetup_scheduled_custom` を JSONB か別テーブル `proposal_meetups` か~~ → ✅ **確定（iter39）：JSONB（MVP段階）**
- `agreement_one_side` 中の提案修正で双方の `agreed_by_*` を false にリセットするルール

### `proposal_revisions`（提案修正履歴）— 新規（iter30）

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid | PK |
| `proposal_id` | uuid | → proposals |
| `revised_by` | uuid | → users |
| `snapshot` | jsonb | 修正時点のスナップショット（sender_have_ids, receiver_have_ids, meetup_*, message） |
| `revised_at` | timestamptz | |

⚠️ 要確認：
- 履歴保存の粒度（毎修正 全部 vs 直近N件のみ）
- 表示用 vs 法的記録 vs ヒストリ機能のどれが目的か

### `messages`（取引チャット・ネゴチャット）

iter34 で `message_type` 拡張。

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid | PK |
| `proposal_id` | uuid | → proposals（合意後も同じ ID で継続） |
| `sender_id` | uuid | → users |
| `message_type` | text | `text` / `image` / `outfit_photo` / `location_share` / `system`（iter34） |
| `body` | text nullable | text/system 用 |
| `attachment_url` | text nullable | image / outfit_photo 用 |
| `metadata` | jsonb nullable | location_share: `{lat, lng, accuracy_m, captured_at}`／system: `{event_type, payload}` |
| `created_at` | timestamptz | |

⚠️ 要確認：
- `outfit_photo` を `messages` に格納するか専用テーブル `deal_outfit_photos` にするか
- system message の `event_type` の値リスト確定（'arrival', 'agreement_one_side', 'evidence_captured' 等）

---

## 6. 取引（Deal）・到着・服装・位置共有

### `deals`（旧 `exchanges` をリネーム、用語集と一致）

iter34 で到着ステータス・サブステート追加。

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid | PK |
| `proposal_id` | uuid | → proposals（agreed 状態の Proposal から1:1で生成） |
| `participants` | uuid[] | 参加者（MVPは2名、user_id配列） |
| `status` | text | `agreed` / `on_the_way` / `arrived_one` / `arrived_both` / `evidence_captured` / `approved` / `rated` / `disputed` / `cancelled`（09 Deal Lifecycleと一致） |
| `evidence_image_url` | text nullable | 証跡撮影画像（C-3①、左=相手 / 右=自分 固定） |
| `sender_approved` | boolean default false | C-3②両者承認 |
| `receiver_approved` | boolean default false | |
| `actual_meet_lat` | double precision nullable | 実際の合流位置（提案時meetupと異なる場合あり） |
| `actual_meet_lng` | double precision nullable | |
| `cancelled_reason` | text nullable | キャンセル理由（'late_30min', 'mutual', 'system' 等） |
| `cancelled_by` | uuid nullable | → users（キャンセル発動者） |
| `completed_at` | timestamptz nullable | rated に到達した時刻 |
| `created_at` / `updated_at` | timestamptz | |

両者承認で `evidence_captured` → `approved`、両者評価で `approved` → `rated`、`completed_at` セット、関連 `user_haves.status` を `traded` に更新。

⚠️ 要確認：
- `cancelled_reason` の値リスト確定
- `disputed` 解決時に `rated` に戻るか、別の終了状態にするか

### `deal_arrivals`（到着ステータス追跡）— 新規（iter34、iter39 で MVP 範囲確定）

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid | PK |
| `deal_id` | uuid | → deals |
| `user_id` | uuid | → users |
| `arrived_at` | timestamptz | |
| `arrival_lat` / `arrival_lng` | double precision nullable | GPS 取得した到着位置（任意・将来用） |
| `detection_method` | text | **MVP は `manual` のみ**（ユーザー報告）。Post-MVP で `qr_scan`（本人確認時自動）/ `gps_auto`（位置自動検知）を検討 |
| `created_at` | timestamptz | |

> **🔒 設計確定（iter39）：MVP は手動報告のみ**
>
> - C-2 取引チャットに「会場到着」ボタンを置き、ユーザーがタップで到着扱い
> - `detection_method='manual'` 固定
> - **GPS 自動検知は Post-MVP**（プライバシー観点・電池消費・誤検知のため MVP 対象外）
> - **QR スキャン連動も Post-MVP**（実装軽いが、まずは手動で十分）
> - DBスキーマは将来対応も見越した設計（`arrival_lat/lng`, `detection_method` カラムは残す）

⚠️ 要確認：
- ~~到着検知の仕組み~~ → ✅ **確定（iter39）：MVPは手動のみ**
- 1 deal × 1 user で1レコード前提か、再到着（一度退場→戻る）も記録するか

### `deal_outfit_photos`（服装写真）— 新規（iter34、iter39 で2層構成確定）

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid | PK |
| `deal_id` | uuid | → deals |
| `user_id` | uuid | → users |
| `image_url` | text | |
| `shared_at` | timestamptz | |
| `created_at` | timestamptz | |

> **🔒 設計確定（iter39）：2層構成で運用**
>
> - **`deal_outfit_photos`（専用テーブル）**：「最新の服装写真」を deal_id × user_id で一意に保持。C-2 ヘッダーの「あなた:✓ / 相手:未シェア」ステータス取得用。1人が複数回更新する場合は INSERT ＋ ORDER BY DESC LIMIT 1 で最新を取得（履歴も保持）。
> - **`messages.message_type='system'`**：「@xxx が服装写真を共有しました」をシステムメッセージとしてチャットタイムラインに流す。`metadata.event_type='outfit_shared'` を設定。
>
> 両方使うことで「最新ステータスの高速取得」と「タイムラインの足跡」を両立。

---

## 7. 評価・通報・断った記録

### `user_evaluations`（評価）

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid | PK |
| `deal_id` | uuid | → deals（旧 `exchange_id`） |
| `evaluator_id` | uuid | → users |
| `evaluated_id` | uuid | → users |
| `rating` | int | 1-5 |
| `comment` | text nullable | |
| `punctuality_rating` | int nullable | 1-5（時間厳守度、⚠️要確認） |
| `item_condition_rating` | int nullable | 1-5（実物状態の一致度、⚠️要確認） |
| `communication_rating` | int nullable | 1-5（メッセージ対応、⚠️要確認） |
| `created_at` | timestamptz | |

集計はビューで：合計★平均、取引回数、無断キャンセル数。

⚠️ 要確認：
- 細分化評価（punctuality/item_condition/communication）を MVPで採用するか後フェーズか

### `rejected_partners`（断った記録）

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | → users（自分） |
| `partner_id` | uuid | → users（相手） |
| `proposal_id` | uuid | → proposals |
| `created_at` | timestamptz | |

片方向記憶。重複打診の自動フィルタに使用。

### `reports`（通報）— 新規

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid | PK |
| `reporter_id` | uuid | → users |
| `target_user_id` | uuid nullable | → users |
| `target_proposal_id` | uuid nullable | → proposals |
| `target_message_id` | uuid nullable | → messages |
| `category` | text | 'spam', 'harassment', 'fake_item', 'no_show', 'other' |
| `description` | text | |
| `evidence_urls` | text[] | スクショ等 |
| `status` | text | 'open', 'reviewing', 'resolved', 'dismissed' |
| `resolved_at` | timestamptz nullable | |
| `created_at` | timestamptz | |

---

## 8. Dispute（異議申し立て）

### `disputes`

iter12-18 の D-flow に対応するスキーマ（旧版未定義だったので新規追加）。

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid | PK |
| `deal_id` | uuid | → deals |
| `filed_by` | uuid | → users |
| `category` | text | `no_show` / `late` / `mismatch` / `damage` / `other`（iter12 の5種） |
| `description` | text | |
| `evidence_urls` | text[] | |
| `status` | text | `filed` / `submitted` / `reply_window` / `reply_received` / `arbitration` / `resolved` / `withdrawn`（09と一致） |
| `ticket_number` | text unique | iter16、受付番号（"D-2026-0001" 等） |
| `reply_deadline_at` | timestamptz | iter15、反論機会期限（24h） |
| `arbitration_deadline_at` | timestamptz | iter13、SLA（同日4h／それ以外24h、カテゴリ依存） |
| `resolution` | jsonb nullable | 仲裁結果（**iter39 で構造確定** → 下記） |
| `resolved_at` | timestamptz nullable | |
| `created_at` / `updated_at` | timestamptz | |

> **🔒 `resolution` JSONB の構造（iter39 確定）**
>
> ```json
> {
>   "decision": "sender_fault | receiver_fault | mutual_fault | no_fault | cant_determine",
>   "reason": "判定理由（テキスト、運営記入）",
>   "penalty_for_sender": "none | warning | temp_suspend | permanent_suspend",
>   "penalty_for_receiver": "none | warning | temp_suspend | permanent_suspend",
>   "next_steps": "推奨アクション（テキスト、当事者向けメッセージ）"
> }
> ```
>
> **`decision` の意味**：
> - `sender_fault` … 提案者側に非
> - `receiver_fault` … 受諾者側に非
> - `mutual_fault` … 双方に非
> - `no_fault` … 双方に非なし（コミュ不足等）
> - `cant_determine` … 判定不可（証拠不十分）
>
> **`penalty_for_*` の意味**：
> - `none` … ペナルティなし
> - `warning` … 警告（マイページに記録、累積で次段階へ）
> - `temp_suspend` … 一時停止（30日アカウント停止等、運営判断）
> - `permanent_suspend` … 永久停止
>
> 当事者へのペナルティ通知は別途 `reports`/`disputes` のステータス変化と連動。

⚠️ 要確認：
- 反論機会期限が 24h or 4h はカテゴリで変わるか（09 未確定項目#3）
- 仲裁SLA超過時のエスカレーションフロー
- ~~`resolution.decision` の値リスト~~ → ✅ **確定（iter39）：上記5値**

### `dispute_replies`（反論）

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid | PK |
| `dispute_id` | uuid | → disputes |
| `replied_by` | uuid | → users |
| `message` | text | |
| `evidence_urls` | text[] | |
| `created_at` | timestamptz | |

---

## 9. マッチング計算ロジック

### 既存ロジック（user_haves × user_wants）

- `genre_tag_id` 完全一致（必須）
- `character_id` 照合（want側 NULL or flexibility 高 ならスキップ）
- `goods_type_id` 照合（want側 NULL or flexibility 高 ならスキップ）

### 追加ロジック（iter後）

- **完全マッチ**：双方の haves と wants が両方向で一致 → `match_type='perfect'`
- **forward マッチ**：私の wants と相手の haves のみ一致（私の haves は不問）→ `match_type='forward'`
- **backward マッチ**：相手の wants と私の haves のみ一致（相手の haves は不問）→ `match_type='backward'`
- **AW交差**：`availability_windows` の時空交差（lat/lng/start_at/end_at）で重み加算
- **携帯グッズ**：`is_carrying=true` のみを完全マッチタブで対象（`carry_event_id` で絞り込み可）
- **「断った」フィルタ**：`rejected_partners` 既登録ペアを除外
- **flexibility**：want側の flexibility に応じて character_id / goods_type_id の照合をスキップ

### 計算タイミング

- **バッチ**：定期計算（夜間など、低頻度）
- **オンデマンド**：ユーザーがタブを開いたときに最新計算
- **リアルタイム**：完全マッチ発見時のみ即時通知（MVPではここのみ通知）

⚠️ 要確認：
- バッチ頻度（毎日 / 6h おき / 1h おき）
- リアルタイム通知のスロットル（同じユーザーから1日N回まで等）

---

## 10. ⚠️ 未確定項目

実装着手前にユーザーと擦り合わせる項目。`09_state_machines.md` の「未確定・要確認項目」表とも連携。

### ✅ iter39 で確定済（5件）

| # | カテゴリ | 項目 | 確定内容 |
|---|---|---|---|
| 3 | proposals | `meetup_scheduled_custom` を JSONB か別テーブルか | **JSONB（MVP段階）** |
| 5 | user_haves | `kind=keep` のアイテムは `status=in_negotiation` になり得るか | **完全分離・ならない** |
| 17 | messages | `outfit_photo` を専用テーブルか messages か | **両方（専用テーブル＋system message）** |
| 21 | deal_arrivals | 到着検知の仕組み | **手動のみ（MVP）。QR/GPSは Post-MVP** |
| 26 | disputes | `resolution.decision` 値リスト | **5値 + penalty 4段階 + reason/next_steps** |

### 未確定（残25件）

| # | カテゴリ | 項目 | 影響範囲 |
|---|---|---|---|
| 1 | proposals | ネゴ中の提案修正で `last_action_at` リセットするか | 7日期限のUX |
| 2 | proposals | `cancelled` 状態の追加可否（送信前取消等） | 状態数 |
| 4 | proposals | `agreement_one_side` 中の提案修正で `agreed_by_*` を reset するか | UX設計 |
| 6 | user_haves | `traded` のアイテムは `kind` を保持か reset するか | 履歴の見え方 |
| 7 | user_haves | 旧 `hand_prefecture` を `users.primary_area` に統合してOKか | スキーマ移行 |
| 8 | users | `gender` を必須にするか任意にするか | オンボUX |
| 9 | user_oshi | DD（複数推し）登録の上限・組み合わせルール | UI設計 |
| 10 | user_wants | `flexibility` の具体的意味の定義 | マッチング精度 |
| 11 | user_wants | `matched` 状態の継続性（一度マッチ通知したら戻らない？） | 通知頻度 |
| 12 | aw | `ended` から `archived` への自動遷移時間 | 09 未確定項目#2 と同じ |
| 13 | aw | `auto_from_proposal` AW は取引cancel時に削除？保持？ | データ整合 |
| 14 | events | ユーザー作成タグの即公開 vs 運営承認 | 運用負荷 |
| 15 | events | 重複検出・自動マージのルール | データ品質 |
| 16 | proposal_revisions | 履歴保存の粒度（毎修正全部 vs N件のみ） | ストレージ |
| 18 | messages | system message の `event_type` 値リスト確定 | 実装明確化 |
| 19 | deals | `cancelled_reason` の値リスト | UI構築 |
| 20 | deals | `disputed` 解決時に `rated` に戻るか別終了状態か | フロー設計 |
| 22 | deal_arrivals | 1 deal × 1 user で1レコードか、再到着も記録か | データ設計 |
| 23 | user_evaluations | 細分化評価（punctuality/item_condition/communication）を MVPで採用するか | UX複雑度 |
| 24 | disputes | 反論機会期限が 24h / 4h はカテゴリで変わるか | 09 未確定項目#3 と同じ |
| 25 | disputes | 仲裁SLA超過時のエスカレーション | 運用フロー |
| 27 | matching | バッチ計算頻度 | 性能設計 |
| 28 | matching | リアルタイム通知のスロットル | 通知頻度 |
| 29 | users | パスワード以外の auth method（passkey 等） | スコープ |
| 30 | groups_master | グループ非所属のジャンル（ソロアーティスト・声優）の `kind` 設計 | iter24 の派生 |

---

## 付録：状態名の対応表（09との整合確認用）

| エンティティ | 09 の状態名 | このDoc の status カラム値 |
|---|---|---|
| Proposal | `draft` `sent` `negotiating` `agreement_one_side` `agreed` `rejected` `expired` | `proposals.status` |
| Deal | `agreed` `on_the_way` `arrived_one` `arrived_both` `evidence_captured` `approved` `rated` `disputed` `cancelled` | `deals.status` |
| Dispute | `filed` `submitted` `reply_window` `reply_received` `arbitration` `resolved` `withdrawn` | `disputes.status` |
| AW | `draft` `active` `paused` `ended` `archived` | `availability_windows.status` |
| Item | `available` `in_negotiation` `in_deal` `traded` | `user_haves.status` |
| Wish | `active` `matched` `in_negotiation` `achieved` | `user_wants.status` |
| Account | `registered` `verified` `onboarding` `active` `suspended` `deletion_requested` `deleted` | `users.account_status` |

> **注意**：実装で状態名を勝手に変えると 09 と不整合になる。命名変更が必要なら必ず両方を同時に更新する。
