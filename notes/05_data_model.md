# データモデル設計（議論中）

（2026-04-27 ターン6時点）

## 既存スキーマ（変更なしで活用）

- `user_haves`（=「棚」）：詳細は [04_prototype_status.md](04_prototype_status.md)
- `user_have_images`：将来の複数画像対応予備
- `user_wants`（=「鏡」）：flexibility / priority カラム含む

## 既存スキーマで MVP までに変更が必要な点

### ① マスタ参照の強化（キャラ運営マスタ化）

**現状の問題**：
- `genre_name`（text 必須）と `genre_tag_id`（uuid 任意）の二重管理
- マッチングは `genre_name` 完全一致に依存 → 表記揺れ（「呪術廻戦」「呪術」「JJK」）で取りこぼし

**提案**：
- `genre_tag_id` を **必須** に格上げ（運営マスタ参照を強制）
- `character_name` を `character_id`（マスタ参照）化
- `goods_type` を `goods_type_id`（マスタ参照）化
- `genre_name` / `character_name` は **表示用キャッシュ**として残すか、JOINで取得

**マスタ階層**：

```
genres_master         # ジャンル：KPOP / 邦アイ / 2.5次元 / etc
  ├ id
  ├ name
  └ kind              # idol / anime / game / etc

groups_master         # グループ：BTS / TWICE / etc（KPOP限定で開始）
  ├ id
  ├ genre_id          # → genres_master
  ├ name
  └ aliases[]         # ["방탄소년단", "防弾少年団"]

characters_master     # メンバー／キャラ
  ├ id
  ├ group_id          # → groups_master（KPOPはグループ参照）
  ├ genre_id          # → genres_master（グループに属さないジャンル用）
  ├ name
  └ aliases[]

goods_types_master    # 缶バッジ／トレカ／生写真／アクスタ／etc
  ├ id
  ├ name
  └ category
```

### ② 場所粒度の整理

**現状**：`hand_prefecture`（都道府県レベル "東京都"）

**問題**：iHubの現地交換は「会場周辺」「駅エリア」「半径500m」など細かい粒度が必要

**提案**：
- `user_haves.hand_prefecture` は **削除 or プロフへ格下げ**
- ユーザープロフに `primary_area`（"東京都"レベル、粗い検索用）を追加
- 具体的な合流情報は **新テーブル `availability_windows`** で持つ

### ③ 「携帯グッズ」状態

**提案（推奨：案A）**：
- `user_haves` に追加カラム：
  - `is_carrying` boolean（default false）
  - `carry_event_id` uuid nullable（→ `events`）

代替（案B）：別テーブル `carry_sessions`（履歴管理に強いがMVPには重い）

### ④ 数量（×N）の扱い

**提案（推奨）**：1行 = 1個 を維持。UI で「×N」を受け取って **N行 INSERT**。

理由：
- 既存 status 管理（active/reserved/traded）と完全整合
- 「3個中2個 reserved、1個 active」が自然に表現
- スキーマ変更ゼロ

代替：`quantity` 列追加 → `reserved_count` / `traded_count` も必要になり複雑化

### ⑤ `exchange_method` の "郵送" 値

**提案**：データ型はそのまま、MVPでは登録UIで「郵送」を**非表示・選択不可**に。実質「手渡し」固定。後フェーズで活用余地。

---

## 新規追加が必要なテーブル

### `availability_windows`（時間範囲＋場所）

```
id                uuid
user_id           uuid → users
start_at          timestamptz
end_at            timestamptz
lat               double precision
lng               double precision
radius_m          integer (default 500)
event_id          uuid nullable → events
note              text
created_at        timestamptz
updated_at        timestamptz
```

### `events`（公演／物販イベントタグ）

```
id                uuid
name              text                   # "BOYS GROUP A 東京ドーム公演"
start_at          timestamptz
end_at            timestamptz
lat               double precision
lng               double precision
venue_name        text                   # "東京ドーム"
genre_id          uuid → genres_master
group_id          uuid nullable → groups_master
created_by        uuid → users           # ユーザー作成タグ
created_at        timestamptz
```

タグはユーザー作成可能。サジェスト・名寄せロジックで重複防止。

### `proposals`（打診）

```
id                uuid
sender_id         uuid → users
receiver_id       uuid → users
match_type        text                   # 'perfect' / 'half_a' / 'half_b'
sender_have_ids   uuid[]                 # 私が出すグッズ
receiver_have_ids uuid[]                 # 相手が出すグッズ
message           text
status            text                   # 'sent' / 'accepted' / 'rejected' / 'cancelled'
rejected_template text nullable          # 定型文選択肢
created_at        timestamptz
updated_at        timestamptz
```

### `messages`（取引チャット）

```
id                uuid
proposal_id       uuid → proposals
sender_id         uuid → users
body              text
attachment_url    text nullable
created_at        timestamptz
```

### `exchanges`（成立した取引）

```
id                uuid
proposal_id       uuid → proposals
participants      uuid[]                 # 参加者（MVPは2名）
evidence_image_url text                  # 両者の交換物を1枚に収めた写真
sender_approved   boolean default false
receiver_approved boolean default false
completed_at      timestamptz nullable
location_lat      double precision nullable
location_lng      double precision nullable
created_at        timestamptz
```

両者承認で `completed_at` がセットされ、関連 `user_haves.status` を `traded` に。

### `user_evaluations`（評価）

```
id                uuid
exchange_id       uuid → exchanges
evaluator_id      uuid → users           # 評価者
evaluated_id      uuid → users           # 被評価者
rating            integer (1-5)
comment           text nullable
created_at        timestamptz
```

集計はビューで：合計★平均、取引回数、無断キャンセル数。

### `rejected_partners`（断った記録）

```
id                uuid
user_id           uuid → users           # 自分
partner_id        uuid → users           # 相手
proposal_id       uuid → proposals
created_at        timestamptz
```

片方向記憶。重複打診の自動フィルタに使用。

### `genres_master` / `groups_master` / `characters_master` / `goods_types_master`

上記参照。MVPは KPOP からスタート。

---

## マッチング計算ロジック（更新）

### 既存ロジック（user_haves × user_wants）

- `genre_name`（→ `genre_id`）完全一致
- `character_name`（→ `character_id`）照合（want側 NULL なら無視）
- `goods_type`（→ `goods_type_id`）照合（want側 NULL なら無視）
- `exchange_method` && 重複

### 追加ロジック（新要件）

- **場所・時間**：`availability_windows` の時空交差
- **携帯グッズ絞り込み**：完全マッチタブでは `is_carrying = true` のみ対象
- **片方向マッチ**：完全マッチで除外された候補を「片方向」タブに振り分け
- **「断った」フィルタ**：`rejected_partners` 既登録ペアを除外
- **flexibility**：want側の flexibility に応じて character_id / goods_type_id 照合をスキップ

### 計算タイミング

- バッチ：定期計算（夜間など、低頻度）
- オンデマンド：ユーザーがタブを開いたときに最新計算
- リアルタイム：完全マッチ発見時のみ即時通知（MVPではここのみ通知）

---

## 残っている確認事項

1. **数量の扱い**：1行＝1個＋N行INSERT 案でOKか
2. **`hand_prefecture` の格下げ**：ユーザープロフ`primary_area`へ移管、Availability Window と併用
3. **`exchange_method` の "郵送" 非表示**：MVPでは非表示でOKか
4. **`is_carrying` カラム追加（案A）**：`user_haves` に直接追加でOKか
5. **KPOP 初期スコープ**：BTS／TWICE／NewJeans／IVE／Stray Kids 等のスター級5〜10グループから着手で進めるか
