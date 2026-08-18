# shinEDO-ouen (OUEN-APP)

> 日本の伝統文化を守る人たちが、現金で応援し合うコミュニティアプリ

---

## アプリの概要

「shinEDO-ouen」は、伝統工芸・伝統芸能・地域文化に関わる人々が
**定価より多く支払うことで感謝を伝える**コミュニティアプリです。

定価との差額は **オーエンポイント（OP）** として記録され、
応援の「見える化」によってコミュニティのつながりを深めます。

> OP は記録専用です。購入・換金には使用できません。

---

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| フロントエンド | Vite + React |
| 認証 | Supabase Auth（メールアドレス＋パスワード） |
| データベース | Supabase（Postgres）／Row Level Security |
| ファイル保存 | Supabase Storage（プロフィール写真） |
| ホスティング | Vercel（GitHub連携・自動デプロイ） |

---

## 機能一覧

- **メール認証** — メールアドレス＋パスワードでの新規登録・ログイン
- **プロフィール登録** — 名前・職業・地域・ひとこと・定価メニュー・プロフィール写真
- **ホーム画面** — OP残高 + みんなのおーえんタイムライン
- **おーえんする** — メンバー検索 → メニュー・金額入力 → 確認、の3ステップで応援を送信
- **マイページ** — OP残高・取引履歴・プロフィール編集
- **メンバー一覧** — 登録メンバーの一覧・検索
- **管理画面** — 統計確認・OP手動修正・取引削除（管理者のみ）

---

## OPの計算ロジック

```
獲得OP = 支払い金額 − 定価
```

例：
- 定価 8,000円 → 10,000円支払い → +2,000 OP
- 定価 1,000円 × 2本 → 10,000円支払い → +8,000 OP

---

## クイックスタート

```bash
git clone https://github.com/wasabikami/ouen.git
cd ouen
npm install
cp .env.example .env
# .env を編集してSupabaseの接続情報を記入
npm run dev
```

Supabase側のテーブル・RLS・Storageの初期セットアップは `supabase/schema.sql` と
`supabase/migration_002_avatar.sql` をSupabaseダッシュボードのSQL Editorで実行してください。

詳細は docs/環境構築手順.md を参照してください。

---

## ドキュメント

| ドキュメント | 概要 |
|---|---|
| docs/要件定義書.md | 目的・対象ユーザー・機能要件 |
| docs/仕様書.md | 画面一覧・画面遷移・各画面の仕様 |
| docs/操作手順書.md | 一般ユーザー・管理者・開発者向けの操作手順 |
| docs/データ設計書.md | Supabase（Postgres）のテーブル・RLS・RPC定義 |
| docs/API仕様書.md | Supabase REST/RPC/Storageの呼び出し仕様 |
| docs/セキュリティ設計.md | 対策済み項目・環境変数一覧 |
| docs/環境構築手順.md | clone → 動かすまでの手順 |

---

## ライセンス

MIT License
