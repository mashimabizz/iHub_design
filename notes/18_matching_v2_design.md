# マッチング v2 設計（雑多メモを整理）

> オーナーの 2026-05-03 メモを構造化したもの。
> このドキュメントは **要件整理段階**。決定済みではなく、レビュー後に
> `02_system_requirements.md` / `05_data_model.md` / `09_state_machines.md` /
> `10_glossary.md` / `11_screen_inventory.md` 等へ反映する。

---

## 0. 元メモ（原文）

> ホーム画面ではデフォルトでは、時空間の制限なしのマッチング結果が表示されるようにする。
> 「現地交換に切り替え」のようなボタンを押すと、交換可能な範囲や、交換可能時間、そして持参しているグッズを選択、あとは特に欲しいグッズをウィッシュリストから選ぶようにしたい。
> ウィッシュリストについては、譲るグッズの異種交換か、同種交換か、または双方を選べるようにしたい。
>
> んーやっぱり求めるものの特定がむずいな。グループ名とキャラ名で絞ってもらい、画像で表示してもらったものに対して「異種交換」「同種交換」という感じで Option をつけることで、一発でわかるようにしたいな。
> 幅広く交換を募集する場合と、特定の条件で募集を募る場合の2パターンでできたら嬉しいのかもしれない。
>
> その場合、特定の条件で募集を募る場合ってたとえば？ この譲に対して、同種交換で、このキャラのものが欲しい、とかだね。
> あとは、比率の問題か。この譲キャラに対しては、これとこれとこれのキャラなら、1体3で交換するよ、みたいな感じか。
>
> つまり、一番簡単なパターンとしては、譲とウィッシュリストを登録するだけ。
> 現地交換モードに切り替える場合は、交換場所と時間と持参しているグッズを選択、またウィッシュリストを選択または指定すること。
> また、特定の募集をかけることもできるようにする。
> 特定の譲るアイテムを選ぶ（必ずそのグッズのグループ名とグッズ種別は同じものを選ぶ）。
> そしてそのグッズ一つに対して、求めるものとして特定のキャラ、グッズ種別を選び、同種／異種／どちらでもを指定可能、また、比率を設定可能。
> そして優先度の設定も可能。というふうにしたい。
>
> 打診をする際には、ほしいものと私が譲るものを指定するだけでなく、自身のカレンダーを公開するか選択できるようにして、交換方法の検討できる材料を増やしてほしい。

---

## 1. 大方針（要点）

オーナーが提案している交換のあり方は、3 つのレイヤーに整理できる。

### Layer A — ベース登録（必須・常時）
- **譲**（goods_inventory, kind=for_trade）
- **wish**（user_wants）

これだけで「広域マッチング」が動く。**時空間の制限なし** ＝ 全国どこでも全時間帯で、譲 × wish の交差を探す。

### Layer B — 現地交換モード（任意・切替式）
ホームの「現地交換に切り替え」ボタンで明示的に切替。
- AW（場所・時間・半径）を設定
- **携帯グッズ**（carrying=true な譲アイテム）を絞り込み
- **アクティブ wish** を選び直す

切替後は **時空交差** した相手のみが表示される。

### Layer C — 個別募集（任意・拡張）
1 つの譲アイテムに対して、より細かい条件をピンポイント設定する仕組み。
- **特定キャラ**を求める
- **特定の goods 種別**を求める
- **同種 / 異種 / どちらでも**を指定
- **比率**（1:1, 1:3, 2:1 など）を指定
- **優先度**を指定

これにより「LUMENA スア のトレカに対して、LUMENA ヒナの缶バッジ 1:1 でしか交換しない」などのピンポイント募集が可能になる。

---

## 2. 用語の整理（仮）

### 新規用語

| 用語 | 別名 | 定義 | カテゴリ |
|---|---|---|---|
| **広域マッチ** | global match / 時空無制限マッチ | 譲 × wish のみで全国マッチ。AW 不要 | E. マッチング |
| **現地マッチ** | local match / 時空マッチ | AW + 携帯グッズ + 選択 wish で絞った当日マッチ | E. マッチング |
| **同種交換** | same-kind swap | 同じ `goods_type_id` 同士の交換（例: トレカ ↔ トレカ） | C. グッズ |
| **異種交換** | cross-kind swap | 異なる `goods_type_id` 同士の交換（例: トレカ ↔ 缶バッジ） | C. グッズ |
| **混合交換** / **どちらでも** | mixed / any | 同種・異種を問わない | C. グッズ |
| **個別募集** | listing / pinpoint | 特定の譲 1 件に紐付いた、より細かい条件付き募集 | D. 取引・プロセス |
| **交換比率** | exchange ratio | 譲 N 個に対して受け取りたい M 個の比率（例: 1:3） | D. 取引・プロセス |
| **カレンダー公開** | calendar disclosure | 打診時に自分の今後の AW 予定を相手に見せる任意フラグ | F. 場所・時間 |

### 用語の補足（要確認）

- **「同種」「異種」の判定軸** = `goods_type_id` で確定でよいか？  
  代替案: `genre_tag_id` 軸でも区別する？（例: K-POP ↔ K-POP は「同種」、K-POP ↔ アニメ は「異種」）  
  → 提案: **goods_type_id 軸のみで判定**。ジャンル混合は wish 側のフィルタで対応。

- **「比率」の単位** = アイテム個数？ それとも価値の換算ポイント？  
  → 提案: **個数の比率のみ**（価値換算は MVP 外）。

---

## 3. データモデルへの影響（提案）

### 3-1. `user_wants` (wish) に列追加

| 列 | 型 | 説明 |
|---|---|---|
| `exchange_type` | text | `same_kind` / `cross_kind` / `any`（default: `any`） |

→ 既存マッチングロジックで wish の `goods_type_id` と相手の譲の `goods_type_id` を比較する際、この値で挙動を分岐。

### 3-2. 新テーブル `listings`（個別募集）

譲アイテム 1 件に紐づく「もっと細かい条件付き募集」を表す。
wish と独立して存在し、優先的にマッチング候補を出す。

| 列 | 型 | 説明 |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | → users |
| `inventory_id` | uuid | → goods_inventory（kind='for_trade' の自分の譲） |
| `exchange_type` | text | `same_kind` / `cross_kind` / `any` |
| `ratio_give` | int | 自分の譲の個数（default 1） |
| `ratio_receive` | int | 相手から受け取る個数（default 1） |
| `priority` | int | 1（高）〜 5（低） |
| `status` | text | `active` / `paused` / `matched` / `closed` |
| `note` | text nullable | 自由メモ |
| `created_at` / `updated_at` | timestamptz | |

子テーブル `listing_targets`（求める対象の OR リスト）:

| 列 | 型 | 説明 |
|---|---|---|
| `id` | uuid | PK |
| `listing_id` | uuid | → listings |
| `character_id` | uuid nullable | → characters_master（指定 OR） |
| `goods_type_id` | uuid nullable | → goods_types_master（指定 OR） |

→ 1 つの listing に複数の (character, goods_type) ターゲットを OR で追加可能。
   例: `(スア, トレカ), (ヒナ, トレカ), (スア, 缶バッジ)` の 3 ペアいずれか OK。

### 3-3. `proposals` に列追加

| 列 | 型 | 説明 |
|---|---|---|
| `expose_calendar` | bool | 打診時にカレンダー公開を選んだか（default false） |
| `listing_id` | uuid nullable | listing 経由の打診ならその id |

→ 受信側は `expose_calendar=true` のとき、相手の今後の `availability_windows` を読める（RLS で許可）。

### 3-4. 既存マッチングロジックへの影響

- 広域マッチ（AW を見ない）= 既存の譲 × wish 交差ロジックそのまま
- 現地マッチ = 上記 + AW 時空交差フィルタ
- listing 経由マッチ = listing.exchange_type と listing_targets を満たす相手の wish/譲を探す

---

## 4. 画面・動線への影響

### 4-1. ホーム画面（home-v2.jsx 系の更新）

```
[ホーム]
 ├─ ヘッダー
 │   ├─ タイトル「マッチング」
 │   └─ モード切替トグル / Pill ボタン
 │       ├─ 「広域」（デフォルト・全国 / 全時間）
 │       └─ 「現地交換」（AW 連動）
 │
 ├─ モード = 広域 のとき
 │   ├─ タブ: [完全マッチ] [私を求めてる人] [私が求めてる人] [探索]
 │   └─ カードリスト（既存 home-v2.jsx の構造）
 │
 └─ モード = 現地交換 のとき
     ├─ 上部に「現地交換セットアップ」サマリ
     │   ├─ AW: 「LUMENA WORLD TOUR — 横浜アリーナ 17:30〜18:30 半径 500m」
     │   ├─ 持参中: 12 件中 5 件選択
     │   └─ wish: 8 件中 3 件選択
     │   └─ [編集] ボタン
     └─ カードリスト（時空交差結果のみ）
```

**初回切替時の設定パネル**:
1. AW 選択（既存 AW から / 新規作成）
2. 持参グッズ（carrying=true から多選択）
3. アクティブ wish（多選択）

→ 設定済みなら 1〜3 はサマリ表示のみで切替が即時。

### 4-2. wish 画面（hub-screens.jsx の wish タブ更新）

各 wish カードに **「交換タイプ」** chip を追加:
- 同種 / 異種 / どちらでも

新規 wish 追加時 / 編集時に選択。

### 4-3. 在庫一覧 → 個別募集アクション（B-Inventory 拡張）

譲アイテムの「キープに / 譲渡履歴へ / 編集する」メニューに追加:
- **「個別募集を作成」**

→ 個別募集作成画面（新規）:
1. 対象の譲アイテム（自動入力・固定表示）
2. 交換タイプ chip: 同種 / 異種 / どちらでも
3. 求める対象（OR リスト）
   - グループ ＋ キャラ（multi-select / 画像付き）
   - グッズ種別（multi-select）
   - 「+ ターゲット追加」で複数行
4. 交換比率: `[N] 個 ↔ [M] 個`
5. 優先度: 1〜5
6. 自由メモ

### 4-4. 打診画面（propose-select.jsx の C-0 拡張）

下部に追加:
- **「カレンダーを公開する」** トグル（default OFF）
  - サブテキスト: 「相手はあなたの今後の AW 予定を見られます」
  - 公開時のプレビュー（次の 1〜2 件のみ）

### 4-5. 個別募集の閲覧

- 自分の listing 一覧（プロフィール / 在庫タブのサブビュー）
- 他者の listing は **譲アイテムの詳細ページ**で「○○用の個別募集あり」と表示
- 完全マッチ未成立でも、相手が listing を出していれば「この条件で打診」が即できる

---

## 5. マッチングロジックの分岐（提案）

```
[マッチ判定の擬似コード]

if mode == "global":
    # 広域マッチ（時空無視）
    matches = find_perfect_matches(my_haves, my_wishes, ALL_users)
    + find_one_way_matches(my_haves, ALL_user_wishes)
    + find_one_way_matches(my_wishes, ALL_user_haves)

elif mode == "local":
    # 現地マッチ
    overlapping_aws = find_aw_overlaps(my_aw, ALL_user_aws)
    overlapping_users = unique_users_from(overlapping_aws)
    matches = find_perfect_matches(my_carrying, my_active_wishes, overlapping_users)
    + ...

# Listing は別軸で常時マッチ
listing_matches = find_listings_for_my_inventory(my_haves)
+ find_my_listings_targets_in(other_user_haves)
```

---

## 6. 既存仕様との差分マトリクス

| 領域 | 既存 | v2 提案 | 影響度 |
|---|---|---|---|
| ホーム画面 | 4 タブ固定 | モード切替＋4 タブ | **大**（home-v2.jsx 大改修） |
| wish 属性 | flexibility, priority | + exchange_type | 小（DB 列追加） |
| 譲属性 | carrying（持参） | 維持。listing で拡張 | 中 |
| 個別募集 | 存在しない | 新テーブル `listings` | **大**（新規実装） |
| 打診 | テンプレ＋編集 | + calendar 公開フラグ | 中 |
| マッチング | 完全/片方向 2 軸 | global / local / listing 3 軸 | 中（ロジック追加） |

---

## 7. 実装フェーズの提案

### Phase A — wish 属性拡張（最小限の v2）
- wish に `exchange_type` 追加
- マッチングロジックで判定追加
- wish 編集 UI に chip 追加
- → これだけで「同種/異種」の指定が wish レベルで可能になる

### Phase B — ホームモード切替
- ホームに「広域 / 現地」モードトグル追加
- 現地モードの設定パネル
- 結果リストの差し替え

### Phase C — 個別募集（listing）
- DB スキーマ追加
- listing 作成 / 編集画面
- 在庫一覧から「個別募集を作成」動線
- マッチングロジックに listing 軸を追加

### Phase D — 打診のカレンダー公開
- proposals に `expose_calendar` 列追加
- 打診画面にトグル追加
- 受諾側の AW 閲覧 UI

---

## 8. 要確認事項（オーナーへの質問）

1. **「同種交換」の判定軸**は `goods_type_id` のみで OK？  
   （ジャンル軸も含めるなら追加検討）

2. **「比率」の上限**は？  
   提案: 1:1 〜 1:10 / 10:1 程度に制限。極端な値は弾く。

3. **listing と wish の関係**:  
   - listing は wish と完全独立で良いか？
   - 「既存 wish を listing 化」の動線は要る？

4. **広域モードと現地モードの切替**:  
   - 設定は記憶する？（切替後も覚えておく）
   - 各モードでフィルタ状態は別々に持つ？

5. **カレンダー公開の範囲**:  
   - 公開する AW の本数（次 N 件 vs 全件）
   - 公開期間（打診中のみ vs 永続）
   - 取引終了後は自動非公開？

6. **「全国マッチ（広域）」での通知頻度**:  
   - 既存の「完全マッチ即時 / 片方向は 1 日まとめ」をそのまま流用？

7. **片方向マッチ昇格**（既存仕様の検討中項目）との関係:  
   - listing は片方向マッチ昇格の代替手段になる？

---

## 9. 次アクション

1. **オーナーレビュー**: 上記 §8 の質問に回答
2. **質問回答後の整理**:
   - `notes/02_system_requirements.md` の F4 マッチング節を更新
   - `notes/05_data_model.md` に `listings` / `listing_targets` 追加、`user_wants.exchange_type` 追加、`proposals.expose_calendar` 追加
   - `notes/09_state_machines.md` に listing と calendar 公開のライフサイクル追加
   - `notes/10_glossary.md` の §C / §D / §E / §F に新用語追加
   - `notes/11_screen_inventory.md` に新画面（モード切替、listing 編集、calendar 公開トグル）追加
3. **iter62 以降の実装計画**:
   - iter62 → 当初は「検索＋フィルタ」だったが、優先度を見直し
   - **iter62 候補**: Phase A（wish.exchange_type）
   - **iter63 候補**: Phase B（ホームモード切替）
   - **iter64 候補**: Phase C（listing）
   - **iter65 候補**: Phase D（カレンダー公開）

---

## 10. 整理結果のまとめ（1 行で）

- **Layer A**（譲 + wish）→ 広域マッチ
- **Layer B**（AW + 携帯 + 選択 wish）→ 現地マッチ
- **Layer C**（listing = 譲ごとの細条件）→ ピンポイント募集
- 打診時に **カレンダー公開** をオプションで付与

→ オーナーレビュー（§8）後、データモデルと画面仕様を確定して iter62 から段階実装。
