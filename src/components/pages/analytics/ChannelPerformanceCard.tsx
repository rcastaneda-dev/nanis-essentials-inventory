import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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

function getChannelLabel(channel: SalesChannel, t: any): string {
  const labels: Record<SalesChannel, string> = {
    facebook_marketplace: t('sales.facebookMarketplace'),
    instagram: t('sales.instagram'),
    tiktok: t('sales.tiktok'),
    family_friends: t('sales.familyFriends'),
    loyal_customer: t('sales.loyalCustomer'),
    referred_to_store: t('sales.referredToStore'),
    store_customer: t('sales.storeCustomer'),
    other: t('sales.other'),
  };
  return labels[channel];
}

export function ChannelPerformanceCard({ db, dateFilter }: ChannelPerformanceCardProps) {
  const { t } = useTranslation();
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
          channelLabel: getChannelLabel(sale.channel, t),
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
  }, [db.sales, dateFilter, t]);

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
        return t('analytics.currentMonth');
      case 'previous-month':
        return t('analytics.previousMonth');
      case 'overall':
        return t('analytics.overall');
      default:
        return t('analytics.currentMonth');
    }
  })();

  if (channelStats.length === 0) {
    return (
      <div className="card">
        <div className="card-title">
          {t('analytics.channelPerformance')} ({timeframeLabel})
        </div>
        <span className="muted">{t('analytics.noSalesWithChannelsTracked')}</span>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-title">
        {t('analytics.channelPerformance')} ({timeframeLabel})
      </div>

      <div className="channel-performance-list">
        {channelStats.map((stats, index) => {
          const percentage = totalSales > 0 ? (stats.totalAmount / totalSales) * 100 : 0;
          const rankingLabel = index === 0 ? t('analytics.topChannel') : `#${index + 1}`;

          return (
            <div key={stats.channel} className="channel-performance-item">
              <div className="channel-performance-header">
                <span className="channel-rank">{rankingLabel}</span>
                <span className="channel-name">{stats.channelLabel}</span>
              </div>
              <div className="channel-performance-stats">
                <div className="stat">
                  <span className="stat-label">{t('analytics.sales')}:</span>
                  <span className="stat-value">{stats.salesCount}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">{t('analytics.earnings')}:</span>
                  <span className="stat-value green">{fmtUSD(stats.totalAmount)}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">{t('analytics.avgOrder')}:</span>
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
              <span className="channel-name">{t('analytics.untrackedSales')}</span>
            </div>
            <div className="channel-performance-stats">
              <div className="stat">
                <span className="stat-label">{t('analytics.earnings')}:</span>
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
              {t('analytics.yourTopChannel')}{' '}
              {dateFilter === 'overall'
                ? t('analytics.overall')
                : dateFilter === 'current-month'
                  ? t('analytics.thisMonth')
                  : t('analytics.lastMonth')}{' '}
              {t('analytics.is')}:
            </strong>{' '}
            {channelStats[0].channelLabel}
          </div>
          {channelStats[1] && (
            <div className="summary-item">
              <strong>{t('analytics.secondPlace')}:</strong> {channelStats[1].channelLabel}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
