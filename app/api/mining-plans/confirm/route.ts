// app/api/mining-plans/confirm/route.ts

/**
 * This project was developed by Nikandr Surkov.
 * You may not use this code if you purchased it from any source other than the official website https://nikandr.com.
 * If you purchased it from the official website, you may use it for your own projects,
 * but you may not resell it or publish it publicly.
 * 
 * Website: https://nikandr.com
 * YouTube: https://www.youtube.com/@NikandrSurkov
 * Telegram: https://t.me/nikandr_s
 * Telegram channel for news/updates: https://t.me/clicker_game_news
 * GitHub: https://github.com/nikandr-surkov
 */

import { NextResponse } from 'next/server';
import { processTransactionConfirmation } from '@/utils/mining-plan-confirm';

interface ConfirmTransactionRequestBody {
  transactionId: string;
  action: 'confirm' | 'reject';
  adminInitData?: string; // Optional admin authentication
}

export async function POST(req: Request) {
  try {
    const requestBody: ConfirmTransactionRequestBody = await req.json();
    const { transactionId, action } = requestBody;

    if (!transactionId || !action) {
      return NextResponse.json(
        { error: 'Invalid request: missing transactionId or action' },
        { status: 400 }
      );
    }

    const result = await processTransactionConfirmation(transactionId, action);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || result.message },
        { status: result.error === 'Transaction not found' ? 404 : 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error confirming mining plan transaction:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

