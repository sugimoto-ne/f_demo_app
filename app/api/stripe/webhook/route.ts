import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'No signature found' },
        { status: 400 }
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.warn('STRIPE_WEBHOOK_SECRET is not set. Skipping signature verification.');
      // 開発環境ではWebhook検証をスキップ
    }

    let event: Stripe.Event;

    try {
      if (webhookSecret) {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } else {
        // Webhookシークレットがない場合は、署名検証をスキップ（開発環境のみ）
        event = JSON.parse(body);
      }
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      );
    }

    const { db } = getFirebaseAdmin();

    // checkout.session.completed イベントを処理
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      console.log('Checkout session completed:', session);

      // Firestoreにスーパーチャットを保存
      await db.collection('superchats').add({
        streamCode: session.metadata?.streamCode || null,
        streamId: null,
        nickname: session.metadata?.donorName || '匿名',
        userId: null,
        donorName: session.metadata?.donorName || '匿名',
        donorEmail: session.customer_details?.email || null,
        amount: (session.amount_total || 0) / 100, // セントから円に変換
        currency: session.currency?.toUpperCase() || 'JPY',
        message: session.metadata?.message || '',
        stripeSessionId: session.id,
        stripePaymentStatus: session.payment_status,
        timestamp: new Date().toISOString(),
        isPublic: true,
        type: 'stripe_donation',
        url: null,
        createdAt: new Date(),
        matched: !!(session.metadata?.streamCode),
      });

      console.log('Superchat saved successfully from Stripe (Checkout)');
    }

    // payment_intent.succeeded イベントを処理（Elements使用時）
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      console.log('Payment intent succeeded:', paymentIntent);

      // Firestoreにスーパーチャットを保存
      await db.collection('superchats').add({
        streamCode: paymentIntent.metadata?.streamCode || null,
        streamId: null,
        nickname: paymentIntent.metadata?.donorName || '匿名',
        userId: null,
        donorName: paymentIntent.metadata?.donorName || '匿名',
        donorEmail: null,
        amount: paymentIntent.amount / 100, // セントから円に変換
        currency: paymentIntent.currency?.toUpperCase() || 'JPY',
        message: paymentIntent.metadata?.message || '',
        stripePaymentIntentId: paymentIntent.id,
        stripePaymentStatus: paymentIntent.status,
        timestamp: new Date().toISOString(),
        isPublic: true,
        type: 'stripe_donation',
        url: null,
        createdAt: new Date(),
        matched: !!(paymentIntent.metadata?.streamCode),
      });

      console.log('Superchat saved successfully from Stripe (Payment Intent)');
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// GETリクエストでWebhookエンドポイントの状態を確認
export async function GET() {
  return NextResponse.json({
    message: 'Stripe webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}
