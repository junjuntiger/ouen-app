# API仕様書

**プロジェクト名：** shinEDO-ouen（OUEN-APP）
**作成日：** 2026-06-25
**更新日：** 2026-08-17
**実行環境：** Supabase（Auto-generated REST API + RPC）

---

## 概要

本アプリには自前のAPIサーバー（Vercel Functionsなど）は存在しない。
フロントエンド（React）は`@supabase/supabase-js`経由で、Supabaseが自動生成する
REST API・認証API・RPC（データベース関数）を直接呼び出す。認可はサーバーコードではなく
Postgres の Row Level Security（RLS）で行う。

| 呼び出し種別 | 用途 |
|---|---|
| Supabase Auth API | サインアップ・ログイン・ログアウト・セッション管理 |
| Supabase REST（PostgREST） | `profiles` / `transactions` テーブルの参照・更新・削除 |
| Supabase RPC | `create_ouen_transaction()` によるOP加算処理 |
| Supabase Storage API | プロフィール写真のアップロード・公開URL取得 |

---

## 1. 認証（Supabase Auth）

### サインアップ
```js
const { data, error } = await supabase.auth.signUp({ email, password });
```
- Supabase側でメール確認が有効な場合、`data.session`は`null`で返る（確認完了後にログイン可能）

### ログイン
```js
const { error } = await supabase.auth.signInWithPassword({ email, password });
```

### ログアウト
```js
await supabase.auth.signOut();
```

### セッション監視
```js
supabase.auth.getSession();
supabase.auth.onAuthStateChange((event, session) => { ... });
```

---

## 2. profiles テーブル操作

| 操作 | 呼び出し例 | 用途 |
|---|---|---|
| 自分のプロフィール作成 | `supabase.from("profiles").insert({ id, name, ... })` | 初回プロフィール登録（SCR-02） |
| 自分のプロフィール取得 | `supabase.from("profiles").select("*").eq("id", uid).maybeSingle()` | ログイン時のプロフィール判定 |
| 全メンバー取得 | `supabase.from("profiles").select("*")` | メンバー一覧・おーえん相手選択 |
| メンバー一覧取得（OP降順） | `supabase.from("profiles").select("*").order("op", {ascending:false})` | メンバー一覧画面 |
| 自分のプロフィール更新 | `supabase.from("profiles").update({...}).eq("id", uid)` | プロフィール編集・写真更新 |
| 管理者によるOP修正 | `supabase.from("profiles").update({ op: newOp }).eq("id", userId)` | 管理画面（`is_admin`のみRLSで許可） |

いずれもRLSにより、`select`は認証済みユーザーなら誰でも可能、`update`は本人または管理者のみ許可される。

---

## 3. transactions テーブル操作

| 操作 | 呼び出し例 | 用途 |
|---|---|---|
| タイムライン取得 | `supabase.from("transactions").select("*, from_user:profiles!...(name), to_user:profiles!...(name)").order("created_at",{ascending:false}).limit(20)` | ホーム画面 |
| 自分の取引履歴取得 | `.select(...).or("from_user_id.eq.uid,to_user_id.eq.uid")` | マイページ |
| 全取引取得（管理者） | `.select(...).order("created_at",{ascending:false})` | 管理画面 |
| 取引削除（管理者） | `supabase.from("transactions").delete().eq("id", txId)` | 管理画面（`is_admin`のみRLSで許可） |

直接の`insert`はRLSポリシーが存在しないため不可。取引の作成は必ず下記のRPCを経由する。

---

## 4. RPC：create_ouen_transaction

**概要：** 取引を作成し、受け取り者のOP残高を加算する。挿入と加算をPostgres関数内でアトミックに実行するため、途中失敗によるOPの二重加算・未加算は発生しない。

### 呼び出し

```js
const { data, error } = await supabase.rpc("create_ouen_transaction", {
  p_to_user_id: selectedMember.id,
  p_menu_name: menuNameSummary,
  p_items: cartItems,
  p_price: cartTotal,
  p_paid: totalPaid,
  p_message: message.trim() || null,
});
```

### パラメータ

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| p_to_user_id | uuid | ✅ | 受け取り者の`profiles.id` |
| p_menu_name | text | ✅ | 選択メニューのサマリー文字列 |
| p_items | jsonb | ✅ | 明細配列（`{name, price, quantity, paid}`） |
| p_price | integer | ✅ | 定価合計 |
| p_paid | integer | ✅ | 支払い合計 |
| p_message | text | | 任意メッセージ |

### サーバー側の処理（Postgres関数内）

```
1. auth.uid() が null でないことを確認（未認証なら例外）
2. op = greatest(paid - price, 0) を計算
3. transactions に1行insert（from_user_id = auth.uid()）
4. op > 0 の場合、profiles.op を to_user_id の行に加算
5. insertした取引行を返す
```

### レスポンス

成功時：作成された`transactions`の1行（`data`）
失敗時：`error`に例外内容（未認証、外部キー制約違反など）

---

## 5. Storage API（プロフィール写真）

```js
// アップロード（本人フォルダにのみ書き込み可）
await supabase.storage.from("avatars").upload(`${uid}/avatar`, file, {
  upsert: true,
  contentType: file.type,
});

// 公開URL取得
const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(`${uid}/avatar`);
```

- バケットは公開（`public: true`）のため、`publicUrl`は誰でも閲覧可能
- 書き込みはStorageのRLSにより本人の`{uid}/`フォルダのみ許可

---

## 6. 旧設計との差分

旧設計書は「Vercel Functions + Firebase Admin SDK」による独自API（`/api/identify`によるGemini Vision解析、`/api/approve-transaction`による承認処理）を想定していたが、いずれも実装されなかった。
Supabase移行後は取引の承認フロー自体が廃止され（送信と同時に即時OP加算）、写真解析APIも未実装のまま。カスタムサーバーを持たずSupabaseの自動生成APIとRLS/RPCのみで完結する構成になっている。
