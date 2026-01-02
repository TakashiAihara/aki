<!--
Sync Impact Report:
Version: 1.0.0 → 1.1.0 (Authentication strategy update + Mental scope clarification)
Modified principles:
  - Principle III (DDD): Mental context expanded to include task management
  - Principle VII (Security & Privacy): Authentication changed to OAuth 2.0 only (Google + Apple Sign In)
Added sections: None
Removed sections: None
Templates requiring updates:
  - ✅ .specify/templates/plan-template.md (Constitution Check aligns)
  - ✅ .specify/templates/spec-template.md (no changes needed)
  - ✅ .specify/templates/tasks-template.md (no changes needed)
  - ✅ Command files (no changes needed)
Follow-up TODOs: None
-->

# Akimi Constitution

**Project**: AI-Integrated Health Management Platform (Web + Mobile)
**Mission**: 生活の中の健康にかかわるすべてを管理し、LLM が励ましたり生活を手伝うための総合健康管理プラットフォーム

## Core Principles

### I. Specification-Driven Development (NON-NEGOTIABLE)

**まず仕様を書き、その後に実装する。**

- すべての機能は、実装前に `.specify/` ディレクトリ配下に仕様 (spec.md) を作成しなければならない
- 仕様には、ユーザーストーリー、機能要件、成功基準が明確に定義されている必要がある
- 仕様が承認されるまで、実装を開始してはならない
- 曖昧さが残る場合は、`/speckit.clarify` を使用して明確化する

**Rationale**: 健康管理という人命に関わる領域では、仕様の明確化と合意形成が最優先。後戻りを防ぎ、安全性と品質を確保する。

### II. Test-Driven Development (NON-NEGOTIABLE)

**テストを先に書き、Red-Green-Refactor サイクルを厳守する。**

- すべての実装は、テストを先に書き、そのテストが失敗することを確認してから開始する
- テストが成功するまで、実装を続ける (Green)
- テストが通ったら、リファクタリングを行う (Refactor)
- 統合テストとコントラクトテストを必須とする:
  - **Contract Tests**: サービス間の API インターフェース契約を検証
  - **Integration Tests**: ユーザージャーニー全体を検証
  - **Unit Tests**: 個別のビジネスロジックを検証

**Rationale**: 健康データの正確性と信頼性は譲れない。TDD により、バグを早期に発見し、リグレッションを防ぐ。

### III. Domain-Driven Design (DDD)

**ドメインモデルを中心に設計し、ビジネスロジックをドメイン層に集約する。**

- ドメインは以下のバウンデッドコンテキストに分割する:
  - **User**: ユーザー管理、認証・認可（OAuth 2.0 基盤）
  - **Medication**: 服薬管理、服薬記録、リマインダー
  - **Mental**: タスク管理、日記、気分トラッキング、精神面サポート、LLM によるカウンセリング
  - **Nutrition**: 食材管理、在庫管理、賞味期限管理、栄養分析
  - **Diet**: ダイエットサポート、献立サポート、カロリー計算
  - **AI**: LLM 統合、プロンプト管理、AI アシスタント機能、全データ統合
- 各バウンデッドコンテキストは独立したマイクロサービスとして実装する
- ドメインイベントを使用してサービス間通信を行う
- インフラストラクチャ層がドメイン層に依存してはならない (依存性逆転の原則)

**Implementation Priority** (v1.0 MVP):
1. **User** - 認証基盤（全サービスの前提）
2. **Medication** - 服薬管理
3. **Mental** - タスク管理機能
4. 以降: Nutrition, Diet, AI（v2.0以降）

**Rationale**: 複雑な健康管理ドメインを適切に分割し、変更に強く、理解しやすいシステムを構築する。優先順位は技術的依存関係とビジネス価値に基づく。

### IV. Microservices Architecture

**各バウンデッドコンテキストを独立したマイクロサービスとして実装する。**

- 各マイクロサービスは独自のデータベースを持つ (Database per Service パターン)
- サービス間通信は、イベント駆動アーキテクチャ (EDA) を採用する
- API Gateway パターンを使用してクライアントからのアクセスを統一する
- サービスディスカバリとロードバランシングを実装する
- 各サービスは独立してデプロイ可能でなければならない

**Rationale**: スケーラビリティ、保守性、チーム間の並行開発を実現。各ドメインを独立して進化させる。

### V. Monorepo & TypeScript

**すべてのコードを単一リポジトリで管理し、TypeScript で実装する。**

- Monorepo 構成を採用し、すべてのマイクロサービス、フロントエンド、共有ライブラリを一元管理する
- パッケージマネージャーは pnpm または Turborepo を使用する
- TypeScript を使用し、型安全性を確保する
- 共通のインターフェース、型定義、ユーティリティは `packages/shared/` に配置する
- ESLint、Prettier による統一されたコーディング規約を適用する

**Rationale**: コード共有、依存関係管理、リファクタリングの容易さを実現。型安全性により実行時エラーを削減。

### VI. Observability & Monitoring

**すべてのサービスはログ、メトリクス、トレースを提供しなければならない。**

- 構造化ロギング (JSON 形式) を使用する
- 分散トレーシングを実装し、リクエストの流れを追跡可能にする
- ヘルスチェックエンドポイント (`/health`) を各サービスに実装する
- エラーは適切なログレベル (ERROR, WARN, INFO, DEBUG) で記録する
- 健康データに関わるエラーは、必ず通知される仕組みを実装する

**Rationale**: 本番環境での問題を迅速に特定・解決するため。健康管理アプリでは、障害の早期発見が重要。

### VII. Security & Privacy

**健康データのプライバシーとセキュリティを最優先する。**

- すべての健康データは暗号化して保存する (at rest encryption)
- 通信は HTTPS/TLS を使用する (in transit encryption)
- 認証・認可は **OAuth 2.0 / OpenID Connect のみ**を使用する
  - **Google OAuth 2.0** (Web, Android, iOS)
  - **Apple Sign In** (iOS, Web)
  - メール/パスワード認証は実装しない（OAuth プロバイダーに認証を委譲）
- JWT をセッショントークンとして使用する
- GDPR および個人情報保護法に準拠する
- 医薬品データベースやアレルギー情報は、信頼できる外部 API を使用する
- LLM への入力データは、個人を特定できない形式にマスキングする
- すべての API エンドポイントは、認証・認可チェックを行う

**Rationale**: 健康データは極めてセンシティブ。OAuth 2.0 専用とすることで、パスワード管理の脆弱性を排除し、ユーザーの既存認証情報を活用してセキュリティと利便性を両立する。

## Architecture & Technology Standards

### Technology Stack

- **Language**: TypeScript (Node.js 20 LTS)
- **Backend Framework**: NestJS (マイクロサービス対応)
- **Frontend (Web)**: Next.js 14 (App Router)
- **Mobile**: React Native (Expo)
- **CLI**: Commander.js
- **Database**: PostgreSQL (各マイクロサービス), Redis (キャッシュ)
- **Message Queue**: RabbitMQ または AWS SQS (イベント駆動通信)
- **API Gateway**: Kong または AWS API Gateway
- **Container**: Docker, Kubernetes (本番環境)
- **CI/CD**: GitHub Actions
- **Testing**: Jest (unit), Supertest (integration), Pact (contract), Playwright (E2E web), Detox (E2E mobile)
- **Authentication**: Passport.js (Google OAuth + Apple Sign In)

### Project Structure (Monorepo)

```
akimi/
├── apps/
│   ├── api-gateway/          # API Gateway
│   ├── web/                  # Next.js Web App
│   ├── mobile/               # React Native Mobile App
│   └── cli/                  # CLI ツール
├── services/
│   ├── user/                 # ユーザー管理・認証マイクロサービス (P0 - 最優先)
│   ├── medication/           # 服薬管理マイクロサービス (P1)
│   ├── mental/               # タスク管理・日記・精神面マイクロサービス (P2)
│   ├── nutrition/            # 栄養・食材管理マイクロサービス (保留)
│   ├── diet/                 # ダイエット・献立マイクロサービス (v2.0)
│   └── ai/                   # LLM 統合マイクロサービス (v2.0)
├── packages/
│   ├── shared/               # 共通型定義、ユーティリティ
│   ├── ui/                   # 共通 UI コンポーネント
│   └── domain/               # ドメインモデル共有
├── .specify/                 # Spec Kit 仕様管理
└── specs/                    # 各機能の仕様ドキュメント
```

### Versioning Policy

- セマンティックバージョニング (MAJOR.MINOR.PATCH) を採用する
- **MAJOR**: 破壊的変更 (API の非互換な変更)
- **MINOR**: 後方互換性のある機能追加
- **PATCH**: 後方互換性のあるバグ修正
- 各マイクロサービスは独立してバージョン管理する
- 共有パッケージのバージョン変更は、依存するサービスの影響を確認する

## Development Workflow

### Feature Development Flow

1. **Constitution Review**: この憲法を確認し、原則を理解する
2. **Specification**: `/speckit.specify` で機能仕様を作成し、承認を得る
3. **Planning**: `/speckit.plan` で技術的な実装計画を作成する
4. **Task Breakdown**: `/speckit.tasks` でタスクに分解する
5. **Test First**: テストを先に書き、失敗することを確認する
6. **Implementation**: `/speckit.implement` で実装する (Red → Green → Refactor)
7. **Review**: コードレビューを行い、原則への適合を確認する
8. **Deploy**: 各マイクロサービスを独立してデプロイする

### Pull Request Requirements

- すべての PR は、対応する仕様ドキュメント (spec.md) へのリンクを含む
- すべてのテストが成功していること
- コードカバレッジが 80% 以上であること
- ESLint、Prettier によるフォーマットチェックが通ること
- 最低 1 名のレビュアーによる承認が必要
- 健康データに関わる変更は、2 名以上のレビューが必要

### Quality Gates

- **Contract Tests**: すべての API エンドポイントのコントラクトテストが成功していること
- **Integration Tests**: ユーザージャーニーの統合テストが成功していること
- **Security Scan**: 依存関係の脆弱性スキャンが成功していること
- **Performance**: レスポンスタイムが p95 で 500ms 以下であること

## Governance

### Amendment Process

- この憲法の修正は、すべてのコアメンバーの承認が必要
- 修正時は、バージョンを更新し、変更履歴を記録する
- 憲法の変更は、すべての仕様テンプレートとドキュメントに反映する

### Compliance & Review

- すべての PR とコードレビューは、この憲法への準拠を確認する
- 四半期ごとに憲法のレビューを行い、プロジェクトの成長に合わせて更新する
- 複雑さの導入は、明確な理由とトレードオフの説明が必要

### Exception Handling

- 憲法からの逸脱は、技術的負債として Issue に記録する
- 例外的な実装は、必ず Complexity Tracking テーブル (plan.md) に記載する
- 技術的負債は、四半期ごとに見直し、解消計画を立てる

**Version**: 1.1.0 | **Ratified**: 2025-12-29 | **Last Amended**: 2026-01-02
