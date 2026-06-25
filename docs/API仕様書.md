# API仕様書

**プロジェクト名：** おーえん（OUEN-APP）  
**作成日：** 2026-06-25  
**実行環境：** Vercel Serverless Functions（/api ディレクトリ）

---

## 概要

フロントエンド（React）から直接 Firestore を操作する処理が基本だが、  
以下の処理はサーバーサイドで行う必要があるため Vercel Functions を使用する。

| エンドポイント | 用途 |
|---|---|
| POST /api/identify | Gemini Vision API による写真解析（今後追加） |
| POST /api/approve-transaction | OP残高の原子的更新（取引承認時） |

---

## POST /api/identify

**概要：** プロフィール写真をGemini Vision APIで解析し、説明文を自動生成する

**実装時期：** フェーズ2（写真機能追加時）

### リクエスト

```
POST /api/identify
Content-Type: application/json
Authorization: Bearer {Firebase IDトークン}
```

**リクエストボディ：**

```json
{
  "imageBase64": "data:image/jpeg;base64,/9j/4AAQ...",
  "userId": "AbC123XyZ"
}
```

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| imageBase64 | string | ✅ | Base64エンコードされた画像データ（JPEG/PNG） |
| userId | string | ✅ | リクエスト者のユーザーID |

**制約：**
- 画像サイズ：最大 5MB
- 対応形式：JPEG / PNG / WebP

---

### レスポンス

**成功時 (200)：**

```json
{
  "ok": true,
  "suggestion": {
    "message": "陶芸の作品に囲まれた温かみのある写真です。土の質感と職人の技が伝わります。",
    "tags": ["陶芸", "工芸", "職人"],
    "isSafe": true
  }
}
```

| フィールド | 型 | 説明 |
|---|---|---|
| ok | boolean | 成功かどうか |
| suggestion.message | string | Geminiが生成したひとことの提案（50文字以内） |
| suggestion.tags | string[] | 推定ジャンルタグ（最大3件） |
| suggestion.isSafe | boolean | 不適切な内容でないか |

**エラー時：**

```json
{
  "ok": false,
  "error": "IMAGE_TOO_LARGE",
  "message": "画像サイズが5MBを超えています"
}
```

| エラーコード | 説明 | HTTPステータス |
|---|---|---|
| UNAUTHORIZED | IDトークンが無効 | 401 |
| IMAGE_TOO_LARGE | 画像が5MB超 | 400 |
| UNSAFE_IMAGE | 不適切な画像を検出 | 400 |
| GEMINI_ERROR | Gemini API エラー | 502 |
| INTERNAL_ERROR | その他のサーバーエラー | 500 |

---

## POST /api/approve-transaction

**概要：** 取引を承認し、受け取り者のOP残高を原子的に加算する

### リクエスト

```
POST /api/approve-transaction
Content-Type: application/json
Authorization: Bearer {Firebase IDトークン}
```

**リクエストボディ：**

```json
{
  "transactionId": "Txn789AbC"
}
```

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| transactionId | string | ✅ | 承認する取引のFirestoreドキュメントID |

---

### サーバー側の処理

```
1. IDトークンを検証（Firebase Admin SDK）
2. transactions/{transactionId} を取得
3. toUserId が認証ユーザーと一致するか確認
4. status が "pending" か確認
5. Firestoreトランザクションで以下を実行：
   a. transactions/{id}/status = "approved", approvedAt = now()
   b. users/{toUserId}/op += transaction.op
```

### レスポンス

**成功時 (200)：**

```json
{
  "ok": true,
  "newOp": 14500
}
```

| フィールド | 型 | 説明 |
|---|---|---|
| ok | boolean | 成功かどうか |
| newOp | number | 更新後のOP残高 |

**エラー時：**

```json
{
  "ok": false,
  "error": "NOT_PENDING",
  "message": "この取引はすでに処理済みです"
}
```

| エラーコード | 説明 | HTTPステータス |
|---|---|---|
| UNAUTHORIZED | 認証エラー / 本人以外の操作 | 401 |
| NOT_FOUND | 取引が存在しない | 404 |
| NOT_PENDING | status が pending でない | 409 |
| INTERNAL_ERROR | サーバーエラー | 500 |

---

## 認証方式

すべてのエンドポイントで **Firebase IDトークン** を使用する。

```typescript
// フロントエンド側
const user = auth.currentUser;
const token = await user.getIdToken();

fetch('/api/approve-transaction', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({ transactionId }),
});
```

```typescript
// サーバー側（Vercel Function）
import { adminAuth } from '../lib/firebaseAdmin';

const authHeader = req.headers.authorization;
const token = authHeader?.replace('Bearer ', '');
const decoded = await adminAuth.verifyIdToken(token);
```
