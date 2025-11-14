// utils/mining-plan-transactions.ts

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

export interface MiningPlanTransaction {
  id: string;
  telegramId: string;
  userName: string;
  planAmount: number;
  pointsToReceive: number;
  transactionHash?: string;
  status: 'pending' | 'confirmed' | 'rejected';
  createdAt: Date;
  confirmedAt?: Date;
}

// Mapeo de planes a valores de retorno
const PLAN_REWARDS: Record<number, number> = {
  15: 16.50,
  25: 27.50,
  50: 55,
  100: 110,
  250: 275,
  500: 550,
};

// In-memory storage for transactions
// In production, this should be stored in a database
const transactions: Map<string, MiningPlanTransaction> = new Map();

/**
 * Creates a new mining plan transaction
 */
export function createMiningPlanTransaction(
  telegramId: string,
  userName: string,
  planAmount: number,
  transactionHash?: string
): MiningPlanTransaction {
  const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const pointsToReceive = PLAN_REWARDS[planAmount] || planAmount;

  const transaction: MiningPlanTransaction = {
    id: transactionId,
    telegramId,
    userName,
    planAmount,
    pointsToReceive,
    transactionHash,
    status: 'pending',
    createdAt: new Date(),
  };

  transactions.set(transactionId, transaction);
  return transaction;
}

/**
 * Gets all transactions for a specific user
 */
export function getTransactionsByUser(telegramId: string): MiningPlanTransaction[] {
  return Array.from(transactions.values()).filter(
    (tx) => tx.telegramId === telegramId
  );
}

/**
 * Gets a transaction by ID
 */
export function getTransactionById(transactionId: string): MiningPlanTransaction | undefined {
  return transactions.get(transactionId);
}

/**
 * Updates a transaction status
 */
export function updateTransactionStatus(
  transactionId: string,
  status: 'confirmed' | 'rejected'
): MiningPlanTransaction | null {
  const transaction = transactions.get(transactionId);
  if (!transaction) {
    return null;
  }

  transaction.status = status;
  transaction.confirmedAt = new Date();
  transactions.set(transactionId, transaction);
  return transaction;
}

/**
 * Gets all pending transactions
 */
export function getPendingTransactions(): MiningPlanTransaction[] {
  return Array.from(transactions.values()).filter(
    (tx) => tx.status === 'pending'
  );
}

