import { DB, CashWithdrawal, Purchase, PaymentSource, Transaction } from '../types/models';
import { uid, nowIso } from './utils';

/**
 * Cash Management Service
 * Handles business cash flow calculations and reinvestment operations following clean architecture principles
 */
export class RevenueService {
  /**
   * Calculate total revenue from all sales
   */
  static calculateTotalRevenue(db: DB): number {
    return db.sales.reduce((total, sale) => total + sale.totalAmount, 0);
  }

  /**
   * Calculate total cash withdrawn (spent on purchases and expenses)
   */
  static calculateTotalWithdrawn(db: DB): number {
    return db.cashWithdrawals.reduce((total, withdrawal) => total + withdrawal.amount, 0);
  }

  /**
   * Calculate total transaction withdrawals from business cash
   */
  static calculateTotalTransactionWithdrawals(db: DB): number {
    return db.cashWithdrawals
      .filter(w => w.reason.startsWith('Transaction:'))
      .reduce((total, withdrawal) => total + withdrawal.amount, 0);
  }

  /**
   * Calculate total income from income transactions
   */
  static calculateTotalIncome(db: DB): number {
    return db.transactions
      .filter(t => t.type === 'income')
      .reduce((total, transaction) => total + transaction.amount, 0);
  }

  /**
   * Calculate available cash balance for reinvestment
   * Formula: Sales Revenue + Income - Cash Withdrawals
   * This represents the business cash available for purchases and expenses
   */
  static calculateAvailableCash(db: DB): number {
    const totalRevenue = this.calculateTotalRevenue(db);
    const totalIncome = this.calculateTotalIncome(db);
    const totalWithdrawn = this.calculateTotalWithdrawn(db);
    return Math.max(0, totalRevenue + totalIncome - totalWithdrawn);
  }

  /**
   * @deprecated Use calculateAvailableCash() instead
   * Legacy method name for backward compatibility
   */
  static calculateAvailableRevenue(db: DB): number {
    return this.calculateAvailableCash(db);
  }

  /**
   * Validate if a cash withdrawal is possible
   */
  static canWithdrawCash(db: DB, amount: number): boolean {
    if (amount <= 0) return false;
    const available = this.calculateAvailableCash(db);
    return amount <= available;
  }

  /**
   * @deprecated Use canWithdrawCash() instead
   */
  static canWithdrawRevenue(db: DB, amount: number): boolean {
    return this.canWithdrawCash(db, amount);
  }

  /**
   * Create a cash withdrawal record for a purchase
   */
  static createCashWithdrawal(
    amount: number,
    reason: string,
    linkedPurchaseId?: string,
    notes?: string
  ): CashWithdrawal {
    return {
      id: uid(),
      amount,
      reason,
      withdrawnAt: nowIso(),
      linkedPurchaseId,
      notes,
    };
  }

  /**
   * @deprecated Use createCashWithdrawal() instead
   */
  static createRevenueWithdrawal(
    amount: number,
    reason: string,
    linkedPurchaseId?: string,
    notes?: string
  ): CashWithdrawal {
    return this.createCashWithdrawal(amount, reason, linkedPurchaseId, notes);
  }

  /**
   * Calculate payment breakdown for a purchase using business cash
   */
  static calculatePaymentBreakdown(
    totalCost: number,
    cashToUse: number
  ): {
    cashUsed: number;
    externalPayment: number;
    paymentSource: PaymentSource;
  } {
    const clampedCashUsed = Math.max(0, Math.min(cashToUse, totalCost));
    const externalPayment = totalCost - clampedCashUsed;

    let paymentSource: PaymentSource;
    if (clampedCashUsed === 0) {
      paymentSource = 'external';
    } else if (externalPayment === 0) {
      paymentSource = 'revenue';
    } else {
      paymentSource = 'mixed';
    }

    return {
      cashUsed: clampedCashUsed,
      externalPayment,
      paymentSource,
    };
  }

  /**
   * Process a purchase with cash reinvestment
   */
  static processPurchaseWithCash(
    db: DB,
    purchase: Purchase,
    cashToUse: number,
    withdrawalReason: string,
    withdrawalNotes?: string
  ): {
    updatedDb: DB;
    withdrawal: CashWithdrawal | null;
    paymentBreakdown: ReturnType<typeof RevenueService.calculatePaymentBreakdown>;
  } {
    // Validate cash availability
    if (!this.canWithdrawCash(db, cashToUse)) {
      throw new Error('Insufficient cash available for withdrawal');
    }

    // Calculate payment breakdown
    const paymentBreakdown = this.calculatePaymentBreakdown(purchase.totalCost, cashToUse);

    // Create withdrawal if cash is used
    let withdrawal: CashWithdrawal | null = null;
    let updatedWithdrawals = db.cashWithdrawals;

    if (paymentBreakdown.cashUsed > 0) {
      withdrawal = this.createCashWithdrawal(
        paymentBreakdown.cashUsed,
        withdrawalReason,
        purchase.id,
        withdrawalNotes
      );
      updatedWithdrawals = [...db.cashWithdrawals, withdrawal];
    }

    // Update purchase with payment information
    const updatedPurchase: Purchase = {
      ...purchase,
      cashUsed: paymentBreakdown.cashUsed,
      paymentSource: paymentBreakdown.paymentSource,
    };

    // Update purchases array
    const updatedPurchases = db.purchases.map(p => (p.id === purchase.id ? updatedPurchase : p));

    const updatedDb: DB = {
      ...db,
      purchases: updatedPurchases,
      cashWithdrawals: updatedWithdrawals,
    };

    return {
      updatedDb,
      withdrawal,
      paymentBreakdown,
    };
  }

  /**
   * @deprecated Use processPurchaseWithCash() instead
   */
  static processPurchaseWithRevenue(
    db: DB,
    purchase: Purchase,
    cashToUse: number,
    withdrawalReason: string,
    withdrawalNotes?: string
  ) {
    return this.processPurchaseWithCash(db, purchase, cashToUse, withdrawalReason, withdrawalNotes);
  }

  /**
   * Process a transaction that uses business cash as payment source
   * Income transactions don't require withdrawal - they add to available cash
   */
  static processTransactionWithCash(
    db: DB,
    transaction: Transaction
  ): {
    updatedDb: DB;
    withdrawals: CashWithdrawal[];
    error?: string;
  } {
    const withdrawals: CashWithdrawal[] = [];

    // Income and discount transactions don't need withdrawals
    // Income adds to cash balance, discounts are informational only
    if (transaction.type === 'income' || transaction.type === 'discount') {
      return {
        updatedDb: db,
        withdrawals: [],
      };
    }

    // Calculate cash amounts to withdraw (for expenses/fees only)
    let cashToWithdraw = 0;

    if (transaction.paymentSource === 'revenue') {
      cashToWithdraw = transaction.amount;
    } else if (transaction.paymentSource === 'mixed' && transaction.cashAmount) {
      cashToWithdraw = transaction.cashAmount;
    }

    // Validate cash availability
    if (cashToWithdraw > 0) {
      if (!this.canWithdrawCash(db, cashToWithdraw)) {
        const available = this.calculateAvailableCash(db);
        return {
          updatedDb: db,
          withdrawals: [],
          error: `Insufficient cash available. Need ${cashToWithdraw.toFixed(2)}, but only ${available.toFixed(2)} available.`,
        };
      }

      // Create withdrawal record
      const withdrawal = this.createCashWithdrawal(
        cashToWithdraw,
        `Transaction: ${transaction.description}`,
        undefined, // no linked purchase for transactions
        `${transaction.type} - ${transaction.category}`
      );

      withdrawals.push(withdrawal);
    }

    const updatedDb: DB = {
      ...db,
      cashWithdrawals:
        cashToWithdraw > 0 ? [...db.cashWithdrawals, ...withdrawals] : db.cashWithdrawals,
    };

    return {
      updatedDb,
      withdrawals,
    };
  }

  /**
   * @deprecated Use processTransactionWithCash() instead
   */
  static processTransactionWithRevenue(db: DB, transaction: Transaction) {
    return this.processTransactionWithCash(db, transaction);
  }

  /**
   * Get cash flow statistics for analytics
   */
  static getCashFlowStats(db: DB) {
    const totalRevenue = this.calculateTotalRevenue(db);
    const totalWithdrawn = this.calculateTotalWithdrawn(db);
    const availableCash = this.calculateAvailableCash(db);

    // Reinvestment rate: percentage of sales revenue that has been reinvested
    const reinvestmentRate = totalRevenue > 0 ? (totalWithdrawn / totalRevenue) * 100 : 0;

    // Calculate monthly stats
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    const monthlyWithdrawals = db.cashWithdrawals
      .filter(w => w.withdrawnAt.startsWith(currentMonth))
      .reduce((total, w) => total + w.amount, 0);

    return {
      totalRevenue,
      totalWithdrawn,
      availableCash,
      reinvestmentRate,
      monthlyWithdrawals,
      withdrawalCount: db.cashWithdrawals.length,
    };
  }

  /**
   * @deprecated Use getCashFlowStats() instead
   */
  static getRevenueStats(db: DB) {
    const stats = this.getCashFlowStats(db);
    return {
      ...stats,
      availableRevenue: stats.availableCash,
      revenueUtilizationRate: stats.reinvestmentRate,
    };
  }
}
