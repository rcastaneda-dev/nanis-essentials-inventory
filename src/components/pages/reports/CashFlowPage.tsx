import React from 'react';
import { DB } from '../../../types/models';
import { fmtUSD } from '../../../lib/utils';
import { PageHeader } from '../../molecules/PageHeader';
import { Text } from '../../atoms/Typography';

interface CashFlowPageProps {
  db: DB;
}

export function CashFlowPage({ db }: CashFlowPageProps) {
  // Cash from operating activities
  const salesCashInflow = db.sales.reduce((sum, sale) => sum + sale.totalAmount, 0);

  // Income transactions are cash inflows
  const incomeCashInflow = db.transactions
    .filter(t => t.type === 'income')
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  // Expenses and fees are cash outflows
  const expensesCashOutflow = db.transactions
    .filter(t => t.type === 'expense' || t.type === 'fee')
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const operatingCashFlow = salesCashInflow + incomeCashInflow - expensesCashOutflow;

  // Cash from investing activities (purchases of inventory)
  const inventoryPurchases = db.purchases.reduce((sum, purchase) => sum + purchase.totalCost, 0);
  const investingCashFlow = -inventoryPurchases;

  // Cash withdrawals (cash taken out of business)
  const cashWithdrawalsTotal = db.cashWithdrawals.reduce(
    (sum, withdrawal) => sum + withdrawal.amount,
    0
  );
  const financingCashFlow = -cashWithdrawalsTotal;

  const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow;

  return (
    <div className="page">
      <PageHeader title="Statement of Cash Flows" />
      <div className="report-card">
        <div className="report-period">
          <Text variant="small">All Time</Text>
        </div>

        <div className="statement-section">
          <div className="section-header">Cash Flows from Operating Activities</div>
          <div className="line-item">
            <span>Cash receipts from sales</span>
            <span className="amount positive">{fmtUSD(salesCashInflow)}</span>
          </div>
          {incomeCashInflow > 0 && (
            <div className="line-item">
              <span>Cash receipts from other income</span>
              <span className="amount positive">{fmtUSD(incomeCashInflow)}</span>
            </div>
          )}
          <div className="line-item">
            <span>Cash paid for expenses and fees</span>
            <span className="amount negative">({fmtUSD(expensesCashOutflow)})</span>
          </div>
          <div className="line-item total">
            <span>
              <strong>Net cash from operating activities</strong>
            </span>
            <span className={`amount ${operatingCashFlow >= 0 ? 'positive' : 'negative'}`}>
              <strong>{fmtUSD(operatingCashFlow)}</strong>
            </span>
          </div>
        </div>

        <div className="statement-section">
          <div className="section-header">Cash Flows from Investing Activities</div>
          <div className="line-item">
            <span>Cash paid for inventory purchases</span>
            <span className="amount negative">({fmtUSD(inventoryPurchases)})</span>
          </div>
          <div className="line-item total">
            <span>
              <strong>Net cash from investing activities</strong>
            </span>
            <span className={`amount ${investingCashFlow >= 0 ? 'positive' : 'negative'}`}>
              <strong>{fmtUSD(investingCashFlow)}</strong>
            </span>
          </div>
        </div>

        <div className="statement-section">
          <div className="section-header">Cash Flows from Financing Activities</div>
          <div className="line-item">
            <span>Cash withdrawals</span>
            <span className="amount negative">({fmtUSD(cashWithdrawalsTotal)})</span>
          </div>
          <div className="line-item total">
            <span>
              <strong>Net cash from financing activities</strong>
            </span>
            <span className={`amount ${financingCashFlow >= 0 ? 'positive' : 'negative'}`}>
              <strong>{fmtUSD(financingCashFlow)}</strong>
            </span>
          </div>
        </div>

        <div className="statement-section final">
          <div className="line-item total final-total">
            <span>
              <strong>Net Change in Cash</strong>
            </span>
            <span className={`amount ${netCashFlow >= 0 ? 'positive' : 'negative'}`}>
              <strong>{fmtUSD(netCashFlow)}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
