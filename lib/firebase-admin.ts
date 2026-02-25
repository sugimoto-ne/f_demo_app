import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let app: App;

export function getFirebaseAdmin() {
  if (getApps().length === 0) {
    // 環境変数から認証情報を取得（本番環境用）
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      : require('../udemy-sns-b9e40-firebase-adminsdk-fbsvc-3728d79e27.json');

    app = initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    app = getApps()[0];
  }

  return {
    auth: getAuth(app),
    db: getFirestore(app),
  };
}
