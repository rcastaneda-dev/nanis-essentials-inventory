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

  const cashFlowStats = RevenueService.getCashFlowStats(db);

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

  // ===== NEW ANALYTICS CALCULATIONS =====

  // Filtered purchase costs (for time-filtered metrics)
  const filteredPurchaseCosts = useMemo(() => {
    const filteredPurchases = db.purchases.filter(p => {
      switch (dateFilter) {
        case 'current-month':
          return isCurrentMonth(p.createdAt);
        case 'previous-month':
          return isPreviousMonth(p.createdAt);
        case 'overall':
        default:
          return true;
      }
    });
    return filteredPurchases.reduce((acc, p) => acc + p.totalCost, 0);
  }, [db.purchases, dateFilter]);

  // ROI (Return on Investment)
  const roi = useMemo(() => {
    const netProfit = totalSales + totalIncome - filteredPurchaseCosts - totalExpenses - totalFees;
    return filteredPurchaseCosts > 0 ? (netProfit / filteredPurchaseCosts) * 100 : 0;
  }, [totalSales, totalIncome, filteredPurchaseCosts, totalExpenses, totalFees]);

  // Average Order Value
  const averageOrderValue = useMemo(() => {
    return numberOfSales > 0 ? totalSales / numberOfSales : 0;
  }, [totalSales, numberOfSales]);

  // Gross Profit Margin
  const grossProfitMargin = useMemo(() => {
    return totalSales > 0 ? ((totalSales - filteredPurchaseCosts) / totalSales) * 100 : 0;
  }, [totalSales, filteredPurchaseCosts]);

  // Profit Margin
  const profitMargin = useMemo(() => {
    const netProfit = totalSales + totalIncome - filteredPurchaseCosts - totalExpenses - totalFees;
    return totalSales > 0 ? (netProfit / totalSales) * 100 : 0;
  }, [totalSales, totalIncome, filteredPurchaseCosts, totalExpenses, totalFees]);

  // Current Inventory Value
  const inventoryValue = useMemo(() => {
    return db.items.reduce(
      (acc, item) => acc + item.stock * (item.costPostShipping || item.costPreShipping || 0),
      0
    );
  }, [db.items]);

  // Operating Expense Ratio
  const operatingExpenseRatio = useMemo(() => {
    const operatingExpenses = totalExpenses + totalFees;
    return totalSales > 0 ? (operatingExpenses / totalSales) * 100 : 0;
  }, [totalExpenses, totalFees, totalSales]);

  // Inventory Turnover (using filtered data)
  const inventoryTurnover = useMemo(() => {
    // COGS approximation: filtered purchase costs
    return inventoryValue > 0 ? filteredPurchaseCosts / inventoryValue : 0;
  }, [filteredPurchaseCosts, inventoryValue]);

  // Stock-to-Sales Ratio
  const stockToSalesRatio = useMemo(() => {
    return totalSales > 0 ? inventoryValue / totalSales : 0;
  }, [inventoryValue, totalSales]);

  // Category Performance Analysis
  const categoryPerformance = useMemo(() => {
    const salesByCategory: Record<string, { revenue: number; quantity: number }> = {};

    filteredSales.forEach(sale => {
      sale.lines.forEach(line => {
        const item = db.items.find(i => i.id === line.itemId);
        if (item) {
          if (!salesByCategory[item.category]) {
            salesByCategory[item.category] = { revenue: 0, quantity: 0 };
          }
          salesByCategory[item.category].revenue += line.quantity * line.unitPrice;
          salesByCategory[item.category].quantity += line.quantity;
        }
      });
    });

    const categories = Object.entries(salesByCategory)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      best: categories[0] || null,
      worst: categories[categories.length - 1] || null,
      all: categories,
    };
  }, [filteredSales, db.items]);

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

  return (
    <div className="page">
      <h2>{t('analytics.title')}</h2>

      <DateFilters activeFilter={dateFilter} onFilterChange={setDateFilter} />

      {/* Key Highlights */}
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
        </div>
      </div>

      {/* Profitability Metrics */}
      <div className="section">
        <h3>{t('analytics.profitabilityMetrics')}</h3>
        <div className="cards two-cols">
          <div className="card" data-testid="roi-card">
            <div className="card-title">{t('analytics.roi')}</div>
            <div className={roi >= 0 ? 'green' : 'red'}>
              {roi >= 0 ? '+' : ''}
              {roi.toFixed(1)}%
            </div>
          </div>

          <AnalyticsSimpleCard
            title={t('analytics.netProfit')}
            value={fmtUSD(
              totalSales + totalIncome - filteredPurchaseCosts - totalExpenses - totalFees
            )}
            testId="net-profit-card"
          />

          <div className="card" data-testid="profit-margin-card">
            <div className="card-title">{t('analytics.profitMargin')}</div>
            <div className={profitMargin >= 0 ? 'green' : 'red'}>{profitMargin.toFixed(1)}%</div>
          </div>

          <div className="card" data-testid="gross-profit-margin-card">
            <div className="card-title">{t('analytics.grossProfitMargin')}</div>
            <div className={grossProfitMargin >= 0 ? 'green' : 'red'}>
              {grossProfitMargin.toFixed(1)}%
            </div>
          </div>

          <AnalyticsSimpleCard
            title={t('analytics.averageOrderValue')}
            value={fmtUSD(averageOrderValue)}
            testId="average-order-value-card"
          />

          <AnalyticsSimpleCard
            title={t('analytics.totalPurchaseCosts')}
            value={fmtUSD(filteredPurchaseCosts)}
            testId="total-purchase-costs-card"
          />
        </div>
      </div>

      {/* Operational Metrics */}
      <div className="section">
        <h3>{t('analytics.operationalMetrics')}</h3>
        <div className="cards two-cols">
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

          <div className="card" data-testid="operating-expense-ratio-card">
            <div className="card-title">{t('analytics.operatingExpenseRatio')}</div>
            <div
              className={
                operatingExpenseRatio < 30 ? 'green' : operatingExpenseRatio < 50 ? 'orange' : 'red'
              }
            >
              {operatingExpenseRatio.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Inventory Metrics */}
      <div className="section">
        <h3>{t('analytics.inventoryMetrics')}</h3>
        <div className="cards two-cols">
          <AnalyticsSimpleCard
            title={t('analytics.inventoryValue')}
            value={fmtUSD(inventoryValue)}
            testId="inventory-value-card"
          />

          <div className="card" data-testid="inventory-turnover-card">
            <div className="card-title">{t('analytics.inventoryTurnover')}</div>
            <div className="purple">{inventoryTurnover.toFixed(2)}x</div>
          </div>

          <div className="card" data-testid="stock-to-sales-ratio-card">
            <div className="card-title">{t('analytics.stockToSalesRatio')}</div>
            <div
              className={
                stockToSalesRatio < 0.5 ? 'green' : stockToSalesRatio < 1 ? 'orange' : 'red'
              }
            >
              {stockToSalesRatio.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Category Performance */}
      {categoryPerformance.all.length > 0 && (
        <div className="section">
          <h3>{t('analytics.categoryPerformance')}</h3>
          <div className="cards two-cols">
            {categoryPerformance.best && (
              <div className="card" data-testid="best-category-card">
                <div className="card-title">{t('analytics.bestPerformingCategory')}</div>
                <div className="green">
                  <strong>{categoryPerformance.best.name}</strong>
                  <div style={{ fontSize: '0.9em', marginTop: '4px' }}>
                    {fmtUSD(categoryPerformance.best.revenue)}
                  </div>
                </div>
              </div>
            )}
            {categoryPerformance.worst && categoryPerformance.all.length > 1 && (
              <div className="card" data-testid="worst-category-card">
                <div className="card-title">{t('analytics.worstPerformingCategory')}</div>
                <div className="muted">
                  <strong>{categoryPerformance.worst.name}</strong>
                  <div style={{ fontSize: '0.9em', marginTop: '4px' }}>
                    {fmtUSD(categoryPerformance.worst.revenue)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cash Flow Analytics */}
      <div className="section">
        <h3>Cash Flow</h3>
        <div className="cards two-cols">
          <div className="card" data-testid="available-cash-card">
            <div className="card-title">{t('analytics.availableCash')}</div>
            <div className="green">{fmtUSD(cashFlowStats.availableCash)}</div>
          </div>

          <div className="card" data-testid="cash-reinvested-card">
            <div className="card-title">{t('analytics.cashReinvested')}</div>
            <div className="orange">{fmtUSD(cashFlowStats.totalWithdrawn)}</div>
          </div>

          <div className="card" data-testid="reinvestment-rate-card">
            <div className="card-title">{t('analytics.reinvestmentRate')}</div>
            <div className="purple">{cashFlowStats.reinvestmentRate.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="section">
        <h3>Payment Methods</h3>
        <div className="cards two-cols">
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
