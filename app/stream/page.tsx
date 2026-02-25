'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, query, where, orderBy, limit, getDocs, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase-client';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import StripePaymentForm from '@/app/components/StripePaymentForm';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface Superchat {
  id: string;
  donorName: string;
  nickname?: string;
  amount: string;
  message: string;
  currency: string;
  createdAt: any;
  matched: boolean;
}

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 6; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

type PaymentProvider = 'kofi' | 'stripe' | 'both';

interface PaymentSettings {
  kofiUsername: string;
  paymentProvider: PaymentProvider;
}

export default function StreamPage() {
  const [user, setUser] = useState<any>(null);
  const [userDisplayName, setUserDisplayName] = useState<string>('');
  const [kofiCode, setKofiCode] = useState<string>('');
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [superchats, setSuperchats] = useState<Superchat[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    kofiUsername: 'sugimo_ne',
    paymentProvider: 'both',
  });
  const router = useRouter();

  // Stripe donation form state
  const [stripeDonorName, setStripeDonorName] = useState('');
  const [stripeMessage, setStripeMessage] = useState('');
  const [stripeAmount, setStripeAmount] = useState(500);
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);

  // 配信の短縮コード（本来はDBから取得、今はデモ用に固定）
  const streamCode = 'ST001';

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push('/signup');
      } else {
        setUser(user);

        // ユーザーの表示名を取得
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserDisplayName(userDoc.data().displayName || user.email?.split('@')[0] || 'ゲスト');
        }

        // Load payment settings
        const settingsDoc = await getDoc(doc(db, 'users', user.uid, 'settings', 'payment'));
        if (settingsDoc.exists()) {
          setPaymentSettings(settingsDoc.data() as PaymentSettings);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  // リアルタイムでスーパーチャットを監視
  useEffect(() => {
    if (loading) return;

    // 配信コード「ST001」でフィルタリング
    const q = query(
      collection(db, 'superchats'),
      where('streamCode', '==', streamCode),
      // orderBy('createdAt', 'desc'), // TODO: インデックス作成完了後に有効化
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chats = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Superchat[];

      // クライアント側でソート（インデックス作成までの一時対応）
      chats.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA; // 降順
      });

      setSuperchats(chats);
    }, (error) => {
      console.error('Failed to listen to superchats:', error);
    });

    return () => unsubscribe();
  }, [loading]);

  const handleGenerateCode = async () => {
    if (!userDisplayName) {
      alert('表示名が取得できませんでした');
      return;
    }

    try {
      // Ko-fi用のコードを生成（配信コード-表示名）
      const code = `${streamCode}-${userDisplayName}`;
      setKofiCode(code);

      // pending_donationsに保存（照合用）
      await addDoc(collection(db, 'pending_donations'), {
        streamCode: streamCode,
        displayName: userDisplayName,
        kofiCode: code,
        userId: user?.uid || null,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });

      setShowCodeModal(true);
    } catch (error) {
      console.error('Failed to generate code:', error);
      alert('コードの生成に失敗しました。もう一度お試しください。');
    }
  };

  const copyKofiCode = () => {
    navigator.clipboard.writeText(kofiCode);
    alert('コードをコピーしました！');
  };

  const handleCloseModal = () => {
    setShowCodeModal(false);
  };

  const handleOpenStripeModal = async () => {
    if (!stripeDonorName.trim()) {
      alert('お名前を入力してください');
      return;
    }

    if (stripeAmount < 100) {
      alert('金額は100円以上で指定してください');
      return;
    }

    setStripeLoading(true);

    try {
      const response = await fetch('/api/stripe/payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: stripeAmount,
          donorName: stripeDonorName,
          message: stripeMessage,
          streamCode: streamCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Payment intent creation failed');
      }

      setStripeClientSecret(data.clientSecret);
      setStripeLoading(false);
    } catch (error: any) {
      console.error('Payment intent error:', error);
      alert(`決済の準備に失敗しました: ${error.message}`);
      setStripeLoading(false);
      setShowStripeModal(false);
    }
  };

  const handleStripeSuccess = () => {
    alert('投げ銭ありがとうございます！配信画面に表示されます。');
    setShowStripeModal(false);
    setStripeClientSecret(null);
    setStripeDonorName('');
    setStripeMessage('');
    setStripeAmount(500);
  };

  const handleStripeCancel = () => {
    setShowStripeModal(false);
    setStripeClientSecret(null);
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
          <h1 className="text-xl font-bold text-gray-800">配信画面</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/settings')}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition"
            >
              ⚙️ 投げ銭設定
            </button>
            <span className="text-sm text-gray-600">{user?.displayName || user?.email}</span>
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
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* 配信エリア */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* 配信画面（デモ） */}
              <div className="aspect-video bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center">
                    <span className="text-3xl">📹</span>
                  </div>
                  <h2 className="text-2xl font-bold mb-2">配信デモ</h2>
                  <p className="text-white/80">ライブ配信中</p>
                </div>
              </div>

              {/* 配信情報 */}
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">
                      {user?.displayName}の配信
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span className="flex items-center">
                        <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>
                        配信中
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {(paymentSettings.paymentProvider === 'kofi' || paymentSettings.paymentProvider === 'both') && (
                      <button
                        onClick={handleGenerateCode}
                        className="px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg font-medium hover:opacity-90 transition flex items-center justify-center space-x-2"
                      >
                        <span>☕</span>
                        <span>Ko-fiで投げ銭</span>
                      </button>
                    )}
                    {(paymentSettings.paymentProvider === 'stripe' || paymentSettings.paymentProvider === 'both') && (
                      <button
                        onClick={() => setShowStripeModal(true)}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition flex items-center justify-center space-x-2"
                      >
                        <span>💳</span>
                        <span>投げ銭（デモ）</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* サイドバー - スーパーチャット */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">スーパーチャット</h3>
                <span className="flex items-center text-xs text-gray-500">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                  リアルタイム
                </span>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {superchats.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">
                    まだスーパーチャットがありません
                  </p>
                ) : (
                  superchats.slice(0, 10).map((sc) => (
                    <div
                      key={sc.id}
                      className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-gray-800">
                          {sc.nickname || sc.donorName}
                        </span>
                        <span className="text-sm font-bold text-orange-600">
                          {sc.currency} {sc.amount}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{sc.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ko-fiコード表示モーダル */}
      {showCodeModal && kofiCode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-2 text-gray-800">Ko-fiニックネーム欄に入力</h2>
            <p className="text-sm text-gray-600 mb-4">
              以下のコードをコピーして、Ko-fiの<strong className="text-red-600">ニックネーム欄</strong>に貼り付けてください
            </p>

            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-4">
              <p className="text-sm font-bold text-yellow-800 mb-2">⚠️ 重要</p>
              <p className="text-xs text-yellow-700">
                メッセージ欄ではなく、<strong>ニックネーム欄</strong>に入力してください
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <code className="text-xl font-mono font-bold text-gray-800">{kofiCode}</code>
                <button
                  onClick={copyKofiCode}
                  className="ml-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition flex-shrink-0"
                >
                  📋 コピー
                </button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-blue-800 mb-2">
                <strong>あなたの情報：</strong>
              </p>
              <div className="bg-white rounded p-2 text-xs space-y-1">
                <p className="text-gray-600">配信コード：<code className="font-mono font-bold">{streamCode}</code></p>
                <p className="text-gray-600">表示名：<code className="font-mono font-bold">{userDisplayName}</code></p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
              <p className="text-xs text-blue-800 mb-2">
                <strong>Ko-fi入力例：</strong>
              </p>
              <div className="bg-white rounded p-2 text-xs">
                <p className="text-gray-600">ニックネーム欄：<code className="font-mono font-bold">{kofiCode}</code></p>
                <p className="text-gray-600">メッセージ欄：いつも応援しています！</p>
              </div>
            </div>

            <a
              href={`https://ko-fi.com/${paymentSettings.kofiUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center bg-gradient-to-r from-yellow-400 to-orange-500 text-white py-3 rounded-lg font-bold hover:opacity-90 transition mb-3"
            >
              Ko-fiで投げ銭する
            </a>

            <button
              onClick={handleCloseModal}
              className="w-full py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* Stripe投げ銭モーダル */}
      {showStripeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 my-8 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <h2 className="text-xl font-bold mb-2 text-gray-800">投げ銭する（デモ）</h2>
            <p className="text-sm text-gray-600 mb-4">
              Stripeのテストモードで決済体験ができます
            </p>

            {!stripeClientSecret ? (
              // Step 1: 名前・金額・メッセージ入力
              <>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">
                      お名前 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={stripeDonorName}
                      onChange={(e) => setStripeDonorName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="山田太郎"
                      disabled={stripeLoading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">
                      金額（円）<span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      {[100, 500, 1000, 5000].map((amount) => (
                        <button
                          key={amount}
                          type="button"
                          onClick={() => setStripeAmount(amount)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                            stripeAmount === amount
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                          disabled={stripeLoading}
                        >
                          ¥{amount}
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      value={stripeAmount}
                      onChange={(e) => setStripeAmount(parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="100"
                      min="100"
                      disabled={stripeLoading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">
                      メッセージ（任意）
                    </label>
                    <textarea
                      value={stripeMessage}
                      onChange={(e) => setStripeMessage(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg h-20 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="応援メッセージを入力してください"
                      disabled={stripeLoading}
                    />
                  </div>
                </div>

                <button
                  onClick={handleOpenStripeModal}
                  disabled={stripeLoading || !stripeDonorName.trim() || stripeAmount < 100}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition mb-3"
                >
                  {stripeLoading ? '準備中...' : '次へ（カード情報入力）'}
                </button>

                <button
                  onClick={() => setShowStripeModal(false)}
                  disabled={stripeLoading}
                  className="w-full py-2 text-gray-700 hover:text-gray-900 font-medium disabled:opacity-50"
                >
                  キャンセル
                </button>
              </>
            ) : (
              // Step 2: カード情報入力（Stripe Elements）
              <Elements stripe={stripePromise} options={{ clientSecret: stripeClientSecret }}>
                <StripePaymentForm
                  amount={stripeAmount}
                  donorName={stripeDonorName}
                  message={stripeMessage}
                  streamCode={streamCode}
                  onSuccess={handleStripeSuccess}
                  onCancel={handleStripeCancel}
                />
              </Elements>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
