'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase-client';

type PaymentProvider = 'kofi' | 'stripe' | 'both';

interface Settings {
  // Ko-fi設定
  kofiUsername: string;
  kofiVerificationToken: string;

  // Stripe設定
  stripePublishableKey: string;
  stripeSecretKey: string;

  // どちらを使うか
  paymentProvider: PaymentProvider;
}

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const [settings, setSettings] = useState<Settings>({
    kofiUsername: '',
    kofiVerificationToken: '',
    stripePublishableKey: '',
    stripeSecretKey: '',
    paymentProvider: 'both',
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push('/signup');
      } else {
        setUser(user);

        // Load existing settings
        const settingsDoc = await getDoc(doc(db, 'users', user.uid, 'settings', 'payment'));
        if (settingsDoc.exists()) {
          setSettings(settingsDoc.data() as Settings);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      if (!user) throw new Error('認証されていません');

      // Save settings to Firestore
      await setDoc(doc(db, 'users', user.uid, 'settings', 'payment'), settings);

      setMessage('設定を保存しました！');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setMessage('設定の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">投げ銭設定</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/stream')}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 font-medium"
            >
              配信画面に戻る
            </button>
            <span className="text-sm text-gray-600">{user?.email}</span>
            <button
              onClick={() => auth.signOut()}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 font-medium"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <form onSubmit={handleSave} className="space-y-6">

          {/* 支払いプロバイダー選択 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">投げ銭方法の選択</h2>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="paymentProvider"
                  value="kofi"
                  checked={settings.paymentProvider === 'kofi'}
                  onChange={(e) => setSettings({ ...settings, paymentProvider: e.target.value as PaymentProvider })}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-gray-700">Ko-fiのみ（実際の投げ銭）</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="paymentProvider"
                  value="stripe"
                  checked={settings.paymentProvider === 'stripe'}
                  onChange={(e) => setSettings({ ...settings, paymentProvider: e.target.value as PaymentProvider })}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-gray-700">Stripeのみ（デモ体験）</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="paymentProvider"
                  value="both"
                  checked={settings.paymentProvider === 'both'}
                  onChange={(e) => setSettings({ ...settings, paymentProvider: e.target.value as PaymentProvider })}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-gray-700">両方使う</span>
              </label>
            </div>
          </div>

          {/* Ko-fi設定 */}
          {(settings.paymentProvider === 'kofi' || settings.paymentProvider === 'both') && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Ko-fi設定</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Ko-fi ユーザー名
                  </label>
                  <input
                    type="text"
                    value={settings.kofiUsername}
                    onChange={(e) => setSettings({ ...settings, kofiUsername: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="例: sugimo_ne"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    https://ko-fi.com/<strong>sugimo_ne</strong> の部分
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Verification Token（オプション）
                  </label>
                  <input
                    type="text"
                    value={settings.kofiVerificationToken}
                    onChange={(e) => setSettings({ ...settings, kofiVerificationToken: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ko-fiダッシュボードから取得"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Stripe設定 */}
          {(settings.paymentProvider === 'stripe' || settings.paymentProvider === 'both') && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Stripe設定（テストモード）</h2>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-yellow-800">
                  <strong>注意:</strong> これはデモ用の設定です。実際のお金は動きません。
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    公開可能キー (Publishable Key)
                  </label>
                  <input
                    type="text"
                    value={settings.stripePublishableKey}
                    onChange={(e) => setSettings({ ...settings, stripePublishableKey: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    placeholder="pk_test_xxxxx"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    シークレットキー (Secret Key)
                  </label>
                  <input
                    type="password"
                    value={settings.stripeSecretKey}
                    onChange={(e) => setSettings({ ...settings, stripeSecretKey: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    placeholder="sk_test_xxxxx"
                  />
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    <strong>APIキーの取得方法:</strong><br />
                    1. <a href="https://dashboard.stripe.com/test/apikeys" target="_blank" rel="noopener noreferrer" className="underline">Stripe Dashboard</a> にログイン<br />
                    2. 左上が「テストモード」になっていることを確認<br />
                    3. 「開発者 &gt; APIキー」からコピー
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 保存ボタン */}
          <div className="flex items-center justify-between">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {saving ? '保存中...' : '設定を保存'}
            </button>
            {message && (
              <span className={`text-sm font-medium ${message.includes('失敗') ? 'text-red-600' : 'text-green-600'}`}>
                {message}
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
