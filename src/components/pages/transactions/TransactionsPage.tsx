import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DB, Transaction } from '../../../types/models';
import { fmtUSD, isCurrentMonth, isPreviousMonth } from '../../../lib/utils';
import { RevenueService } from '../../../lib/revenueService';
import { TransactionForm } from './TransactionForm';
import { DateFilters, DateFilterOption } from '../../molecules/DateFilters';
import { RevenueWithdrawals } from '../../RevenueWithdrawals';
import { getTransactionCategoryTranslationKey } from '../../../lib/transactionUtils';

interface TransactionsPageProps {
  db: DB;
  persist: (_db: DB) => void;
}

export function TransactionsPage({ db, persist }: TransactionsPageProps) {
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('current-month');

  const onDelete = (id: string) => {
    if (!window.confirm(t('transactions.deleteTransaction'))) return;
    persist({ ...db, transactions: db.transactions.filter(x => x.id !== id) });
  };

  // Filter transactions based on selected date range
  const filteredTransactions = useMemo(() => {
    switch (dateFilter) {
      case 'current-month':
        return db.transactions.filter(t => isCurrentMonth(t.createdAt));
      case 'previous-month':
        return db.transactions.filter(t => isPreviousMonth(t.createdAt));
      case 'overall':
      default:
        return db.transactions;
    }
  }, [db.transactions, dateFilter]);

  // Filter cash withdrawals based on selected date range
  const filteredWithdrawals = useMemo(() => {
    switch (dateFilter) {
      case 'current-month':
        return db.cashWithdrawals.filter(w => isCurrentMonth(w.withdrawnAt));
      case 'previous-month':
        return db.cashWithdrawals.filter(w => isPreviousMonth(w.withdrawnAt));
      case 'overall':
      default:
        return db.cashWithdrawals;
    }
  }, [db.cashWithdrawals, dateFilter]);

  const handleSave = (transaction: Transaction) => {
    const exists = db.transactions.find(t => t.id === transaction.id);
    let updatedDb = { ...db };

    // Process revenue deduction if payment source uses business revenue (not for income or discount)
    if (
      transaction.type !== 'income' &&
      transaction.type !== 'discount' &&
      (transaction.paymentSource === 'revenue' || transaction.paymentSource === 'mixed')
    ) {
      const { updatedDb: dbWithRevenue, error } = RevenueService.processTransactionWithRevenue(
        db,
        transaction
      );

      if (error) {
        alert(t('transactions.errorProcessingTransaction', { error }));
        return;
      }

      updatedDb = dbWithRevenue;
    }

    // Update transactions
    const nextTransactions = exists
      ? updatedDb.transactions.map(t => (t.id === transaction.id ? transaction : t))
      : [...updatedDb.transactions, transaction];

    persist({ ...updatedDb, transactions: nextTransactions });
    setShowForm(false);
    setEditing(null);
  };

  const totalExpenses = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalFees = filteredTransactions
    .filter(t => t.type === 'fee')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDiscounts = filteredTransactions
    .filter(t => t.type === 'discount')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalOutgoing = totalExpenses + totalFees;
  const netTransactions = totalIncome - totalOutgoing;

  return (
    <div className="page">
      <div className="page-header">
        <h2>{t('transactions.title')}</h2>
        <button
          className="primary"
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        >
          {t('transactions.addTransaction')}
        </button>
      </div>

      <DateFilters activeFilter={dateFilter} onFilterChange={setDateFilter} />

      <div className="summary-cards">
        <div className="summary-card">
          <h3>{t('transactions.totalExpenses')}</h3>
          <div className="amount">{fmtUSD(totalExpenses)}</div>
          <div className="muted">{t('transactions.totalExpensesDescription')}</div>
        </div>
        <div className="summary-card">
          <h3>{t('transactions.totalFees')}</h3>
          <div className="amount">{fmtUSD(totalFees)}</div>
          <div className="muted">{t('transactions.totalFeesDescription')}</div>
        </div>
        <div className="summary-card">
          <h3>{t('transactions.totalIncome')}</h3>
          <div className="amount" style={{ color: totalIncome > 0 ? '#22c55e' : undefined }}>
            {fmtUSD(totalIncome)}
          </div>
          <div className="muted">{t('transactions.totalIncomeDescription')}</div>
        </div>
        <div className="summary-card">
          <h3>{t('transactions.netTransactions')}</h3>
          <div className={`amount total ${netTransactions >= 0 ? 'positive' : 'negative'}`}>
            {fmtUSD(netTransactions)}
          </div>
          <div className="muted">{t('transactions.netTransactionsDescription')}</div>
        </div>
        {totalDiscounts > 0 && (
          <div className="summary-card">
            <h3>{t('transactions.totalDiscounts')}</h3>
            <div className="amount">{fmtUSD(totalDiscounts)}</div>
            <div className="muted">{t('transactions.totalDiscountsDescription')}</div>
          </div>
        )}
      </div>

      <div className="cards two-cols" data-testid="transaction-cards">
        {filteredTransactions
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .map(transaction => (
            <div key={transaction.id} className="card" data-testid="transaction-card">
              <div className="card-row">
                <div className="card-title">{transaction.description}</div>
                <div className="transaction-type">
                  <span className={`badge ${transaction.type}`}>
                    {t(`transactions.transactionTypes.${transaction.type}`)}
                  </span>
                </div>
              </div>
              <div className="card-row">
                <div
                  className="amount-large"
                  style={
                    transaction.type === 'income'
                      ? { color: '#22c55e', fontWeight: 'bold' }
                      : transaction.type === 'discount'
                        ? { color: '#3b82f6', fontWeight: 'bold' }
                        : undefined
                  }
                >
                  {transaction.type === 'income' ? '+' : ''}
                  {fmtUSD(transaction.amount)}
                </div>
                <div className="muted">{new Date(transaction.createdAt).toLocaleDateString()}</div>
              </div>
              <div className="grid two">
                <div>
                  <b>{t('transactions.categoryLabel')}:</b>{' '}
                  {t(
                    `transactions.transactionCategories.${getTransactionCategoryTranslationKey(transaction.category)}`
                  )}
                </div>
                {transaction.type !== 'income' && transaction.type !== 'discount' && (
                  <div>
                    <b>{t('transactions.paymentLabel')}:</b>{' '}
                    {transaction.paymentMethod
                      ? t(`transactions.${transaction.paymentMethod}`)
                      : t('transactions.notSpecified')}
                  </div>
                )}
              </div>
              {transaction.type !== 'income' && transaction.type !== 'discount' && (
                <div className="grid two">
                  <div>
                    <b>{t('transactions.sourceLabel')}:</b>{' '}
                    {transaction.paymentSource === 'mixed'
                      ? t('transactions.mixedSources')
                      : transaction.paymentSource === 'revenue'
                        ? t('transactions.businessRevenue')
                        : t('transactions.externalFunds')}
                  </div>
                  {transaction.paymentSource === 'mixed' &&
                    transaction.cashAmount &&
                    transaction.externalAmount && (
                      <div>
                        <b>{t('transactions.breakdownLabel')}:</b> {fmtUSD(transaction.cashAmount)}{' '}
                        {t('transactions.businessRevenue').toLowerCase()} +{' '}
                        {fmtUSD(transaction.externalAmount)}{' '}
                        {t('transactions.externalFunds').toLowerCase()}
                      </div>
                    )}
                </div>
              )}
              {transaction.notes && (
                <div className="notes">
                  <b>{t('transactions.notesLabel')}:</b> {transaction.notes}
                </div>
              )}
              <div className="row gap">
                <button
                  onClick={() => {
                    setEditing(transaction);
                    setShowForm(true);
                  }}
                >
                  {t('common.edit')}
                </button>
                <button className="danger" onClick={() => onDelete(transaction.id)}>
                  {t('common.delete')}
                </button>
              </div>
            </div>
          ))}
        {filteredTransactions.length === 0 && (
          <div className="empty">
            {dateFilter === 'overall'
              ? t('transactions.noTransactionsYet')
              : dateFilter === 'current-month'
                ? t('transactions.noTransactionsForCurrentMonth')
                : t('transactions.noTransactionsForPreviousMonth')}
          </div>
        )}
      </div>

      {/* Revenue Withdrawals Section */}
      <div className="revenue-withdrawals-section">
        <RevenueWithdrawals db={{ ...db, cashWithdrawals: filteredWithdrawals }} />
      </div>

      {showForm && (
        <TransactionForm
          initial={editing ?? undefined}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSave={handleSave}
          db={db}
        />
      )}
    </div>
  );
}
