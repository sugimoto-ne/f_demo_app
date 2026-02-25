'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase-client';

export default function CreateProfilePage() {
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/signup');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('認証されていません');

      // Create profile document
      await setDoc(doc(db, 'profiles', user.uid), {
        displayName,
        bio: bio || '',
        createdAt: new Date(),
      });

      // Update user document to mark profile as created (merge if exists)
      await setDoc(doc(db, 'users', user.uid), {
        hasProfile: true,
        displayName,
      }, { merge: true });

      router.push('/stream');
    } catch (err: any) {
      setError('プロフィールの作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold mb-2 text-center text-gray-800">
          プロフィール作成
        </h1>
        <p className="text-sm text-gray-600 text-center mb-8">
          配信を始める前にプロフィールを設定してください
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              表示名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="配信で表示される名前"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              自己紹介
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg h-24 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="簡単な自己紹介を入力してください（任意）"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !displayName}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? '作成中...' : 'プロフィールを作成'}
          </button>
        </form>
      </div>
    </div>
  );
}
