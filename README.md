# おーえん (OUEN-APP)

> 日本の伝統文化を守る人たちが、現金で応援し合うコミュニティアプリ

---

## アプリの概要

「おーえん」は、伝統工芸・伝統芸能・地域文化に関わる人々が  
**定価より多く支払うことで感謝を伝える**コミュニティアプリです。

定価との差額は **オーエンポイント（OP）** として記録され、  
応援の「見える化」によってコミュニティのつながりを深めます。

> OP は記録専用です。購入・換金には使用できません。

---

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| フロントエンド | Vite + React + TypeScript |
| スタイリング | Tailwind CSS v4 |
| 認証 | Firebase Authentication（SMS電話番号認証） |
| データベース | Firebase Firestore |
| ファイル保存 | Firebase Storage（写真機能・今後追加） |
| AI機能 | Google Gemini API（@google/generative-ai）|
| ホスティング | Vercel（GitHub連携・自動デプロイ） |

---

## 機能一覧

- **SMS認証** — 電話番号でログイン（reCAPTCHA対応）
- **プロフィール登録** — 名前・職業・地域・ひとこと・定価メニュー
- **ホーム画面** — OP残高 + リアルタイムタイムライン
- **おーえんする** — QRスキャン or メンバー検索 → 取引フロー → 双方承認
- **マイページ** — OP残高・取引履歴・プロフィール編集
- **メンバー一覧** — 登録メンバーとOP残高の一覧

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
git clone https://github.com/YOUR_USERNAME/OUEN-APP.git
cd OUEN-APP
npm install
cp .env.example .env.local
# .env.local を編集して Firebase / Gemini の設定を記入
npm run dev
```

詳細は docs/環境構築手順.md を参照してください。

---

## ドキュメント

| ドキュメント | 概要 |
|---|---|
| docs/要件定義書.md | 目的・対象ユーザー・機能要件 |
| docs/仕様書.md | 画面一覧・画面遷移・各画面の仕様 |
| docs/データ設計書.md | Firestoreのコレクション・フィールド定義 |
| docs/API仕様書.md | Vercel Functions のエンドポイント仕様 |
| docs/セキュリティ設計.md | 対策済み項目・環境変数一覧 |
| docs/環境構築手順.md | clone → 動かすまでの手順 |

---

## ライセンス

MIT License
