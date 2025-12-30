import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnalyticsItemCard, AnalyticsSimpleCard, AnalyticsPaymentCard } from './AnalyticsCard';
import { ChannelPerformanceCard } from './ChannelPerformanceCard';
import { WeeklySalesSummary } from './WeeklySalesSummary';
import { DateFilters, DateFilterOption } from '../../molecules/DateFilters';
import { DB } from '../../../types/models';
import { fmtUSD, isCurrentMonth, isPreviousMonth } from '../../../lib/utils';
import { RevenueService } from '../../../lib/revenueService';

interface AnalyticsPageProps {
  db: DB;
}

export function AnalyticsPage({ db }: AnalyticsPageProps) {
  const { t } = useTranslation();
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('current-month');

  // Filter data based on selected date range
  const filteredSales = useMemo(() => {
    switch (dateFilter) {
      case 'current-month':
        return db.sales.filter(s => isCurrentMonth(s.createdAt));
      case 'previous-month':
        return db.sales.filter(s => isPreviousMonth(s.createdAt));
      case 'overall':
      default:
        return db.sales;
    }
  }, [db.sales, dateFilter]);

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
  const mostPopularItem = useMemo(() => {
    const countByItem: Record<string, number> = {};
    filteredSales.forEach(s =>
      s.lines.forEach(l => {
        countByItem[l.itemId] = (countByItem[l.itemId] ?? 0) + l.quantity;
      })
    );
    let topId = '';
    let topCount = 0;
    Object.entries(countByItem).forEach(([id, cnt]) => {
      if (cnt > topCount) {
        topCount = cnt;
        topId = id;
      }
    });
    return db.items.find(i => i.id === topId);
  }, [filteredSales, db.items]);

  const revenueStats = RevenueService.getRevenueStats(db);

  const totalSales = filteredSales.reduce((acc, s) => acc + s.totalAmount, 0);

  // Calculate number of sales and items sold
  const numberOfSales = filteredSales.length;
  const numberOfItemsSold = filteredSales.reduce(
    (acc, sale) =>
      acc + sale.lines.reduce((lineAcc: number, line: any) => lineAcc + line.quantity, 0),
    0
  );

  const totalExpenses = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalFees = filteredTransactions
    .filter(t => t.type === 'fee')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  // Payment method summaries
  const salesByMethod = filteredSales.reduce(
    (acc, s) => {
      const key = s.paymentMethod;
      if (
        key === 'cash' ||
        key === 'transfer' ||
        key === 'installments' ||
        key === 'payment_link' ||
        key === 'credit_card'
      ) {
        if (!acc[key]) acc[key] = { count: 0, amount: 0 };
        acc[key].count += 1;
        acc[key].amount += s.totalAmount;
      }
      return acc;
    },
    {} as Record<
      'cash' | 'transfer' | 'installments' | 'payment_link' | 'credit_card',
      { count: number; amount: number }
    >
  );

  const totalInvWithShipping = db.items.reduce(
    (acc, it) => acc + (it.costPostShipping ?? it.costPreShipping ?? 0) * it.stock,
    0
  );
  const totalInvWithoutShipping = db.items.reduce(
    (acc, it) => acc + (it.costPreShipping ?? 0) * it.stock,
    0
  );

  return (
    <div className="page">
      <h2>{t('analytics.title')}</h2>

      <DateFilters activeFilter={dateFilter} onFilterChange={setDateFilter} />

      <div className="section">
        <div className="cards two-cols">
          <AnalyticsItemCard
            title={t('analytics.mostPopularItem')}
            item={mostPopularItem}
            emptyMessage={t('analytics.noSalesDataYet')}
            testId="most-popular-card"
          />

          <AnalyticsSimpleCard
            title={t('analytics.totalSales')}
            value={fmtUSD(totalSales)}
            testId="total-sales-card"
          />

          <AnalyticsSimpleCard
            title={t('analytics.numberOfSales')}
            value={numberOfSales.toString()}
            testId="number-of-sales-card"
          />

          <AnalyticsSimpleCard
            title={t('analytics.numberOfItemsSold')}
            value={numberOfItemsSold.toString()}
            testId="number-of-items-sold-card"
          />

          <AnalyticsSimpleCard
            title={t('analytics.totalExpenses')}
            value={fmtUSD(totalExpenses)}
            testId="total-expenses-card"
          />

          <AnalyticsSimpleCard
            title={t('analytics.totalFees')}
            value={fmtUSD(totalFees)}
            testId="total-fees-card"
          />

          <AnalyticsSimpleCard
            title={t('analytics.totalIncome')}
            value={fmtUSD(totalIncome)}
            testId="total-income-card"
          />

          <AnalyticsSimpleCard
            title={t('analytics.netProfit')}
            value={fmtUSD(totalSales + totalIncome - totalExpenses - totalFees)}
            testId="net-profit-card"
          />

          <div className="card">
            <div className="card-title">{t('analytics.totalInventoryValueWithShipping')}</div>
            <div className="blue">{fmtUSD(totalInvWithShipping)}</div>
          </div>

          <div className="card">
            <div className="card-title">{t('analytics.totalInventoryValueWithoutShipping')}</div>
            <div className="blue">{fmtUSD(totalInvWithoutShipping)}</div>
          </div>

          {/* Revenue Analytics */}
          <div className="card" data-testid="available-revenue-card">
            <div className="card-title">{t('analytics.availableRevenue')}</div>
            <div className="green">{fmtUSD(revenueStats.availableRevenue)}</div>
          </div>

          <div className="card" data-testid="revenue-reinvested-card">
            <div className="card-title">{t('analytics.revenueReinvested')}</div>
            <div className="orange">{fmtUSD(revenueStats.totalWithdrawn)}</div>
          </div>

          <div className="card" data-testid="revenue-utilization-card">
            <div className="card-title">{t('analytics.revenueUtilizationRate')}</div>
            <div className="purple">{revenueStats.revenueUtilizationRate.toFixed(1)}%</div>
          </div>

          {/* Sales by payment method (only show when count > 0) */}
          {salesByMethod.cash?.count > 0 && (
            <AnalyticsPaymentCard
              title={t('analytics.salesByCash')}
              count={salesByMethod.cash.count}
              amount={salesByMethod.cash.amount}
              testId="sales-by-cash-card"
            />
          )}

          {salesByMethod.transfer?.count > 0 && (
            <AnalyticsPaymentCard
              title={t('analytics.salesByCardTransfer')}
              count={salesByMethod.transfer.count}
              amount={salesByMethod.transfer.amount}
              testId="sales-by-transfer-card"
            />
          )}

          {salesByMethod.installments?.count > 0 && (
            <AnalyticsPaymentCard
              title={t('analytics.salesByInstallments')}
              count={salesByMethod.installments.count}
              amount={salesByMethod.installments.amount}
              testId="sales-by-installments-card"
            />
          )}

          {salesByMethod.payment_link?.count > 0 && (
            <AnalyticsPaymentCard
              title={t('analytics.salesByPaymentLink')}
              count={salesByMethod.payment_link.count}
              amount={salesByMethod.payment_link.amount}
              testId="sales-by-payment-link-card"
            />
          )}

          {salesByMethod.credit_card?.count > 0 && (
            <AnalyticsPaymentCard
              title={t('analytics.salesByCreditCard')}
              count={salesByMethod.credit_card.count}
              amount={salesByMethod.credit_card.amount}
              testId="sales-by-credit-card-card"
            />
          )}
        </div>
      </div>

      {/* Weekly Sales Summary Section */}
      <div className="section">
        <WeeklySalesSummary filteredSales={filteredSales} dateFilter={dateFilter} />
      </div>

      {/* Channel Performance Section */}
      <div className="section">
        <ChannelPerformanceCard db={db} dateFilter={dateFilter} />
      </div>
    </div>
  );
}
