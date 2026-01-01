# Architecture Decision Records (ADR)

## ADR とは

Architecture Decision Record（ADR）は、ソフトウェア開発における重要なアーキテクチャ上の決定を記録するドキュメントです。

### なぜ ADR が必要か

- **決定の根拠を残す**: なぜその選択をしたのか、将来振り返れる
- **AI 開発との整合性**: AI ツールが変わっても、判断履歴は残る
- **チーム共有**: 新規参加者が過去の決定を理解できる
- **トレードオフの可視化**: 選択肢と理由が明確になる

## モダン AI 開発ワークフローとの関係

本プロジェクトでは `docs/development/modern-ai.md` で定義した **Spec-Driven / Decision-Driven** アプローチを採用しています。

```
Phase 0: 思考・設計（Claude Code）
├─ 要件整理
├─ ドメイン分割
├─ レイヤ設計
├─ ADR 作成 ← ★ ここで ADR を書く
└─ データモデル定義

Phase 1: 実装（SiliconFlow / Cerebras / OpenRouter）
└─ ADR で固定した設計に従って実装
```

**重要原則**:
- ADR は Phase 0（設計フェーズ）で作成する
- Phase 1 の AI は ADR を参照して実装する
- AI ツールが変わっても ADR は変わらない

---

## いつ ADR を書くべきか

以下のような場合に ADR を作成します:

### 書くべきケース

- [ ] アーキテクチャパターンの選択（レイヤ構成、DDD、CQRS など）
- [ ] 技術スタックの選択（フレームワーク、ライブラリ、データベース）
- [ ] AI ツールの選択・役割分担の決定
- [ ] セキュリティ・パフォーマンスに関わる重要な設計
- [ ] 複数の選択肢があり、トレードオフが存在する決定
- [ ] 将来変更コストが高い決定

### 書かなくて良いケース

- 些細な実装の詳細（変数名、関数名など）
- 簡単に変更できる設定
- 一時的な実験・プロトタイプ

---

## ADR の書き方

### 1. テンプレートを使う

`template.md` をコピーして新しい ADR を作成します。

```bash
cp docs/adr/template.md docs/adr/NNNN-your-decision-title.md
```

### 2. ファイル名の規則

```
NNNN-decision-title.md
```

- `NNNN`: 4桁の連番（例: 0001, 0002, ...）
- `decision-title`: ケバブケース、英語推奨

**例**:
- `0001-adopt-siliconflow-for-phase1-implementation.md`
- `0002-use-postgresql-for-primary-database.md`

### 3. 記入のポイント

#### コンテキスト

- **何が問題か** を明確に
- **なぜ決定が必要か** を説明
- **どのフェーズ** での決定かを明記

#### 決定内容

- **結論を先に** 書く
- 1-2 文で要約

#### 選択肢

- 検討した代替案を **必ず** 列挙
- それぞれの **長所・短所** を記載
- なぜ採用しなかったかを説明

#### 結果

- この決定による **影響** を記載
- **トレードオフ** を明示
- 将来のリスクがあれば記載

---

## ADR のステータス

各 ADR は以下のステータスを持ちます:

| ステータス        | 意味                    |
| ------------ | --------------------- |
| **Proposed** | 提案中（レビュー待ち）           |
| **Accepted** | 承認済み（運用中）             |
| **Deprecated** | 非推奨（新しい決定で置き換え予定）     |
| **Superseded** | 置き換え済み（別の ADR で上書きされた） |

### ステータスの更新

ADR は不変ではありません。状況が変わったら更新します:

1. **非推奨にする**: ステータスを `Deprecated` に変更し、理由を追記
2. **置き換える**: 新しい ADR を作成し、古い ADR のステータスを `Superseded by ADR-NNNN` に変更

---

## PR と ADR の紐付け

### PR テンプレートへの追加

Pull Request には関連する ADR を必ずリンクします:

```markdown
## 関連 ADR

- ADR-0001: Phase 1 実装で SiliconFlow を採用
- ADR-0003: PostgreSQL を主要データベースとして使用
```

### PR 作成時のチェックリスト

- [ ] この変更に関連する ADR は存在するか？
- [ ] 新しい設計決定があれば ADR を作成したか？
- [ ] ADR へのリンクを PR description に追加したか？

---

## サンプル ADR

実際の ADR の例は以下を参照してください:

- [0001-adopt-siliconflow-for-phase1-implementation.md](0001-adopt-siliconflow-for-phase1-implementation.md)

---

## 参考リソース

- [ADR GitHub Organization](https://adr.github.io/)
- [Documenting Architecture Decisions by Michael Nygard](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [ADR Tools](https://github.com/npryce/adr-tools)

---

## FAQ

### Q: ADR は誰が書くべき?

A: Phase 0（設計フェーズ）で決定を行う人が書きます。通常は人間が Claude Code などの設計支援 AI と対話しながら作成します。

### Q: ADR は英語で書くべき？日本語で書くべき？

A: どちらでも構いません。チームで統一してください。本プロジェクトでは日本語を推奨します。

### Q: ADR が多すぎて管理できなくなったら？

A: カテゴリごとにサブディレクトリを作成することを検討してください:

```
docs/adr/
├── architecture/
├── database/
├── ai-tools/
└── security/
```

### Q: 小さな決定も全て ADR にすべき？

A: いいえ。**変更コストが高い決定** や **複数の選択肢がある決定** に絞ってください。

---

*最終更新: 2025年1月*
