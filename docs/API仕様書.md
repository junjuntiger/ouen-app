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

## 4. RPC：create_ouen_transaction / confirm_ouen_transaction

**概要：** 取引の作成とOP加算は2段階のRPCで行う。支払う側の自己申告額だけでOPが増えることを防ぐため、`create_ouen_transaction`は`status='pending'`（確認待ち）で取引を作るだけでOPは加算せず、受け取る側が`confirm_ouen_transaction`を呼んで初めてOPが加算される。

### create_ouen_transaction の呼び出し

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

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| p_to_user_id | uuid | ✅ | 受け取り者の`profiles.id` |
| p_menu_name | text | ✅ | 選択メニューのサマリー文字列 |
| p_items | jsonb | ✅ | 明細配列（`{name, price, quantity, paid}`） |
| p_price | integer | ✅ | 定価合計 |
| p_paid | integer | ✅ | 支払い合計 |
| p_message | text | | 任意メッセージ |

**サーバー側の処理：** 未認証なら例外 → `op = greatest(paid - price, 0)`を計算 → `transactions`に`status='pending'`で1行insert（`from_user_id = auth.uid()`） → insertした行を返す（この時点ではOP加算なし）

### confirm_ouen_transaction の呼び出し

```js
const { data, error } = await supabase.rpc("confirm_ouen_transaction", {
  p_transaction_id: tx.id,
});
```

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| p_transaction_id | uuid | ✅ | 確認する取引の`transactions.id` |

**サーバー側の処理：** 未認証なら例外 → 対象取引を取得 → `to_user_id`が呼び出し本人でなければ例外 → `status`が`pending`でなければ例外（二重確認防止） → `status`を`received`に更新し`confirmed_at`を記録 → `op > 0`なら`profiles.op`を加算 → 更新後の取引行を返す

### レスポンス（両関数共通）

成功時：対象の`transactions`の1行（`data`）
失敗時：`error`に例外内容（未認証、本人以外による確認、二重確認など）

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

## 6. RPC：admin_list_users（管理者専用）

**概要：** `profiles`と`auth.users`をJOINしてメールアドレス付きのユーザー一覧を返す。`profiles`テーブル自体は全ユーザーが閲覧できるため、そこにemailを含めると全員に漏れてしまう。そのため専用のRPCとして分離し、呼び出し元が`is_admin() = true`でなければ例外を返す。

```js
const { data, error } = await supabase.rpc("admin_list_users");
```

パラメータなし。戻り値は`profiles`の全カラムに`email`を加えたテーブル。管理画面のユーザータブでのみ使用する。

---

## 7. 旧設計との差分

旧設計書は「Vercel Functions + Firebase Admin SDK」による独自API（`/api/identify`によるGemini Vision解析、`/api/approve-transaction`による承認処理）を想定していたが、いずれも実装されなかった。
Supabase移行後は取引の承認フロー自体が廃止され（送信と同時に即時OP加算）、写真解析APIも未実装のまま。カスタムサーバーを持たずSupabaseの自動生成APIとRLS/RPCのみで完結する構成になっている。
