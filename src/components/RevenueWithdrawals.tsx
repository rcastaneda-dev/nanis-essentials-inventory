import React from 'react';
import { useTranslation } from 'react-i18next';
import { DB } from '../types/models';
import { fmtUSD } from '../lib/utils';

interface RevenueWithdrawalsProps {
  db: DB;
}

/**
 * Revenue Withdrawals Component
 * Displays a history of revenue withdrawals for tracking and audit purposes
 */
export function RevenueWithdrawals({ db }: RevenueWithdrawalsProps) {
  const { t } = useTranslation();
  const sortedWithdrawals = [...db.revenueWithdrawals].sort(
    (a, b) => new Date(b.withdrawnAt).getTime() - new Date(a.withdrawnAt).getTime()
  );

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const findPurchaseById = (purchaseId?: string) => {
    if (!purchaseId) return null;
    return db.purchases.find(p => p.id === purchaseId);
  };

  if (sortedWithdrawals.length === 0) {
    return (
      <div className="empty-state" data-testid="no-withdrawals">
        <h3>{t('transactions.revenueWithdrawals.noWithdrawals')}</h3>
        <p className="muted">{t('transactions.revenueWithdrawals.noWithdrawalsDescription')}</p>
      </div>
    );
  }

  return (
    <div className="revenue-withdrawals" data-testid="revenue-withdrawals-list">
      <h3>{t('transactions.revenueWithdrawals.title')}</h3>

      <div className="withdrawals-list">
        {sortedWithdrawals.map(withdrawal => {
          const linkedPurchase = findPurchaseById(withdrawal.linkedPurchaseId);

          return (
            <div
              key={withdrawal.id}
              className="withdrawal-card"
              data-testid={`withdrawal-${withdrawal.id}`}
            >
              <div className="withdrawal-header">
                <div className="withdrawal-amount">
                  <span className="amount">{fmtUSD(withdrawal.amount)}</span>
                  <span className="date">{formatDate(withdrawal.withdrawnAt)}</span>
                </div>
              </div>

              <div className="withdrawal-details">
                <div className="detail-row">
                  <span className="label">{t('transactions.revenueWithdrawals.reason')}:</span>
                  <span className="value">{withdrawal.reason}</span>
                </div>

                {linkedPurchase && (
                  <div className="detail-row">
                    <span className="label">
                      {t('transactions.revenueWithdrawals.linkedPurchase')}:
                    </span>
                    <span className="value">
                      {formatDate(linkedPurchase.createdAt)} - {fmtUSD(linkedPurchase.totalCost)}
                      {linkedPurchase.lines.length === 1
                        ? ` (${linkedPurchase.lines.length} ${t('transactions.revenueWithdrawals.item')})`
                        : ` (${linkedPurchase.lines.length} ${t('transactions.revenueWithdrawals.items')})`}
                    </span>
                  </div>
                )}

                {withdrawal.notes && (
                  <div className="detail-row">
                    <span className="label">{t('transactions.notesLabel')}:</span>
                    <span className="value notes">{withdrawal.notes}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="withdrawals-summary">
        <div className="summary-item">
          <span className="label">{t('transactions.revenueWithdrawals.totalWithdrawals')}:</span>
          <span className="value">{sortedWithdrawals.length}</span>
        </div>
        <div className="summary-item">
          <span className="label">{t('transactions.revenueWithdrawals.totalAmount')}:</span>
          <span className="value amount">
            {fmtUSD(sortedWithdrawals.reduce((sum, w) => sum + w.amount, 0))}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Quick Revenue Withdrawal Summary Component
 * Shows a condensed view suitable for cards or dashboards
 */
export function RevenueWithdrawalSummary({ db }: { db: DB }) {
  const { t } = useTranslation();
  const withdrawals = db.revenueWithdrawals;
  const totalWithdrawn = withdrawals.reduce((sum, w) => sum + w.amount, 0);

  // Get recent withdrawals (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentWithdrawals = withdrawals.filter(w => new Date(w.withdrawnAt) >= thirtyDaysAgo);
  const recentAmount = recentWithdrawals.reduce((sum, w) => sum + w.amount, 0);

  return (
    <div className="withdrawal-summary-card" data-testid="withdrawal-summary">
      <div className="summary-stats">
        <div className="stat">
          <span className="stat-value">{fmtUSD(totalWithdrawn)}</span>
          <span className="stat-label">{t('transactions.revenueWithdrawals.totalReinvested')}</span>
        </div>
        <div className="stat">
          <span className="stat-value">{withdrawals.length}</span>
          <span className="stat-label">{t('transactions.revenueWithdrawals.withdrawals')}</span>
        </div>
        <div className="stat">
          <span className="stat-value">{fmtUSD(recentAmount)}</span>
          <span className="stat-label">{t('transactions.revenueWithdrawals.last30Days')}</span>
        </div>
      </div>
    </div>
  );
}
