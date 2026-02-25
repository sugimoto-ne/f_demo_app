# Ko-fi Superchat Demo - セットアップガイド

## 🎯 機能概要

- **Firebase Client SDK**によるユーザー登録・ログイン（クライアントサイド）
- プロフィール作成の強制フロー
- 縦型配信画面 (TikTok/Short形式)
- Ko-fi統合スーパーチャット機能
- ユーザーIDとKo-fi寄付者の紐付け（トークン方式）
- **Webhook APIのみAdmin SDK使用**（最小構成）

---

## 📋 必要な準備

### 1. Firebase プロジェクト設定

#### Firebaseコンソールで以下を有効化：
1. **Authentication**
   - Email/Password 認証を有効化

2. **Firestore Database**
   - データベースを作成（テストモードでOK）

#### Firebase設定値を取得：
1. Firebase Console > プロジェクト設定 > 全般 > マイアプリ
2. 「ウェブアプリ」の設定情報をコピー

### 2. Ko-fi アカウント設定

1. [Ko-fi](https://ko-fi.com/) でアカウント作成
2. ダッシュボード > Settings > API
3. Webhook URL を設定：
   ```
   https://your-vercel-app.vercel.app/api/kofi-webhook
   ```
4. Verification Token をメモ（オプション）

---

## 🚀 ローカル開発環境のセットアップ

### 1. 環境変数の設定

`.env.local` ファイルに以下の値を設定：

```bash
# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=udemy-sns-b9e40.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=udemy-sns-b9e40
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=udemy-sns-b9e40.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Ko-fi Verification Token（オプション）
KOFI_VERIFICATION_TOKEN=your_kofi_token
```

### 2. Firestoreセキュリティルールの設定

Firebase Console > Firestore Database > ルール で以下を設定：

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

### 3. 依存関係のインストールと起動

```bash
npm install
npm run dev
```

http://localhost:3000/signup にアクセス

---

## ☁️ Vercel へのデプロイ

### 1. Gitリポジトリにプッシュ

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Vercel でプロジェクトをインポート

1. [Vercel](https://vercel.com/) にログイン
2. 「New Project」> リポジトリを選択
3. 「Import」

### 3. Vercel 環境変数の設定

Vercel Dashboard > Settings > Environment Variables で以下を設定：

#### Firebase Service Account (Webhook用)

サービスアカウントファイルの内容を**1行のJSON文字列**に変換：

```bash
cat udemy-sns-b9e40-firebase-adminsdk-fbsvc-3728d79e27.json | jq -c
```

出力された文字列を以下の変数に設定：

```
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"udemy-sns-b9e40",...}
```

#### Firebase Client SDK

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=udemy-sns-b9e40.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=udemy-sns-b9e40
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=udemy-sns-b9e40.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

#### Ko-fi

```
KOFI_VERIFICATION_TOKEN=your_kofi_token
```

### 4. デプロイ

環境変数を設定後、自動的にデプロイされます。

---

## 🧪 動作確認フロー

### 1. ユーザー登録とプロフィール作成

1. `/signup` にアクセス
2. メールアドレス・パスワードで登録
3. `/create-profile` で表示名・自己紹介を入力
4. `/stream` に自動リダイレクト

### 2. Ko-fi スーパーチャットのテスト

#### 配信画面でトークン生成

1. `/stream` の右下の💰ボタンをクリック
2. 6桁のトークン（例: `ABC123`）が表示される
3. 「Copy」ボタンでコピー

#### Ko-fiで寄付

1. 「Open Ko-fi Page」ボタンをクリック
   - または直接 `https://ko-fi.com/yourpage` にアクセス
2. 寄付金額を選択
3. **メッセージ欄の先頭にトークンを貼り付け**：
   ```
   ABC123 Great stream! Keep it up!
   ```
4. 寄付を完了

#### Webhook受信確認

1. Ko-fiから webhook が `/api/kofi-webhook` に送信される
2. トークンが照合され、ユーザーIDと紐付けられる
3. Firestore の `superchats` コレクションに保存

#### 配信画面で確認

1. `/stream` で「Refresh」ボタンをクリック
2. スーパーチャットが画面左下に表示される

---

## 📊 Firestore コレクション構造

```
users/
  {userId}
    - email: string
    - displayName: string
    - hasProfile: boolean
    - createdAt: timestamp

profiles/
  {userId}
    - displayName: string
    - bio: string
    - createdAt: timestamp

pending_donations/
  {autoId}
    - token: string (例: "ABC123")
    - userId: string
    - streamId: string
    - expiresAt: timestamp (24時間後)
    - createdAt: timestamp

superchats/
  {autoId}
    - userId: string | null
    - streamId: string | null
    - donorName: string
    - donorEmail: string
    - amount: string
    - currency: string
    - message: string
    - kofiTransactionId: string
    - timestamp: string (Ko-fiから)
    - createdAt: timestamp
    - matched: boolean (トークンが一致したか)
```

---

## 🏗️ アーキテクチャ

### クライアントサイド（Firebase Client SDK）
- ユーザー登録・ログイン
- プロフィール作成
- トークン生成（`pending_donations`への保存）
- スーパーチャット一覧取得

### サーバーサイド（Firebase Admin SDK）
- **Webhook API のみ**
- Ko-fi webhookの受信
- トークン照合とユーザーID紐付け
- `superchats`コレクションへの保存

---

## 🔒 セキュリティ対策

### 実装済み

1. **Firestore セキュリティルール**で読み書き制限
2. **Ko-fi Verification Token**の検証
3. **サービスアカウントファイル**をGitから除外

### 本番環境で推奨

1. **環境変数の暗号化管理**（Vercel）
2. **HTTPS通信の強制**
3. **レート制限**の実装（Vercel Edge Config等）

---

## 🐛 トラブルシューティング

### Webhook が届かない

1. Ko-fiダッシュボードで Webhook URL が正しいか確認
2. Vercelのログで `/api/kofi-webhook` のエラーを確認
3. Ko-fiの「Test Webhook」機能でテスト

### スーパーチャットが表示されない

1. ブラウザコンソールでエラー確認
2. Firestoreに `superchats` コレクションが作成されているか確認
3. Firestoreセキュリティルールで読み取りが許可されているか確認

### トークンが一致しない

1. メッセージの**先頭**にトークンを入力しているか確認
2. トークンが24時間以内に有効か確認（`pending_donations`）
3. スペースや特殊文字が入っていないか確認

---

## 📝 次のステップ

- リアルタイム更新（Firestore onSnapshot）
- スーパーチャットのアニメーション
- 配信開始/終了機能
- マルチストリーム対応
- Ko-fi以外の決済方法の追加

---

## 📞 サポート

質問や問題があれば、GitHubのIssuesで報告してください。
