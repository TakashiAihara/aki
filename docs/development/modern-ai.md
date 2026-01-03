# モダンな AI 開発手法（2025）

## 目的

本ドキュメントは、複数の AI コーディングツールを前提とした **モダンな AI 開発手法** を整理し、
開発者間で共通認識として共有・運用できる状態にすることを目的とする。

---

## 基本思想

### 1. AI は単体では使わない

* 単一 AI に「全部やらせる」構成は取らない
* **工程ごとに役割分担された AI 群** を使う

### 2. Spec-Driven / Decision-Driven

* 仕様（Spec）と意思決定（ADR）を先に固定する
* AI はその制約の中で動かす

### 3. Human-in-the-loop

* 人間は「判断」だけを行う
* 実装・検査・レビューは極力 AI に委譲する

---

## 利用可能 AI ツール一覧

### 実装系（Code Generation）

#### Tier 1: ハードウェアベンダー系（推奨）

| サービス           | 主要モデル                           | 無料枠                    | 速度          | データ学習 | 特徴            |
| -------------- | ------------------------------- | ---------------------- | ----------- | ----- | ------------- |
| **Cerebras**   | Llama 3.3 70B, Qwen3-235B       | 100万トークン/日, 14,400 RPD | 1,800 tok/s | なし    | 最速・最寛大        |
| **Groq**       | Llama 3.3 70B, Qwen3-32B        | 1,000 RPD (70B)        | 500 tok/s   | なし    | クレカ不要         |
| **SambaNova**  | Llama 3.1 405B, 70B             | 10 RPM, 40 RPD (405B)  | 132 tok/s   | なし    | 最大モデル無料       |
| **SiliconFlow** | Qwen 2.5 Coder (7B-72B), DeepSeek V3 | RPM 1,000+, 新規$1クレジット | 中速          | あり    | 日本語コーディング最強   |

**💡 推奨理由**: ハードウェアベンダーは自社チップのデモ目的で寛大な無料枠を提供。データ学習にも使われない。

---

#### Tier 2: プラットフォーム・IDE 統合

| サービス                     | 主要モデル                                  | 無料枠                | データ学習       | 特徴                 |
| ------------------------ | -------------------------------------- | ------------------ | ----------- | ------------------ |
| **OpenRouter**           | DeepSeek R1, Qwen3-Coder-480B など45+    | 20 RPM → $5で1,000+ | 無料モデルはあり    | OpenAI互換API、フェイルオーバー |
| **Goose**                | Bedrock, Anthropic, Gemini等           | 初回$10クレジット        | プロバイダー依存    | Block社、Tetrate経由   |
| **Gemini CLI**           | Gemini 2.5 Pro (100万トークン)            | 60 req/min         | あり（Google）  | Google公式CLI        |
| **Antigravity**          | Gemini 3 Pro, Claude Sonnet 4.5        | 5時間ごとリセット         | なし（Google管理） | VSCode統合、ベータ       |
| **Roo Code / Kilo Code** | OpenRouter 経由                          | OpenRouter制限に準拠    | あり          | IDE密着              |
| **Claude Code**          | Claude Opus 4.5                        | 利用制限あり             | なし          | 設計力・思考力            |

**💡 注目**: Goose は初回 Tetrate 認証で $10 無料クレジット。Gemini CLI は Google 公式で 60 req/min 無料。

---

#### Tier 3: 大手ベンダー

| サービス             | 主要モデル               | 無料枠        | データ学習      | 注意点          |
| ---------------- | ------------------- | ---------- | ---------- | ------------ |
| **Mistral AI**   | Mistral Small, Codestral | 月10億トークン   | あり         | 電話認証必須       |
| **Google AI Studio** | Gemini 2.5 Pro/Flash | Pro: 50 RPD | あり（EU/UK外） | 2025年12月に92%削減 |
| **Anthropic**    | Claude 3.5 Sonnet   | 約$10/月分    | あり         | データ改善に使用     |

⚠️ **警告**: 大手の無料枠は縮小傾向。OpenAI は API 無料枠を廃止済み。

---

### レビュー・品質系

| ツール        | 用途           |
| ---------- | ------------ |
| CodeRabbit | PR 自動レビュー    |
| SonarQube  | 静的解析・技術的負債検出 |

---

### 実験・探索系・OSS CLI

| ツール             | タイプ         | 用途              | 備考           |
| --------------- | ----------- | --------------- | ------------ |
| **Aider**       | CLI (OSS)   | ペアプログラミング、Git統合 | 多機能、コスト表示    |
| **Cline**       | IDE/CLI (OSS) | 大規模リファクタ        | VS Code/JetBrains |
| **Continue**    | CLI/IDE (OSS) | CI/CD統合         | ミッションコントロール  |
| **OpenCode**    | CLI/IDE (OSS) | モデル非依存          | LSP連携        |
| Antigravity     | IDE         | プロトタイピング        | ベータ中無料       |
| Cursor          | IDE         | スポット用途          | 有料プラン推奨      |
| DeepSeek (Web)  | Web         | 推論・コーディング実験     | Web無制限        |

**💡 OSS CLI ツールの利点**:
- 環境非依存、CIパイプライン統合可能
- 任意のLLMプロバイダーを選択可能
- 詳細は [modern-ai-tools.md](modern-ai-tools.md) 参照

---

## 推奨ワークフロー

### Phase 0: 思考・設計（最重要）

**主役：Claude Code**

* 要件整理
* ドメイン分割
* レイヤ設計
* ADR 作成
* データモデル定義

**方針**

* 業務思想・設計意図は学習利用されない環境で作成

---

### Phase 1: 実装（量産）

**推奨構成**

```
メイン: SiliconFlow (Qwen 2.5 Coder 32B)
├─ 日本語コーディング最強
├─ RPM 1,000+ で実質使い放題
└─ Continue.dev / OpenRouter 経由で統合可能

サブ1: Cerebras (Qwen3-235B, Llama 3.3 70B)
├─ 日100万トークンの大量処理
└─ 最速推論（1,800 tok/s）

サブ2: OpenRouter ($5-10 投入推奨)
├─ DeepSeek R1 (reasoning特化)
├─ 複数プロバイダーのフェイルオーバー
└─ OpenAI互換で既存コード流用可
```

**実装タスク**

* CRUD 実装
* API 実装
* テスト雛形生成
* リファクタリング

**方針**

* 生産性優先
* 学習利用は割り切り（ただし業務ロジックの思想は Phase 0 で分離済み）
* 複数プロバイダーで抽象化し、フェイルオーバー可能にする

---

### Phase 2: AI レビュー（自動）

**主役：CodeRabbit / SonarQube**

* PR 単位で自動レビュー
* 命名・責務過多・N+1・複雑度検出

---

### Phase 3: 人間レビュー（最小）

* 設計意図との乖離確認
* 将来壊れやすい構造の検出

---

## 情報漏洩・学習利用に関するポリシー

### データ学習されるサービス

| サービス              | 学習利用 | オプトアウト |
| ----------------- | ---- | ------ |
| Mistral AI        | あり   | 不可     |
| OpenRouter 無料モデル | あり   | 不可     |
| Google AI Studio  | あり   | 地域依存   |
| SiliconFlow       | あり   | 不明     |
| Anthropic Claude  | あり   | 不可     |

### データ学習されないサービス（推奨）

| サービス        | 明示的ポリシー |
| ----------- | ------- |
| Cerebras    | 学習利用なし  |
| Groq        | 学習利用なし  |
| SambaNova   | 学習利用なし  |
| Claude Code | 学習利用なし  |

### コード種別ごとの方針

**学習利用 OK（実装フェーズで使用可）**

* Boilerplate
* CRUD 実装
* Glue Code
* テスト雛形
* 一般的なアルゴリズム

**学習利用 NG（設計フェーズで分離）**

* 業務ロジックの思想・制約
* 独自アーキテクチャ・パターン
* 競争優位性のある設計
* ドメインモデルの定義・関係性

**💡 運用原則**: Phase 0 で業務思想を固定し、Phase 1 では学習利用サービスを使っても良い構成にする。

---

## AI 過剰設計防止ルール

* YAGNI 優先
* 将来拡張を前提にしない
* Aggregate / レイヤは最小構成
* 制約条件を最初に AI に与える

---

## ドキュメント運用ルール

* Spec / ADR / Decision Log は Markdown で管理
* AI が変わっても判断履歴は残す
* PR には関連 ADR を必ずリンク

---

## 無料枠変動リスクへの対策

### 過去の事例

| 事例                  | 日付       | 影響                |
| ------------------- | -------- | ----------------- |
| Together AI 無料枠廃止  | 2025年7月  | 最低$5購入必須に         |
| Google Gemini 92%削減 | 2025年12月 | Pro: 500→50 RPD   |
| OpenAI API無料クレジット廃止 | 2024年後半  | 新規ユーザーへの$5付与終了    |

### リスク軽減策

1. **複数プロバイダーの並行利用**
   - LiteLLM / OpenRouter で抽象化
   - フェイルオーバー設定を必須とする

2. **ツール依存ではなく方法論依存**
   - Phase 0-3 のワークフローは変えない
   - ツールが変わっても運用可能

3. **有料化前提で予算確保**
   - OpenRouter: $5-10/月
   - 将来的に Antigravity 有料化想定

4. **定期的な情報更新**
   - 四半期ごとに無料枠状況をレビュー
   - research.md のような調査ドキュメントを維持

---

## 役割分担まとめ

| 役割     | 担当                                          |
| ------ | ------------------------------------------- |
| 思考・設計  | Claude Code                                 |
| 実装     | SiliconFlow / Cerebras / OpenRouter         |
| 自動レビュー | CodeRabbit / SonarQube                      |
| 意思決定   | 人間                                          |

---

## クイックリンク

### 推奨サービス

| サービス         | URL                              | 備考        |
| ------------ | -------------------------------- | --------- |
| Cerebras     | https://cloud.cerebras.ai        | 要サインアップ   |
| Groq         | https://console.groq.com         | クレカ不要     |
| SiliconFlow  | https://siliconflow.com          | 新規$1クレジット |
| OpenRouter   | https://openrouter.ai            | $5で制限緩和   |
| Goose        | https://block.github.io/goose/   | 初回$10無料   |
| Gemini CLI   | https://github.com/google-gemini/gemini-cli | Google公式  |
| Antigravity  | https://antigravity.google       | ベータ       |
| DeepSeek     | https://api.deepseek.com         | 低価格       |

### OSS コーディングエージェント

| ツール        | URL                              | 備考          |
| ---------- | -------------------------------- | ----------- |
| Aider      | https://aider.chat/              | ペアプログラミング   |
| Cline      | https://docs.cline.bot/          | 大規模リファクタ    |
| Continue   | https://docs.continue.dev/       | CI/CD統合     |
| OpenCode   | https://opencode.ai/             | モデル非依存      |

### 参考リソース

- [modern-ai-tools.md](modern-ai-tools.md) - OSS Coding Agents 詳細ドキュメント
- [free-llm-api-resources (GitHub)](https://github.com/cheahjs/free-llm-api-resources) - 定期更新されるリスト
- [OpenRouter Free Models](https://openrouter.ai/collections/free-models) - 無料モデル一覧
- [AI Free API](https://www.aifreeapi.com) - 無料枠比較サイト

---

## 結論

ツールは変わっても、**方法論が残る** 構成を採用する。
AI は「労働力」、人間は「意志決定者」である。

**重要**: 無料枠は変動する前提で、複数プロバイダーの抽象化とフェイルオーバーを必須とする。

---

*最終更新: 2025年1月*
*情報源: research.md（Claude 調査）をベースに作成*
