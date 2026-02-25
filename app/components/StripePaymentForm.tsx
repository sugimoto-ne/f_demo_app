'use client';

import { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';

interface StripePaymentFormProps {
  amount: number;
  donorName: string;
  message: string;
  streamCode: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function StripePaymentForm({ amount, donorName, message, streamCode, onSuccess, onCancel }: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || '入力内容を確認してください');
        setProcessing(false);
        return;
      }

      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/stream`,
        },
        redirect: 'if_required',
      });

      if (confirmError) {
        setError(confirmError.message || '決済に失敗しました');
        setProcessing(false);
      } else {
        // Success - save to Firestore directly
        try {
          await addDoc(collection(db, 'superchats'), {
            streamCode: streamCode || null,
            streamId: null,
            nickname: donorName || '匿名',
            userId: null,
            donorName: donorName || '匿名',
            donorEmail: null,
            amount: amount / 100,
            currency: 'JPY',
            message: message || '',
            stripePaymentIntentId: null,
            stripePaymentStatus: 'paid',
            timestamp: new Date().toISOString(),
            isPublic: true,
            type: 'stripe_donation',
            url: null,
            createdAt: new Date(),
            matched: !!streamCode,
          });
          console.log('Superchat saved successfully');
          onSuccess();
        } catch (saveError) {
          console.error('Failed to save superchat:', saveError);
          setError('決済は成功しましたが、データの保存に失敗しました');
          setProcessing(false);
        }
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setError('予期しないエラーが発生しました');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-4">
        <p className="text-sm font-bold text-yellow-800 mb-2">💡 テストカード情報</p>
        <div className="text-xs text-yellow-700 space-y-1">
          <p>カード番号: <code className="font-mono font-bold">4242 4242 4242 4242</code></p>
          <p>有効期限: 任意の未来の日付（例: 12/34）</p>
          <p>CVC: 任意の3桁（例: 123）</p>
        </div>
      </div>

      <PaymentElement />

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={!stripe || processing}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {processing ? '処理中...' : '投げ銭する'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={processing}
          className="px-6 py-3 text-gray-700 hover:text-gray-900 font-medium disabled:opacity-50"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
