# モダン OSS コーディングエージェント一覧

LLM API を介して利用できる主要なオープンソースコーディングエージェント・ターミナルツールの詳細情報です。

---

## 目次

1. [ツール比較表](#ツール比較表)
2. [ツール詳細](#ツール詳細)
3. [使い分けガイドライン](#使い分けガイドライン)
4. [参考リンク](#参考リンク)

---

## ツール比較表

| ツール | タイプ | 主な対応LLM | 無料枠 | ライセンス | 特徴 |
|--------|--------|-------------|--------|-----------|------|
| **OpenCode** | Terminal/IDE/Desktop | 任意のプロバイダー | モデル料金のみ | Apache | モデル非依存、LSP連携 |
| **Crush** | Terminal (TUI) | OpenRouter, Gemini, Cerebras等 | モデル料金のみ | MIT | MCP拡張、セッション管理 |
| **Aider** | Terminal | Claude, DeepSeek, GPT等 | モデル料金のみ | Apache | ペアプログラミング、Git統合 |
| **Cline** | VS Code/JetBrains/CLI | OpenRouter, Claude, GPT等 | モデル料金のみ | Apache | 大規模リファクタ対応 |
| **Goose** | Desktop/CLI | Bedrock, Anthropic, Gemini等 | 初回$10 | Apache | Tetrate経由で無料クレジット |
| **Continue** | Terminal/IDE/CI/CD | Anthropic, OpenAI, Gemini等 | モデル料金のみ | AGPL | ミッションコントロール |
| **Gemini CLI** | Terminal | Gemini 2.5 Pro | 60req/min | Apache | Google公式、100万トークン |
| **Codex CLI** | Terminal | GPT-5 Codex, GPT-5 | ChatGPT Plus | Apache | OpenAI公式 |
| **Amp** | - | Claude Opus 4.5, GPT-5.1 | フリーモード | - | Sourcegraph、自律的 |
| **Claude Code** | Terminal | Claude | API従量 | Proprietary | Anthropic公式CLI |

---

## ツール詳細

### OpenCode (sst/opencode)

**概要**: ターミナル/IDE/デスクトップで動作するオープンソースのコーディングエージェント。

**主な特徴**:
- ビルド/プランなど複数の内蔵エージェント
- LSP連携、マルチセッション機能
- モデル非依存で、任意のプロバイダーから利用可能

**対応LLM**:
- APIプロバイダーを問わず利用可能
- Claude, GPT, Gemini など多数のモデルを切り替え可能
- 利用者のAPIキーを設定

**無料枠**:
- OSSで無料（Apache ライセンス）
- モデル利用料は各プロバイダーの料金

**リンク**: https://opencode.ai/

---

### Crush (charmbracelet/crush)

**概要**: クロスプラットフォームのTUIコーディングエージェント。

**主な特徴**:
- セッション管理・LSP連携
- MCP（Model Context Protocol）拡張対応
- 環境変数にAPIキーを設定するだけで複数LLMを切り替え可能

**対応LLM**:
- OpenAI/Anthropic互換APIを備えたモデル
- OpenRouter, Gemini, Cerebras, Huggingface, Vertex AI, Groq, Bedrock など

**無料枠**:
- OSSで無料（MIT ライセンス）
- モデル利用料は各プロバイダーによる

**リンク**: https://github.com/charmbracelet/crush

---

### Aider

**概要**: ターミナルでペアプログラミングを実現するOSS。

**主な特徴**:
- 大規模コードベース対応のマッピング機能
- Gitへの自動コミット
- 音声入力、画像・Webページコンテキスト
- リント/テスト実行
- 送受信トークン数やコストを表示

**対応LLM**:
- Claude Opus/Sonnet
- DeepSeek R1/Chat
- OpenAI GPT (o3-mini など)
- ローカルモデルにも対応

**無料枠**:
- OSSで無料（Apache ライセンス）
- CLIモジュールは pip でインストール
- 使用モデルに応じてAPI料金が発生

**リンク**: https://aider.chat/

---

### Cline

**概要**: VS Code・JetBrains IDE・CLIで使えるオープンソースエージェント。

**主な特徴**:
- コード全体を理解し大規模なリファクタ・計画実行が可能
- 設定画面からAPIプロバイダーとモデルを選択可能
- Claude Sonnet 4.5/DeepSeek V3/Qwen3 Coder などを推奨

**対応LLM**:
- OpenRouter
- Anthropic（Claude）
- OpenAI（GPT）
- Google Gemini
- Ollama など
- 自分のAPIキーを入力して利用

**無料枠**:
- OSSで無料（Apache ライセンス）
- 基本機能は無料
- API利用料は各プロバイダーに従う

**リンク**: https://docs.cline.bot/

---

### Goose

**概要**: Block社が公開したローカルファーストのOSSエージェント。

**主な特徴**:
- デスクトップ/CLIで動作
- MCP拡張に対応
- Tetrate Agent RouterやOpenRouter経由で複数モデルを利用
- 初回にTetrate経由で認証すると10ドル分の無料クレジットが付与

**対応LLM**:
- Amazon Bedrock
- Anthropic
- Azure OpenAI
- Databricks
- Gemini
- OpenAI
- OpenRouter
- Ollama
- Mistral
- Groq など

**無料枠**:
- OSSで無料（Apache ライセンス）
- Tetrate経由の初回認証時に10ドル分無料クレジット
- API利用料は各プロバイダーに基づく

**リンク**: https://block.github.io/goose/

---

### Continue

**概要**: ターミナル・IDE・CI/CDパイプラインでエージェントを実行できるOSS。

**主な特徴**:
- ミッションコントロールでタスク/ワークフローを管理
- CLIはTUIモードとヘッドレスモードを提供
- config.yamlで複数のモデルを指定可能

**対応LLM**:
- Anthropic, OpenAI, Azure, Bedrock, Ollama, Gemini, DeepSeek, Mistral, xAI など多数
- ホストサービス（Groq, Together AI, DeepInfra, OpenRouter, Tetrate など）
- ローカルモデル（LM Studio, llama.cpp など）
- 企業向けモデル（SambaNova, Nebius）

**無料枠**:
- OSSで無料（AGPL ライセンス）
- 基本機能は無料
- モデル料金は各プロバイダーの料金体系

**リンク**: https://docs.continue.dev/

---

### Gemini CLI

**概要**: Googleが提供するオープンソースAIエージェント。

**主な特徴**:
- ターミナルから Gemini 2.5 Pro（100万トークン）を呼び出し
- Google検索の根拠付け・ファイル操作・シェルコマンド・Web取得などのツールを内蔵
- MCPによるカスタム拡張も可能

**対応LLM**:
- Gemini 2.5 Pro

**認証方法**:
- Googleアカウントでのログイン: 60 req/min・1,000 req/dayの無料枠
- APIキーでの利用: 100 req/day

**無料枠**:
- OSSで無料（Apache ライセンス）
- 個人利用は無料枠（60 req/min, 1,000 req/day）
- Paid Code Assist LicenseやVertex AI利用で上限を拡張可能

**リンク**: https://github.com/google-gemini/gemini-cli

---

### Codex CLI

**概要**: OpenAIが開発したRust製CLI。

**主な特徴**:
- リポジトリ内のコードを読み取り、変更し、コマンドの実行もできる
- インタラクティブなTUIを備える
- /modelコマンドでGPT-5 CodexとGPT-5を切り替え
- 画像入力やWeb検索、コードレビューなどの機能

**対応LLM**:
- OpenAIのCodex API
- GPT-5 Codex と GPT-5
- MCP経由で外部ツールも利用可能

**無料枠**:
- OSSで無料（Apache ライセンス）
- ChatGPT Plus/Pro/Businessなどの契約に含まれる
- 追加料金はプランによる

**リンク**: https://developers.openai.com/codex/cli

---

### Amp

**概要**: Sourcegraphが開発した次世代コーディングエージェント。

**主な特徴**:
- Opus 4.5・GPT-5.1など複数の最先端モデルを自動で選択
- サブエージェントやオラクル機能で大規模なタスクを自律的に実行
- スマート／ラッシュ／フリーの3モード
- freeモードは軽量モデルを用いて無償利用可能

**対応LLM**:
- 内部でモデルを自動切り替え
- 主にClaude Opus 4.5 や GPT-5.1 を利用
- ユーザーがAPIキーを設定することは想定されておらず、アカウント登録が必要

**無料枠**:
- フリーモードが提供され、軽量モデル利用時は無料
- スマート/ラッシュは有料クレジット制

**リンク**: https://ampcode.com/

---

### Claude Code

**概要**: Anthropicのターミナルツール。

**主な特徴**:
- コードベースを理解し、ファイル編集・エラー修正・テスト実行・コードレビューを実行
- WebSearch/WebFetch/MultiEditなどのツールを備える
- OpenTelemetryによるトレーシングやVimモードも利用可能

**対応LLM**:
- AnthropicのClaudeモデルを直接利用
- AWS Bedrock・Vertex AI経由で実行することも可能

**無料枠**:
- 閉源だがCLI SDKが提供される
- npmで @anthropic-ai/claude-code をインストールして利用
- 料金はClaude APIの従量課金に準ずる

**リンク**: https://claude.ai/

---

## 使い分けガイドライン

### ターミナル型 vs IDE統合型

#### ターミナル型（推奨）

**利点**:
- 環境非依存
- CIパイプライン統合可能
- 軽量・高速
- スクリプト化可能

**推奨ツール**:
- **Aider**: Git統合、ペアプログラミング
- **Crush**: TUI、MCP拡張
- **Gemini CLI**: Google公式、無料枠豊富

#### IDE統合型

**利点**:
- リアルタイム補完
- UI/UX優れる
- デバッグ統合

**推奨ツール**:
- **Cline**: VS Code/JetBrains
- **Continue**: 多機能、CI/CD対応

---

### 無料枠で選ぶ

| ツール | 無料枠の特徴 | 推奨度 |
|--------|-------------|--------|
| **Goose** | 初回$10クレジット | ⭐⭐⭐ |
| **Gemini CLI** | 60req/min（Google公式） | ⭐⭐⭐ |
| **OpenCode** | モデル非依存、任意のプロバイダー | ⭐⭐ |
| **Aider** | 多機能、コスト表示 | ⭐⭐ |

---

### 用途別推奨

#### Phase 0: 設計・思考

- **Claude Code**: Anthropic公式、設計力高い
- **Amp**: 自律的、複数モデル自動選択

#### Phase 1: 実装

- **OpenCode**: モデル非依存、柔軟
- **Aider**: Git統合、ペアプログラミング
- **Cline**: 大規模リファクタ対応

#### Phase 2: レビュー

- **Codex CLI**: OpenAI公式、コードレビュー機能
- **Continue**: CI/CD統合

---

## 参考情報と留意点

### 無料枠の制限

多くのツールはOSSでツール自体は無料ですが、背後のLLM利用には各プロバイダーのAPI料金やリクエスト上限が適用されます。Gemini CLIなどは無料リクエスト枠を設けていますが、継続的な利用には上位プランや自前のAPIキーが必要です。

### APIキー管理

OpenCode、Crush、Cline、Goose、Continueなどは利用者が独自にAPIキーを設定する方式です。利用可能なモデルやコストは選択したプロバイダー次第であり、プロジェクトに応じて最適なモデルを選択できます。

### プライバシー

多くのツールはデータをプロバイダーに送信しますが、トレーニングに使用しないと明記されている場合もあります。企業用途ではデータ保持ポリシーとモデル提供側の利用規約を確認してください。

### エージェント機能の違い

ツールごとに得意分野が異なります。GooseやClineはローカル実行やMCP拡張で柔軟なワークフローを構築できる一方、AmpやClaude Codeは高度な自律性を持ちます。用途やチーム規模に合わせて選択するのが良いでしょう。

---

## 参考リンク

- [OpenCode](https://opencode.ai/)
- [Crush](https://github.com/charmbracelet/crush)
- [Aider](https://aider.chat/)
- [Cline](https://docs.cline.bot/)
- [Goose](https://block.github.io/goose/)
- [Continue](https://docs.continue.dev/)
- [Gemini CLI](https://github.com/google-gemini/gemini-cli)
- [Codex CLI](https://developers.openai.com/codex/cli)
- [Amp](https://ampcode.com/)
- [Compare the Top 5 Agentic CLI Coding Tools](https://getstream.io/blog/agentic-cli-tools/)

---

*最終更新: 2025年1月*
*情報源: LLM API対応のコーディングエージェント調査（ChatGPT）*
