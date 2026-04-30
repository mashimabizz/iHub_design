# 12. Per-Screen Spec ディレクトリ

> **目的**：各画面の詳細仕様（state / 入出力 / アクション / バリデーション / エラー / 関連API / 関連docs）を per-screen で文書化。
> 実装着手時に「この画面はどう作る？」が一発で引ける一次資料。

最終更新: 2026-05-01
ステータス: Draft v1.0（iter41）

---

## このディレクトリの位置付け

- `notes/11_screen_inventory.md` の各画面に対応する詳細仕様
- 1ファイル = 1画面（または論理的にグループ化された画面群）
- 状態・遷移は `notes/09_state_machines.md` を参照
- 用語は `notes/10_glossary.md` を参照
- データモデルは `notes/05_data_model.md` を参照

## ファイル命名規約

```
[画面ID].md
```

または論理グループの場合：

```
[フロー名]_[画面群名].md
```

例：
- `C-0_propose_select.md`（C-0 の6サブ画面を1ファイルで）
- `C-1_receive.md`（C-1 受信画面）
- `C-1.5_nego_chat.md`（C-1.5 の5シナリオ + 合意モーダル + 成立画面）
- `C-2_trade_chat.md`（C-2 取引チャット）
- `C-3_complete.md`（C-3 の3ステップ：撮影・承認・評価）

## 各 spec の章立て

```markdown
# [画面ID]: [画面名]

## 画面の目的
何のための画面か。1-2行で。

## 入力データ（state, props, route params）
- React state（useState の中身）
- props
- ルートパラメータ・前画面からの引き継ぎ
- データモデル参照

## 表示要素
ヘッダー、本体、CTA、モーダル等の構造的説明。

## アクション（ユーザー操作と遷移先）
- 「Xボタン押下 → Y画面へ遷移、Z状態に変化」
- 状態遷移は `09_state_machines.md` の状態名と一致

## バリデーション・エラー
入力チェック、エラー表示、無効状態など。

## エッジケース
通信失敗、データなし、権限なし等。

## 関連 API（仮）
将来 `13_api_spec.md` で確定する。現段階では「⚠️ 要確認」マーク。

## 関連 docs
- 09 状態遷移
- 10 用語集
- 05 データモデル
- 11 画面インベントリ
```

## 更新ルール

- 画面の実装が変わったら必ずこの spec も更新
- 「⚠️ 要確認」項目は実装着手で詰めて消していく
- 状態名・用語は他docs と完全整合（揃えないと無意味）

## 収録ファイル一覧（iter41 時点）

| ファイル | 対象画面 | 関連JSX |
|---|---|---|
| [`C-0_propose_select.md`](C-0_propose_select.md) | 提示物選択（6 variant） | `propose-select.jsx` |
| [`C-1_receive.md`](C-1_receive.md) | 打診受信 | `nego-flow.jsx::C1ReceiveScreen` |
| [`C-1.5_nego_chat.md`](C-1.5_nego_chat.md) | ネゴチャット（5シナリオ + 合意モーダル + 成立画面） | `nego-flow.jsx::C15NegoChatScreen` 他 |
| [`C-2_trade_chat.md`](C-2_trade_chat.md) | 取引チャット（合意後・当日運用） | `c-flow.jsx::ChatScreen` |
| [`C-3_complete.md`](C-3_complete.md) | 取引完了（撮影・承認・評価） | `c-flow.jsx::CompleteScreen` |

## 未着手の画面（次フェーズで追加予定）

優先順：
1. ホーム（`HOM-main`）
2. C-1 打診送信（`C1-propose`）
3. AW 編集（`AW-edit-event`/`AW-edit-location`）
4. 在庫管理（`INV-grid`、B-2 撮影フロー）
5. 認証・オンボーディング（13画面、まとめて1-2ファイル）
6. ウィッシュ（`WSH-list`/`WSH-edit`）
7. プロフィール（`PRO-hub`/`PRO-edit`）
8. 検索（`SCH-main`/`SCH-filter`）
9. D-flow（14画面、まとめて1-2ファイル）
10. 取引タブ・通報・ヘルプ・設定・法的画面
11. コレクション図鑑

総spec数：最終的に 15-20 ファイル想定。
全 89画面を spec 化する必要はなく、複雑な画面のみで十分。
