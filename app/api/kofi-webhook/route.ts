import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const dataString = formData.get('data') as string;

    if (!dataString) {
      return NextResponse.json({ error: 'No data received' }, { status: 400 });
    }

    const kofiData = JSON.parse(dataString);

    // Ko-fi verification token check (optional but recommended)
    const verificationToken = process.env.KOFI_VERIFICATION_TOKEN;
    if (verificationToken && kofiData.verification_token !== verificationToken) {
      return NextResponse.json({ error: 'Invalid verification token' }, { status: 401 });
    }

    console.log('Ko-fi webhook received:', kofiData);

    // Extract streamCode-nickname from Ko-fi name field
    // Format: "ST001-太郎"
    const donorName = kofiData.from_name || '';
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
        .where('kofiCode', '==', donorName)
        .limit(1)
        .get();

      if (!pendingSnapshot.empty) {
        const pendingDoc = pendingSnapshot.docs[0];
        const pendingData = pendingDoc.data();

        streamCode = pendingData.streamCode;
        nickname = pendingData.displayName || pendingData.nickname; // displayNameを優先
        userId = pendingData.userId || null;

        // Delete the pending donation
        await pendingDoc.ref.delete();
      }

      // TODO: streamsコレクションからstreamIdを取得
      // const streamDoc = await db.collection('streams')
      //   .where('streamCode', '==', streamCode).limit(1).get();
      // if (!streamDoc.empty) {
      //   streamId = streamDoc.docs[0].id;
      // }
    }

    // Save superchat to Firestore
    await db.collection('superchats').add({
      streamCode: streamCode,
      streamId: streamId,
      nickname: nickname,
      userId: userId,
      donorName: kofiData.from_name, // 元のKo-fi名（ST001-太郎）
      donorEmail: kofiData.email,
      amount: kofiData.amount,
      currency: kofiData.currency,
      message: kofiData.message,
      kofiTransactionId: kofiData.kofi_transaction_id,
      messageId: kofiData.message_id,
      timestamp: kofiData.timestamp,
      isPublic: kofiData.is_public,
      type: kofiData.type,
      url: kofiData.url,
      createdAt: new Date(),
      matched: !!(streamCode && nickname),
    });

    console.log('Superchat saved successfully', {
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
    console.error('Ko-fi webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// For debugging - remove in production
export async function GET() {
  return NextResponse.json({
    message: 'Ko-fi webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
}
