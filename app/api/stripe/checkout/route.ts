import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, donorName, message, streamCode } = body;

    if (!amount || amount < 100) {
      return NextResponse.json(
        { error: '金額は100円以上で指定してください' },
        { status: 400 }
      );
    }

    // Stripe Checkout Sessionを作成
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: '投げ銭（デモ）',
              description: message || '応援ありがとうございます！',
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${request.nextUrl.origin}/donate/success?session_id={CHECKOUT_SESSION_ID}&amount=${amount}&donorName=${encodeURIComponent(donorName)}&message=${encodeURIComponent(message || '')}&streamCode=${streamCode}`,
      cancel_url: `${request.nextUrl.origin}/donate/cancel`,
      metadata: {
        streamCode: streamCode || '',
        donorName: donorName || '匿名',
        message: message || '',
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
