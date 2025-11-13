// utils/mining-plan-confirm.ts

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

import { getTransactionById, updateTransactionStatus } from './mining-plan-transactions';
import { prisma } from './prisma';

interface ProcessTransactionResult {
  success: boolean;
  error?: string;
  message?: string;
  transactionId?: string;
}

/**
 * Processes a transaction confirmation or rejection
 */
export async function processTransactionConfirmation(
  transactionId: string,
  action: 'confirm' | 'reject'
): Promise<ProcessTransactionResult> {
  try {
    // Get the transaction
    const transaction = getTransactionById(transactionId);

    if (!transaction) {
      return {
        success: false,
        error: 'Transaction not found',
      };
    }

    // Check if transaction is already processed
    if (transaction.status !== 'pending') {
      return {
        success: false,
        error: `Transaction already ${transaction.status}`,
      };
    }

    // Update transaction status
    const newStatus = action === 'confirm' ? 'confirmed' : 'rejected';
    const updatedTransaction = updateTransactionStatus(transactionId, newStatus);

    if (!updatedTransaction) {
      return {
        success: false,
        error: 'Failed to update transaction status',
      };
    }

    // If confirmed, add points to user's balance
    if (action === 'confirm') {
      try {
        const user = await prisma.user.findUnique({
          where: { telegramId: transaction.telegramId },
        });

        if (!user) {
          return {
            success: false,
            error: 'User not found',
          };
        }

        // Update user's points balance
        await prisma.user.update({
          where: { telegramId: transaction.telegramId },
          data: {
            pointsBalance: {
              increment: transaction.pointsToReceive,
            },
            points: {
              increment: transaction.pointsToReceive,
            },
          },
        });

        // Send notification to user via Telegram bot
        const botToken = process.env.BOT_TOKEN;
        if (botToken) {
          try {
            const userMessage = `✅ *Mining Plan Confirmed*\n\n` +
              `Your purchase of *${transaction.planAmount} USDT* has been confirmed!\n\n` +
              `💰 *USDT Added:* ${transaction.pointsToReceive} USDT\n\n` +
              `Your balance has been updated. Thank you for your purchase!`;

            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                chat_id: transaction.telegramId,
                text: userMessage,
                parse_mode: 'Markdown',
              }),
            });
          } catch (telegramError) {
            console.error('Error sending confirmation message to user:', telegramError);
            // Don't fail the transaction if notification fails
          }
        }

        return {
          success: true,
          message: `Transaction ${action}ed successfully. ${transaction.pointsToReceive} USDT added to user's account.`,
          transactionId: transaction.id,
        };
      } catch (dbError) {
        console.error('Error updating user balance:', dbError);
        return {
          success: false,
          error: 'Failed to update user balance',
        };
      }
    } else {
      // Transaction rejected
      const botToken = process.env.BOT_TOKEN;
      if (botToken) {
        try {
          const userMessage = `❌ *Mining Plan Rejected*\n\n` +
            `Your purchase request for *${transaction.planAmount} USDT* has been rejected.\n\n` +
            `Please contact support if you believe this is an error.`;

          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chat_id: transaction.telegramId,
              text: userMessage,
              parse_mode: 'Markdown',
            }),
          });
        } catch (telegramError) {
          console.error('Error sending rejection message to user:', telegramError);
          // Don't fail the transaction if notification fails
        }
      }

      return {
        success: true,
        message: `Transaction ${action}ed successfully.`,
        transactionId: transaction.id,
      };
    }
  } catch (error) {
    console.error('Error processing transaction confirmation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
  }
}

