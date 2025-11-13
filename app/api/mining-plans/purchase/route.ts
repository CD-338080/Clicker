// app/api/mining-plans/purchase/route.ts

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
import { validateTelegramWebAppData } from '@/utils/server-checks';
import {
  createMiningPlanTransaction,
  getTransactionsByUser,
} from '@/utils/mining-plan-transactions';

interface PurchaseMiningPlanRequestBody {
  initData: string;
  planAmount: number;
  transactionHash?: string;
}

const VALID_PLAN_AMOUNTS = [15, 25, 50, 100, 250, 500];
const ADMIN_TELEGRAM_ID = '8221617614';
const USDT_DEPOSIT_ADDRESS = 'TUUSCpDpQdNjAe55q4WNX322VHoA8wbCfN';

export async function POST(req: Request) {
  try {
    const requestBody: PurchaseMiningPlanRequestBody = await req.json();
    const { initData: telegramInitData, planAmount, transactionHash } = requestBody;

    if (!telegramInitData) {
      return NextResponse.json({ error: 'Invalid request: missing initData' }, { status: 400 });
    }

    if (!planAmount || !VALID_PLAN_AMOUNTS.includes(planAmount)) {
      return NextResponse.json(
        { error: 'Invalid plan amount. Valid amounts: 15, 25, 50, 100, 250, 500' },
        { status: 400 }
      );
    }

    const { validatedData, user } = validateTelegramWebAppData(telegramInitData);

    if (!validatedData) {
      return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
    }

    const telegramId = user.id?.toString();
    const userName = user.first_name || user.username || 'Unknown User';

    if (!telegramId) {
      return NextResponse.json({ error: 'Invalid user data: missing telegramId' }, { status: 400 });
    }

    // Check for pending transactions from this user
    const userTransactions = getTransactionsByUser(telegramId);
    const hasPendingTransaction = userTransactions.some(t => t.status === 'pending');

    if (hasPendingTransaction) {
      return NextResponse.json(
        { error: 'You already have a pending transaction. Please wait for it to be confirmed.' },
        { status: 400 }
      );
    }

    // Create transaction
    const transaction = createMiningPlanTransaction(
      telegramId,
      userName,
      planAmount,
      transactionHash
    );

    // Send notification to admin via Telegram bot
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) {
      console.error('BOT_TOKEN not configured');
      return NextResponse.json({ error: 'Bot configuration error' }, { status: 500 });
    }

    const message = `🔔 *New Mining Plan Purchase Request*\n\n` +
      `👤 *User:* ${userName}\n` +
      `🆔 *Telegram ID:* ${telegramId}\n` +
      `💰 *Amount:* ${planAmount} USDT\n` +
      `🎁 *USDT to Receive:* ${transaction.pointsToReceive}\n` +
      `💳 *Deposit Address:* \`${USDT_DEPOSIT_ADDRESS}\`\n` +
      `🔑 *Transaction ID:* ${transaction.id}\n` +
      (transactionHash ? `📝 *Wallet Address:* \`${transactionHash}\`\n` : '') +
      `\n` +
      `⚠️ *Please verify the payment was sent to the deposit address before confirming.*\n` +
      `\n` +
      `✅ *Confirm:* /confirm_${transaction.id}\n` +
      `❌ *Reject:* /reject_${transaction.id}`;

    try {
      const telegramResponse = await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: ADMIN_TELEGRAM_ID,
            text: message,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '✅ Confirm Transaction',
                    callback_data: `confirm_${transaction.id}`,
                  },
                  {
                    text: '❌ Reject Transaction',
                    callback_data: `reject_${transaction.id}`,
                  },
                ],
              ],
            },
          }),
        }
      );

      if (!telegramResponse.ok) {
        const errorData = await telegramResponse.json();
        console.error('Telegram API error:', errorData);
        // Don't fail the request if Telegram fails, but log it
      }

      // Send deposit instructions to user
      const userMessage = `💰 *Mining Plan Purchase Request*\n\n` +
        `You have requested to purchase a mining plan for *${planAmount} USDT*.\n\n` +
        `📋 *Deposit Instructions:*\n` +
        `Send exactly *${planAmount} USDT* to:\n` +
        `\`${USDT_DEPOSIT_ADDRESS}\`\n\n` +
        `🎁 *You will receive:* ${transaction.pointsToReceive} USDT\n\n` +
        `⏳ Please wait for admin confirmation after making the deposit.\n` +
        `You will be notified once your USDT are added to your account.`;

      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: telegramId,
            text: userMessage,
            parse_mode: 'Markdown',
          }),
        });
      } catch (userMessageError) {
        console.error('Error sending deposit instructions to user:', userMessageError);
        // Don't fail if user notification fails
      }
    } catch (telegramError) {
      console.error('Error sending Telegram notification:', telegramError);
      // Don't fail the request if Telegram fails
    }

    return NextResponse.json({
      success: true,
      transactionId: transaction.id,
      message: 'Transaction submitted successfully. Waiting for admin confirmation.',
    });
  } catch (error) {
    console.error('Error processing mining plan purchase:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

