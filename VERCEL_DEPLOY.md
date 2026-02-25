# Vercel デプロイ手順

## 🔐 事前準備：環境変数の確認

デプロイ前に、以下の環境変数の値を手元に用意してください。

### 必須の環境変数

#### 1. Firebase Client SDK（フロントエンド用）
`.env.local`から以下の値をコピー：

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

#### 2. Firebase Admin SDK（サーバーサイド・Webhook用）
`udemy-sns-b9e40-firebase-adminsdk-fbsvc-3728d79e27.json`ファイルの内容を**1行のJSON文字列**に変換：

```bash
# macOS/Linux
cat udemy-sns-b9e40-firebase-adminsdk-fbsvc-3728d79e27.json | jq -c

# または手動でコピー（改行なしの1行にする）
```

#### 3. Ko-fi Webhook Verification Token（オプション）
Ko-fiダッシュボードで設定したトークン

---

## 📦 Step 1: GitHubにプッシュ

### 1-1. Gitリポジトリの初期化

```bash
cd /Users/sugimoto/Desktop/foove_test/demo

# Gitリポジトリを初期化
git init

# 全ファイルをステージング
git add .

# 初回コミット
git commit -m "Initial commit: Ko-fi superchat demo"
```

### 1-2. GitHubリポジトリを作成

1. https://github.com/new にアクセス
2. リポジトリ名を入力（例：`kofi-superchat-demo`）
3. **Private**を選択（推奨）
4. 「Create repository」をクリック

### 1-3. リモートリポジトリに接続してプッシュ

GitHubで表示されたコマンドをコピーして実行：

```bash
git remote add origin https://github.com/あなたのユーザー名/リポジトリ名.git
git branch -M main
git push -u origin main
```

---

## ☁️ Step 2: Vercelにデプロイ

### 2-1. Vercelプロジェクトのインポート

1. https://vercel.com にアクセスしてログイン
2. 「Add New」 > 「Project」をクリック
3. GitHubリポジトリを選択
4. 「Import」をクリック

### 2-2. プロジェクト設定

**Framework Preset**: Next.js（自動検出）
**Root Directory**: `./`（変更不要）
**Build Command**: `npm run build`（変更不要）

「Deploy」ボタンは**まだ押さない**

---

## 🔧 Step 3: 環境変数の設定

デプロイ前に環境変数を設定します。

### 3-1. Vercelダッシュボードで環境変数を追加

「Environment Variables」セクションで以下を追加：

#### Firebase Client SDK

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `.env.local`からコピー |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `.env.local`からコピー |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `udemy-sns-b9e40` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `.env.local`からコピー |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `.env.local`からコピー |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `.env.local`からコピー |

#### Firebase Admin SDK

| Key | Value |
|-----|-------|
| `FIREBASE_SERVICE_ACCOUNT` | サービスアカウントJSONを**1行の文字列**にしたもの |

**例**：
```json
{"type":"service_account","project_id":"udemy-sns-b9e40","private_key_id":"3728d79e27875105037a459d33b1a58b5bad92a1","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQE...","client_email":"firebase-adminsdk-fbsvc@udemy-sns-b9e40.iam.gserviceaccount.com",...}
```

#### Ko-fi（オプション）

| Key | Value |
|-----|-------|
| `KOFI_VERIFICATION_TOKEN` | Ko-fiダッシュボードから取得 |

### 3-2. 環境の選択

各環境変数に対して、以下を選択：
- ✅ Production
- ✅ Preview
- ✅ Development

---

## 🚀 Step 4: デプロイ実行

1. 「Deploy」ボタンをクリック
2. ビルドが開始されます（1-2分）
3. デプロイが完了すると、URLが表示されます

例：`https://your-project.vercel.app`

---

## 🔗 Step 5: Ko-fi Webhook URLの設定

### 5-1. Ko-fiダッシュボードにアクセス

1. https://ko-fi.com/manage/webhooks にアクセス
2. Webhook URL を設定：

```
https://your-project.vercel.app/api/kofi-webhook
```

3. 「Save」をクリック

### 5-2. テストWebhookの送信

Ko-fiダッシュボードで「Send Test」をクリックして、Webhookが正常に動作するか確認

---

## ✅ Step 6: 動作確認

### 6-1. アプリにアクセス

```
https://your-project.vercel.app/signup
```

### 6-2. テストフロー

1. ユーザー登録
2. プロフィール作成
3. 配信画面で「投げ銭する」ボタンをクリック
4. コードをコピー
5. Ko-fiページでニックネーム欄に貼り付けて寄付
6. Webhookが動作し、スーパーチャットが表示されるか確認

---

## 🛠️ トラブルシューティング

### エラー: "Database '(default)' not found"

**原因**: Firestoreデータベースが作成されていない

**解決**:
1. https://console.firebase.google.com/project/udemy-sns-b9e40/firestore
2. 「データベースを作成」をクリック
3. ロケーションを選択して作成

### エラー: "Invalid API key"

**原因**: 環境変数が正しく設定されていない

**解決**:
1. Vercelダッシュボード > Settings > Environment Variables
2. 値を再確認して再デプロイ

### Webhookが届かない

**原因**: Webhook URLが間違っている、またはVerification Tokenが一致していない

**解決**:
1. Ko-fiのWebhook URLを確認
2. `KOFI_VERIFICATION_TOKEN`が正しいか確認
3. Vercelのログで `/api/kofi-webhook` のエラーを確認

---

## 📊 Firestoreセキュリティルールの設定（重要）

デプロイ後、必ずFirestoreのセキュリティルールを設定してください。

https://console.firebase.google.com/project/udemy-sns-b9e40/firestore/rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザーは自分のドキュメントのみ読み書き可能
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // プロフィールは全員が読めるが、本人のみ書き込み可能
    match /profiles/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // pending_donations は認証済みユーザーが作成可能
    match /pending_donations/{donationId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow delete: if false; // Webhook APIのみが削除
    }

    // superchats は全員が読めるが、書き込みはサーバーサイドのみ
    match /superchats/{superchatId} {
      allow read: if true;
      allow write: if false; // Webhook APIのみが作成
    }
  }
}
```

「公開」をクリックして保存

---

## 🔄 更新デプロイ

コードを変更した場合：

```bash
git add .
git commit -m "Update: 変更内容"
git push
```

Vercelが自動的に再デプロイします。

---

## 📞 サポート

問題が発生した場合：
- Vercelログ: https://vercel.com/your-project/deployments
- Firebaseコンソール: https://console.firebase.google.com/
- Ko-fiダッシュボード: https://ko-fi.com/manage/webhooks
