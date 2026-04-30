# CLAUDE.md — Claude セッション Bootstrap

> このファイルは **Claude が新規セッションでこのリポジトリに入った時、最初に読むべきファイル**。
> 環境が変わっても再現できることを目的に、最低限のコンテキストを集約しています。

---

## 30秒で理解する iHub

- **何**: K-POP / アニメ等の推し活グッズを **現地で交換**するモバイルアプリ
- **誰のため**: メインペルソナはハナ（27歳・IT勤務・月3〜5万円グッズ予算）。詳細は `notes/00_persona.md`
- **MVP の範囲**: 現地交換（郵送は Yahoo フリマ等と棲み分け）、ランダム封入の小型グッズが主な交換対象
- **特徴**: AW（Activity Window = 「この時間ここにいる」予定）と wish のマッチング、受諾前ネゴ、合意前に待ち合わせfix

---

## 作業を始める前に必読のドキュメント（優先順）

1. 🥇 **`notes/10_glossary.md`** — 用語の定義。「AW って何？」「wish と 求 は同じ？」を解決
2. 🥇 **`notes/09_state_machines.md`** — 全エンティティの状態遷移（mermaid）
3. 🥈 **`notes/08_design_iterations.md`** — 設計判断の履歴。最新 iteration（番号大きい方）から見ると効率的
4. 🥈 **`notes/07_mvp_handoff.md`** — MVP引き継ぎ全体像
5. 🥉 **`notes/02_system_requirements.md`** — 機能要件（やや古い、iter 24-34 未反映の可能性）
6. 🥉 **`notes/05_data_model.md`** — データモデル（同上、要更新）

---

## ファイル構造マップ

### `iHub/`（mockup）

| ファイル | 担当範囲 |
|---|---|
| `home-v2.jsx`, `home-variations.jsx` | ホーム画面、マッチカード |
| `hub-screens.jsx` | プロフィールハブ、ウィッシュタブ |
| `b-inventory.jsx` | 在庫管理（B-1, B-2, B-3） |
| `aw-edit.jsx` | AW（活動予定）編集 |
| `search-filter.jsx` | 検索＋フィルタ＋保存検索 |
| `auth-onboarding.jsx` | 認証＋オンボーディング 13画面 |
| `account-extras.jsx` | プロフ補助 8画面 |
| `account-support.jsx` | 取引タブ／レポート／ヘルプ／設定 |
| `legal-pages.jsx` | 利用規約／プライバシーポリシー／特商法 |
| `propose-select.jsx` | C-0 提示物選択（譲・受け取る・**待ち合わせ**） |
| `c-flow.jsx` | C-1（打診）／**C-2（取引チャット）**／C-3（証跡＋評価） |
| `nego-flow.jsx` | C-1 受信／**C-1.5 ネゴチャット**／合意確認／取引成立 |
| `c-dispute.jsx` | D-flow（異議申し立て、10画面） |
| `design-canvas.jsx` | アートボードラッパー基盤 |
| `ios-frame.jsx` | iPhone 枠コンポーネント |
| `tweaks-panel.jsx` | ブランドカラー切替パネル（`useTweaks` フック含む） |

### `iHub/iHub *.html`（表示用 HTML）

各 HTML は `<DesignCanvas>` で複数アートボードを並べて表示する Figma 風キャンバス。
ファイル名 = フロー名。例：`iHub Nego Flow.html` は受諾前ネゴ関連の全画面を一覧。

### `notes/`（ドキュメント）

| ファイル | 内容 |
|---|---|
| `00_persona.md` | ペルソナ（ハナ＋サブ3名） |
| `01_user_needs.md` | ユーザーニーズ |
| `02_system_requirements.md` | 機能要件 |
| `03_strategy.md` | 戦略 |
| `04_prototype_status.md` | 既存システム状況 |
| `05_data_model.md` | データモデル |
| `06_extended_needs.md` | 拡張要件 |
| `07_mvp_handoff.md` | MVP引き継ぎ |
| `08_design_iterations.md` | **設計判断の履歴（iter 35 件）** |
| `09_state_machines.md` | **状態遷移図（mermaid）** |
| `10_glossary.md` | **用語集＋廃止用語** |

---

## 動作確認

```bash
# プロジェクトルートで
python3 -m http.server 8000

# ブラウザで http://localhost:8000/iHub%20{Flow}.html を開く
```

主な確認URL：
- `http://localhost:8000/iHub%20MVP%20v1.html` — 全画面統合
- `http://localhost:8000/iHub%20Nego%20Flow.html` — ネゴフロー（最近最も触った）
- `http://localhost:8000/iHub%20C%20Flow.html` — C-1〜C-3
- `http://localhost:8000/iHub%20Propose%20Select.html` — C-0

---

## デザイン規約

### ブランドカラー

```js
// 全画面で useTweaks フック経由
{
  primary:   '#a695d8',  // 紫（lavender）
  secondary: '#a8d4e6',  // 水色（sky）
  accent:    '#f3c5d4',  // ピンク（pink）
}
```

派生色は各 jsx ファイル先頭の `XX_C` 関数で定義（`PS_C`, `NF_C`, `CF_C` など）。

### 命名規約

- ファイル別 prefix を持つ helper：
  - `propose-select.jsx` → `PS_*`（PS_C, PS_MiniMap）
  - `nego-flow.jsx` → `NF_*`（NF_C, NF_MiniMap）
  - `c-flow.jsx` → `CF_*`（CF_MiniMap）
  - `home-variations.jsx` → グローバル（Avatar, Tcg, Ic）
- コンポーネント export は **末尾の `Object.assign(window, {...})`** で行う

### 状態識別子

`notes/09_state_machines.md` の `snake_case` を実装でも使う（例：`negotiating`, `agreed`, `for_trade`）。

---

## 開発・更新ルール（厳守）

1. **デザイン変更**したら必ず `notes/08_design_iterations.md` に新しい iteration として記録
   - 形式: `## イテレーション◯◯：[タイトル]`
   - 背景／変更内容／確認方法／関連ファイルを書く
2. **状態の追加・削除・名称変更**があったら `notes/09_state_machines.md` を更新
3. **新用語**は `notes/10_glossary.md` に追加
4. **廃止用語**は `10_glossary.md` の J. 廃止用語 へ移動（**削除しない**）
5. **未確定項目**は `09_state_machines.md` 末尾の「未確定・要確認項目」表に追加

---

## 直近の主要設計判断（iter 30〜35）

実装着手前に必ず把握しておく：

| iter | 内容 | 影響範囲 |
|---|---|---|
| 30 | 受諾前ネゴ追加（7日期限・3/6日リマインド・延長可） | C-1.5 |
| 31 | ネゴチャットのクイックアクション削除、`+`ボタンに集約 | C-1.5 |
| 32 | 合意フロー（確認モーダル＋成立画面） | C-1.5 |
| 32.5 | C-1.5 から QR ボタン削除（合流前は不要） | C-1.5 |
| 33 | **待ち合わせを合意前にfix**（C-0 に「待ち合わせ」タブ追加） | C-0, C-1, C-1.5, 合意, C-2 |
| 34 | **C-2 取引チャット再定義**（当日ライブ運用へ集約・服装写真CTA強調・現在地共有） | C-2 |
| 35 | **state machines + glossary 整備**（再現可能性確保） | docs |

---

## ステータス・次フェーズ

### ✅ 完了

- 80画面以上の mockup
- 主要設計ドキュメント（要件・状態遷移・用語集）
- ブランドカラー・命名規約

### 🚧 これから（Phase 2）

優先順：
1. `05_data_model.md` 最新化（iter 24-34 反映）
2. `11_screen_inventory.md` 新規（画面遷移マトリクス）
3. `12_screens/` 新規（per-screen spec）
4. `13_api_spec.md` 新規
5. `14_implementation_phases.md` 新規（フェーズ分割）

### 🚧 検討中

- 実装の技術スタック（React Native? Flutter? PWA?）
- BFF / バックエンド設計
- マスタ管理の運用

---

## Claude へのお願い

1. **新規作業時はまず `notes/08, 09, 10` をスキャン**してコンテキストを掴む
2. **デザイン変更時は更新ルール（上記）を守る**
3. **暗黙的な仮定に気付いたら即 `09` の「未確定項目」に追加**
4. **新用語・廃止用語は `10` を都度更新**
5. **「これって何？」と思ったら `10_glossary.md` を最初に検索**
