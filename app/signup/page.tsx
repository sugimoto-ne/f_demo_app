'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase-client';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLogin, setIsLogin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Login
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userId = userCredential.user.uid;

        // Check if profile exists
        const userDoc = await getDoc(doc(db, 'users', userId));

        if (userDoc.exists() && userDoc.data().hasProfile) {
          router.push('/stream');
        } else {
          router.push('/create-profile');
        }
      } else {
        // Signup
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const userId = userCredential.user.uid;

        // Create user document in Firestore
        await setDoc(doc(db, 'users', userId), {
          email: userCredential.user.email,
          displayName: displayName || email.split('@')[0],
          hasProfile: false,
          createdAt: new Date(),
        });

        router.push('/create-profile');
      }
    } catch (err: any) {
      // エラーメッセージを日本語に変換
      let errorMessage = 'エラーが発生しました';
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'このメールアドレスは既に登録されています';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'メールアドレスの形式が正しくありません';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'パスワードは6文字以上で入力してください';
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        errorMessage = 'メールアドレスまたはパスワードが間違っています';
      } else if (err.code === 'auth/invalid-credential') {
        errorMessage = 'メールアドレスまたはパスワードが間違っています';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold mb-8 text-center text-gray-800">
          {isLogin ? 'ログイン' : '新規登録'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                表示名
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="山田太郎"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="example@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="6文字以上"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? '処理中...' : isLogin ? 'ログイン' : '登録する'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {isLogin ? 'アカウントをお持ちでない方はこちら' : '既にアカウントをお持ちの方はこちら'}
          </button>
        </div>
      </div>
    </div>
  );
}
