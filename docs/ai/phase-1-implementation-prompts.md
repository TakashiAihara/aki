# Phase 1: 実装フェーズ用プロンプト集

Phase 1（実装フェーズ）で使用するプロンプトテンプレート集です。

**対象ツール**: SiliconFlow / Cerebras / OpenRouter

---

## 目次

1. [CRUD 実装](#1-crud-実装)
2. [API 実装](#2-api-実装)
3. [テスト雛形生成](#3-テスト雛形生成)
4. [リファクタリング](#4-リファクタリング)

---

## 重要な前提

Phase 1 では **Phase 0 で固定した設計に従って実装** します。

### 必須事項

- [ ] Phase 0 で ADR / Spec が作成済み
- [ ] 設計が承認済み
- [ ] 実装する内容が明確

### プロンプトに含めるべき情報

1. **ADR / Spec への参照**
2. **YAGNI 制約の明示**
3. **具体的な仕様**
4. **出力形式の指定**

---

## 1. CRUD 実装

### テンプレート

```markdown
【タスク】
ADR-NNNN で定義した [エンティティ名] の CRUD 処理を実装

【参照】
docs/adr/NNNN-xxx.md

【エンティティ定義】
```typescript
interface [EntityName] {
  [field1]: [type];
  [field2]: [type];
}
```

【実装する処理】
- Create: [説明]
- Read: [説明]
- Update: [説明]
- Delete: [説明]

【制約】
- YAGNI 原則
- 余計な抽象化は追加しない
- 既存の [XXX] パターンに従う

【出力】
- 言語: [言語]
- ORM: [ORM名]
- エラーハンドリング: [方針]
- テストコード: [要/不要]
```

---

### 実例: TypeScript + Prisma

```markdown
【タスク】
ADR-0004 で定義した User エンティティの CRUD Repository を実装

【参照】
docs/adr/0004-user-entity-design.md

【エンティティ定義】
```typescript
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}
```

【実装する処理】
- Create: 新規ユーザー作成（メールは一意制約）
- Read: ID による取得、メールによる取得
- Update: 名前・メールの更新
- Delete: 論理削除（deletedAt を設定）

【制約】
- YAGNI 原則
- 余計なヘルパーメソッドは追加しない
- トランザクション管理は呼び出し側で行う
- バリデーションは別レイヤで実施済み

【出力】
- 言語: TypeScript
- ORM: Prisma
- クラス名: UserRepository
- エラーハンドリング: 例外をスロー
- テストコード: 不要（後で追加）
```

---

## 2. API 実装

### テンプレート

```markdown
【タスク】
ADR-NNNN で定義した [API名] を実装

【参照】
docs/adr/NNNN-xxx.md

【エンドポイント】
- [METHOD] [PATH] - [説明]
- [METHOD] [PATH] - [説明]

【リクエスト/レスポンス】
```json
// Request
{
  "field1": "value1"
}

// Response
{
  "field1": "value1"
}
```

【制約】
- YAGNI 原則
- バリデーションは [XXX] で実施
- 認証は [XXX] ミドルウェアで実施済み
- エラーレスポンスは既存の形式に従う

【出力】
- 言語: [言語]
- フレームワーク: [フレームワーク]
- ルーティング: [ファイルパス]
- コントローラー: [ファイルパス]
```

---

### 実例: Express + TypeScript

```markdown
【タスク】
ADR-0005 で定義した User API を実装

【参照】
docs/adr/0005-user-api-design.md

【エンドポイント】
- GET /api/users/:id - ユーザー取得
- POST /api/users - ユーザー作成
- PUT /api/users/:id - ユーザー更新
- DELETE /api/users/:id - ユーザー削除（論理削除）

【リクエスト/レスポンス】
```json
// POST /api/users
{
  "name": "Taro Yamada",
  "email": "taro@example.com"
}

// Response 200
{
  "id": "uuid-xxx",
  "name": "Taro Yamada",
  "email": "taro@example.com",
  "createdAt": "2025-01-01T00:00:00Z"
}

// Error 400
{
  "error": "Invalid email format"
}
```

【制約】
- YAGNI 原則
- バリデーションは既存の `validateUser` 関数を使用
- 認証は `authMiddleware` で実施済み
- エラーレスポンスは `ErrorHandler` クラスに従う

【出力】
- 言語: TypeScript
- フレームワーク: Express
- ルーティング: src/routes/users.ts
- コントローラー: src/controllers/UserController.ts
- 既存のコードスタイルに従う
```

---

## 3. テスト雛形生成

### テンプレート

```markdown
【タスク】
[対象ファイル] のユニットテストを作成

【対象コード】
```typescript
[テスト対象のコードを貼り付け]
```

【テストケース】
- [ケース1]: [期待する動作]
- [ケース2]: [期待する動作]
- [ケース3]: [エラーケース]

【制約】
- テストフレームワーク: [Jest / Mocha / など]
- モック: [使用する / 使用しない]
- カバレッジ: [目標値]

【出力】
- ファイルパス: [パス]
- 既存のテストパターンに従う
```

---

### 実例: Jest

```markdown
【タスク】
UserRepository のユニットテストを作成

【対象コード】
```typescript
class UserRepository {
  async create(data: CreateUserData): Promise<User> { ... }
  async findById(id: string): Promise<User | null> { ... }
  async update(id: string, data: UpdateUserData): Promise<User> { ... }
  async delete(id: string): Promise<void> { ... }
}
```

【テストケース】
- create: 正常にユーザーが作成できる
- create: メール重複時にエラーをスローする
- findById: 存在するユーザーを取得できる
- findById: 存在しないユーザーは null を返す
- update: 正常にユーザーが更新できる
- delete: 論理削除が実行される（deletedAt が設定される）

【制約】
- テストフレームワーク: Jest
- モック: Prisma Client をモック
- カバレッジ: 80% 以上

【出力】
- ファイルパス: src/repositories/__tests__/UserRepository.test.ts
- 既存のテストパターンに従う
```

---

## 4. リファクタリング

### テンプレート

```markdown
【タスク】
[対象コード] をリファクタリング

【対象コード】
```typescript
[リファクタリング対象のコードを貼り付け]
```

【リファクタリング方針】
- [問題点1] を解消
- [問題点2] を解消

【制約】
- YAGNI 原則
- 過剰な抽象化は避ける
- 既存のテストが全て通ること
- 機能は変更しない（動作は同じ）

【出力】
- リファクタリング後のコード
- 変更点の説明
```

---

### 実例

```markdown
【タスク】
UserController をリファクタリング

【対象コード】
```typescript
class UserController {
  async create(req, res) {
    try {
      const user = await this.userRepository.create(req.body);
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  // ... 他のメソッドも同じパターン
}
```

【リファクタリング方針】
- エラーハンドリングが重複している → 共通化
- バリデーションが Controller に書かれている → 別レイヤに分離

【制約】
- YAGNI 原則
- 既存のテストが全て通ること
- 機能は変更しない
- 過剰な抽象化は避ける（今回は共通化のみ）

【出力】
- リファクタリング後のコード
- 変更点の説明
- 既存のテストが通ることを確認
```

---

## プロンプト活用の流れ

### ステップ1: ADR / Spec を確認

```
Phase 0 で作成した設計ドキュメントを読む
```

### ステップ2: プロンプトテンプレートを選択

```
実装内容に応じて適切なテンプレートを選ぶ
```

### ステップ3: プロンプトをカスタマイズ

```
ADR参照、エンティティ定義、制約などを埋める
```

### ステップ4: AI に投げる

```
SiliconFlow / Cerebras / OpenRouter に投げる
```

### ステップ5: レビュー

```
出力結果を確認し、YAGNI違反がないかチェック
```

---

## ツール別の使い分け

### SiliconFlow（推奨）

**使うべきケース**:
- 日本語コメントが必要
- 標準的な CRUD / API 実装
- 既存コードのスタイルを踏襲したい

**プロンプトの工夫**:
```markdown
「以下のサンプルコードと同じスタイルで実装してください」
[サンプルコードを添付]
```

---

### Cerebras

**使うべきケース**:
- 大量の CRUD を一括生成
- 高速に実装したい

**プロンプトの工夫**:
```markdown
「以下の10個のエンティティに対して、同じパターンで Repository を生成してください」
[エンティティリスト]
```

---

### OpenRouter (DeepSeek R1)

**使うべきケース**:
- 複雑なビジネスロジック
- アルゴリズムの実装

**プロンプトの工夫**:
```markdown
「以下のビジネスルールを満たすアルゴリズムを、段階的に推論しながら実装してください」
[ルール]
```

---

## Tips

### 1. サンプルコードを添付する

SiliconFlow は既存コードのスタイルを踏襲するのが得意です。

```markdown
【サンプルコード】
```typescript
// 既存の ProductRepository
class ProductRepository { ... }
```

同じスタイルで UserRepository を実装してください。
```

---

### 2. 「やらないこと」を明示する

```markdown
【実装しないもの】
- キャッシュ層（YAGNI）
- トランザクション管理（別レイヤで対応）
- 複雑なクエリ（必要になったら後で追加）
```

---

### 3. 出力形式を具体的に指定

```markdown
【出力形式】
- TypeScript
- クラスベース
- JSDoc コメント付き
- エラーは例外をスロー
- テストコードは不要
```

---

*最終更新: 2025年1月*
