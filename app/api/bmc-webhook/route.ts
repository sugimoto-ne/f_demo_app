import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const bmcData = await request.json();

    // Buy Me a Coffee webhook validation (recommended for security)
    const webhookSecret = process.env.BMC_WEBHOOK_SECRET;
    if (webhookSecret && bmcData.verification_token !== webhookSecret) {
      console.error('BMC webhook verification failed');
      return NextResponse.json(
        { error: 'Invalid verification token' },
        { status: 401 }
      );
    }

    console.log('Buy Me a Coffee webhook received:', bmcData);

    // Extract streamCode-nickname from supporter_name field
    // Format: "ST001-太郎"
    const donorName = bmcData.supporter_name || '';
    const codeMatch = donorName.match(/^([A-Z0-9]+)-(.+)$/);

    let streamCode: string | null = null;
    let nickname: string | null = null;
    let userId: string | null = null;
    let streamId: string | null = null;

    const { db } = getFirebaseAdmin();

    if (codeMatch) {
      streamCode = codeMatch[1]; // "ST001"
      nickname = codeMatch[2];   // "太郎"

      // Find the pending donation
      const pendingSnapshot = await db
        .collection('pending_donations')
        .where('bmcCode', '==', donorName)
        .limit(1)
        .get();

      if (!pendingSnapshot.empty) {
        const pendingDoc = pendingSnapshot.docs[0];
        const pendingData = pendingDoc.data();

        streamCode = pendingData.streamCode;
        nickname = pendingData.displayName || pendingData.nickname;
        userId = pendingData.userId || null;

        // Delete the pending donation
        await pendingDoc.ref.delete();
      }
    }

    // Save superchat to Firestore
    await db.collection('superchats').add({
      streamCode: streamCode,
      streamId: streamId,
      nickname: nickname,
      userId: userId,
      donorName: bmcData.supporter_name,
      donorEmail: bmcData.supporter_email,
      amount: bmcData.support_coffee_price || bmcData.support_coffees,
      currency: 'USD', // BMCは通常USD
      message: bmcData.support_note || '',
      bmcTransactionId: bmcData.support_id,
      timestamp: bmcData.support_created_on,
      isPublic: true,
      type: 'buymeacoffee',
      url: bmcData.support_url || '',
      createdAt: new Date(),
      matched: !!(streamCode && nickname),
      provider: 'buymeacoffee',
    });

    console.log('BMC Superchat saved successfully', {
      streamCode,
      nickname,
      userId,
      matched: !!(streamCode && nickname)
    });

    return NextResponse.json({
      success: true,
      matched: !!(streamCode && nickname),
      streamCode,
      nickname
    });

  } catch (error) {
    console.error('Buy Me a Coffee webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// For debugging - remove in production
export async function GET() {
  return NextResponse.json({
    message: 'Buy Me a Coffee webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
}
