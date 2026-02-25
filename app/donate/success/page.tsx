'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';

export const dynamic = 'force-dynamic';

function DonateSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const amount = searchParams.get('amount');
  const donorName = searchParams.get('donorName');
  const message = searchParams.get('message');
  const streamCode = searchParams.get('streamCode');

  const [countdown, setCountdown] = useState(5);
  const [saved, setSaved] = useState(false);

  // Save to Firestore
  useEffect(() => {
    const saveSuperchat = async () => {
      if (!sessionId || saved) return;

      try {
        await addDoc(collection(db, 'superchats'), {
          streamCode: streamCode || null,
          streamId: null,
          nickname: donorName || '匿名',
          userId: null,
          donorName: donorName || '匿名',
          donorEmail: null,
          amount: amount ? parseInt(amount) / 100 : 0,
          currency: 'JPY',
          message: message || '',
          stripeSessionId: sessionId,
          stripePaymentStatus: 'paid',
          timestamp: new Date().toISOString(),
          isPublic: true,
          type: 'stripe_donation',
          url: null,
          createdAt: new Date(),
          matched: !!streamCode,
        });
        setSaved(true);
        console.log('Superchat saved successfully');
      } catch (error) {
        console.error('Failed to save superchat:', error);
      }
    };

    saveSuperchat();
  }, [sessionId, amount, donorName, message, streamCode, saved]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/stream');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
          <svg
            className="w-10 h-10 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          投げ銭ありがとうございます！
        </h1>
        <p className="text-gray-600 mb-6">
          決済が正常に完了しました（デモ）
        </p>

        {sessionId && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-6">
            <p className="text-xs text-gray-500 mb-1">セッションID</p>
            <code className="text-xs font-mono text-gray-700 break-all">
              {sessionId}
            </code>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            配信画面にあなたの投げ銭が表示されます！
          </p>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          {countdown}秒後に配信画面に戻ります...
        </p>

        <button
          onClick={() => router.push('/stream')}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
        >
          今すぐ配信画面に戻る
        </button>
      </div>
    </div>
  );
}

export default function DonateSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    }>
      <DonateSuccessContent />
    </Suspense>
  );
}
