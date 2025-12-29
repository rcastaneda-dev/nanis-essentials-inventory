import { useMemo } from 'react';
import { DB, SalesChannel } from '../../../types/models';
import { fmtUSD, isCurrentMonth, isPreviousMonth } from '../../../lib/utils';
import { DateFilterOption } from '../../molecules/DateFilters';

interface ChannelStats {
  channel: SalesChannel;
  channelLabel: string;
  salesCount: number;
  totalAmount: number;
  averageOrderValue: number;
}

interface ChannelPerformanceCardProps {
  db: DB;
  dateFilter: DateFilterOption;
}

function getChannelLabel(channel: SalesChannel): string {
  const labels: Record<SalesChannel, string> = {
    facebook_marketplace: 'Facebook Marketplace',
    instagram: 'Instagram',
    tiktok: 'TikTok',
    family_friends: 'Family/Friends',
    loyal_customer: 'Loyal Customer',
    referred_to_store: 'Referred to Store',
    store_customer: 'Store Customer',
    other: 'Other',
  };
  return labels[channel];
}

export function ChannelPerformanceCard({ db, dateFilter }: ChannelPerformanceCardProps) {
  const channelStats = useMemo(() => {
    const sales = (() => {
      switch (dateFilter) {
        case 'current-month':
          return db.sales.filter(s => isCurrentMonth(s.createdAt));
        case 'previous-month':
          return db.sales.filter(s => isPreviousMonth(s.createdAt));
        case 'overall':
        default:
          return db.sales;
      }
    })();

    const statsByChannel: Record<SalesChannel, ChannelStats> = {} as Record<
      SalesChannel,
      ChannelStats
    >;

    sales.forEach(sale => {
      if (!sale.channel) return;

      if (!statsByChannel[sale.channel]) {
        statsByChannel[sale.channel] = {
          channel: sale.channel,
          channelLabel: getChannelLabel(sale.channel),
          salesCount: 0,
          totalAmount: 0,
          averageOrderValue: 0,
        };
      }

      statsByChannel[sale.channel].salesCount += 1;
      statsByChannel[sale.channel].totalAmount += sale.totalAmount;
    });

    // Calculate average order value
    Object.values(statsByChannel).forEach(stats => {
      stats.averageOrderValue = stats.totalAmount / stats.salesCount;
    });

    // Sort by total amount descending
    return Object.values(statsByChannel).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [db.sales, dateFilter]);

  const totalSales = channelStats.reduce((sum, stats) => sum + stats.totalAmount, 0);
  const totalSalesWithoutChannel = useMemo(() => {
    const sales = (() => {
      switch (dateFilter) {
        case 'current-month':
          return db.sales.filter(s => isCurrentMonth(s.createdAt));
        case 'previous-month':
          return db.sales.filter(s => isPreviousMonth(s.createdAt));
        case 'overall':
        default:
          return db.sales;
      }
    })();

    return sales.filter(s => !s.channel).reduce((sum, s) => sum + s.totalAmount, 0);
  }, [db.sales, dateFilter]);

  const timeframeLabel = (() => {
    switch (dateFilter) {
      case 'current-month':
        return 'Current Month';
      case 'previous-month':
        return 'Previous Month';
      case 'overall':
        return 'Overall';
      default:
        return 'Current Month';
    }
  })();

  if (channelStats.length === 0) {
    return (
      <div className="card">
        <div className="card-title">Channel Performance ({timeframeLabel})</div>
        <span className="muted">No sales with channels tracked yet</span>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-title">Channel Performance ({timeframeLabel})</div>

      <div className="channel-performance-list">
        {channelStats.map((stats, index) => {
          const percentage = totalSales > 0 ? (stats.totalAmount / totalSales) * 100 : 0;
          const rankingLabel = index === 0 ? '🏆 Top Channel' : `#${index + 1}`;

          return (
            <div key={stats.channel} className="channel-performance-item">
              <div className="channel-performance-header">
                <span className="channel-rank">{rankingLabel}</span>
                <span className="channel-name">{stats.channelLabel}</span>
              </div>
              <div className="channel-performance-stats">
                <div className="stat">
                  <span className="stat-label">Sales:</span>
                  <span className="stat-value">{stats.salesCount}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Earnings:</span>
                  <span className="stat-value green">{fmtUSD(stats.totalAmount)}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Avg Order:</span>
                  <span className="stat-value">{fmtUSD(stats.averageOrderValue)}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">%:</span>
                  <span className="stat-value">{percentage.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          );
        })}

        {totalSalesWithoutChannel > 0 && (
          <div className="channel-performance-item untracked">
            <div className="channel-performance-header">
              <span className="channel-rank">📊</span>
              <span className="channel-name">Untracked Sales</span>
            </div>
            <div className="channel-performance-stats">
              <div className="stat">
                <span className="stat-label">Earnings:</span>
                <span className="stat-value muted">{fmtUSD(totalSalesWithoutChannel)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {channelStats.length > 1 && (
        <div className="channel-performance-summary">
          <div className="summary-item">
            <strong>
              Your top channel{' '}
              {dateFilter === 'overall'
                ? 'overall'
                : dateFilter === 'current-month'
                  ? 'this month'
                  : 'last month'}{' '}
              is:
            </strong>{' '}
            {channelStats[0].channelLabel}
          </div>
          {channelStats[1] && (
            <div className="summary-item">
              <strong>2nd place:</strong> {channelStats[1].channelLabel}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
