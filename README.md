# iHub Design

K-POP / アニメ等の推し活グッズを **現地で交換**するプラットフォーム「iHub」の **設計・mockup・仕様書** リポジトリ。

> 実装フェーズ前のデザイン＋ドキュメント中心リポジトリ。実装が始まったら別リポと連携予定。

## このリポジトリで扱うもの

- 🎨 **画面 mockup**（React + Babel Standalone でブラウザ即プレビュー可能、80画面以上）
- 📋 **仕様書／設計ドキュメント**（要件定義・データモデル・状態遷移・用語集）
- 📝 **設計判断の履歴**（イテレーション記録）

## ディレクトリ構造

```
.
├── README.md              # このファイル
├── CLAUDE.md              # Claude セッション用 bootstrap doc
├── iHub/                  # 画面 mockup（JSX + HTML）
│   ├── *.jsx              # 各画面のコンポーネント
│   ├── iHub *.html        # フロー単位の表示用 HTML
│   ├── design-canvas.jsx  # Figmaライクなアートボード基盤
│   ├── ios-frame.jsx      # iPhone 枠
│   └── tweaks-panel.jsx   # ブランドカラー切替パネル
└── notes/                 # 設計ドキュメント
    ├── 00_persona.md          # ペルソナ
    ├── 01_user_needs.md       # ユーザーニーズ
    ├── 02_system_requirements.md  # 機能要件
    ├── 03_strategy.md         # 戦略
    ├── 04_prototype_status.md # 既存システム
    ├── 05_data_model.md       # データモデル
    ├── 06_extended_needs.md   # 拡張要件
    ├── 07_mvp_handoff.md      # MVP引き継ぎ
    ├── 08_design_iterations.md # 設計判断の履歴（イテレーション35件）
    ├── 09_state_machines.md   # 状態遷移図（mermaid）
    └── 10_glossary.md         # 用語集
```

## クイックスタート

### mockup を見る

```bash
# プロジェクトルートで
python3 -m http.server 8000

# ブラウザで開く
# http://localhost:8000/iHub%20MVP%20v1.html       — 全画面統合
# http://localhost:8000/iHub%20Nego%20Flow.html    — 受諾前ネゴ
# http://localhost:8000/iHub%20Propose%20Select.html — C-0 提示物選択
# http://localhost:8000/iHub%20C%20Flow.html       — C-1〜C-3
# http://localhost:8000/iHub%20Hub%20Screens.html  — ホーム/プロフ/ウィッシュ
# http://localhost:8000/iHub%20B%20Inventory.html  — 在庫
# http://localhost:8000/iHub%20Auth%20Onboarding.html — 認証＋オンボ
# (他にもあり、iHub/ ディレクトリ参照)
```

iHub フォルダ内 HTML を開けば即動作（依存は CDN から取得）。

## 主要フロー

```
ホーム
  → 検索／マッチカード
  → C-0 提示物選択（譲・受け取る・待ち合わせ の3タブ）
  → C-1 打診送信／受信
  → C-1.5 ネゴチャット（7日期限・3/6日リマインド）
  → 合意確認モーダル
  → 取引成立画面
  → C-2 取引チャット（当日のライブ運用）
  → C-3 証跡撮影＋両者承認＋評価
  → 完了

異常時 → D-flow（dispute）
```

詳細は [`notes/09_state_machines.md`](notes/09_state_machines.md) と [`notes/08_design_iterations.md`](notes/08_design_iterations.md) を参照。

## 技術スタック

- **mockup**: React 18 + Babel Standalone（in-browser JSX 変換、ビルド不要）
- **ドキュメント**: Markdown + Mermaid
- **静的サーバ**: 何でも（`python3 -m http.server` で十分）

実装フェーズの技術スタックは **未確定**。

## ステータス

- ✅ 80画面以上の mockup 完了（Auth〜オンボ〜ホーム〜検索〜在庫〜ウィッシュ〜C-flow〜D-flow〜法的画面）
- ✅ 設計ドキュメント整備中（要件・データモデル・状態遷移・用語集まで）
- 🚧 詳細設計（per-screen spec, API spec）はこれから
- 🚧 実装着手前

## 開発・更新のルール

1. **デザイン変更**したら必ず `notes/08_design_iterations.md` に iteration として記録
2. **状態の追加・変更**は `notes/09_state_machines.md` を更新
3. **新用語**を作ったら `notes/10_glossary.md` に登録
4. **廃止用語**は削除せず `10_glossary.md` の J. 廃止用語 セクションへ移動

## 関連

- 関連リポジトリ: [iHub_renewal](https://github.com/mashimabizz/iHub_renewal)（要確認）
