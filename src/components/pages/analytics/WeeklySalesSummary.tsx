import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { fmtUSD, getWeeksInRange, isDateInWeek } from '../../../lib/utils';
import { DateFilterOption } from '../../molecules/DateFilters';

interface WeeklySalesSummaryProps {
  filteredSales: any[];
  dateFilter: DateFilterOption;
}

export function WeeklySalesSummary({ filteredSales, dateFilter }: WeeklySalesSummaryProps) {
  const { t } = useTranslation();
  const weeklySummary = useMemo(() => {
    // Determine date range based on filter
    let startDate: Date, endDate: Date;

    if (dateFilter === 'current-month') {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of current month
    } else if (dateFilter === 'previous-month') {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0); // Last day of previous month
    } else {
      // For 'overall', use the existing logic
      if (filteredSales.length === 0) return [];
      startDate = new Date(Math.min(...filteredSales.map(s => new Date(s.createdAt).getTime())));
      endDate = new Date(Math.max(...filteredSales.map(s => new Date(s.createdAt).getTime())));
    }

    const weeks = getWeeksInRange(startDate, endDate);

    const weeklyData = weeks.map(week => {
      const weekSales = filteredSales.filter(sale =>
        isDateInWeek(sale.createdAt, week.start, week.end)
      );

      const totalSales = weekSales.reduce((acc, sale) => acc + sale.totalAmount, 0);
      const salesCount = weekSales.length;
      const totalItems = weekSales.reduce(
        (acc, sale) =>
          acc + sale.lines.reduce((lineAcc: number, line: any) => lineAcc + line.quantity, 0),
        0
      );
      const averageSale = salesCount > 0 ? totalSales / salesCount : 0;

      return {
        weekStart: week.start,
        weekEnd: week.end,
        totalSales,
        salesCount,
        totalItems,
        averageSale,
      };
    });

    const now = new Date();

    // Filter out future weeks (weeks that haven't started yet)
    const filteredWeeklyData = weeklyData.filter(week => week.weekStart <= now);

    // For month views, show weeks including those with zero sales (but not future weeks)
    // For overall view, only show weeks with sales
    if (dateFilter === 'overall') {
      return filteredWeeklyData.filter(week => week.salesCount > 0);
    }
    return filteredWeeklyData;
  }, [filteredSales, dateFilter]);

  const formatWeekRange = (start: Date, end: Date) => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const startStr = start.toLocaleDateString('en-US', options);
    const endStr = end.toLocaleDateString('en-US', options);
    return `${startStr} - ${endStr}`;
  };

  if (weeklySummary.length === 0) {
    return (
      <div className="card">
        <div className="card-title">{t('analytics.weeklySalesSummary')}</div>
        <div className="text-gray-500">{t('analytics.noSalesDataAvailable')}</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-title">{t('analytics.weeklySalesSummary')}</div>
      <div className="weekly-summary-container">
        {weeklySummary.map((week, index) => (
          <div key={index} className="weekly-summary-item">
            <div className="week-range">{formatWeekRange(week.weekStart, week.weekEnd)}</div>
            {week.salesCount === 0 ? (
              <div className="text-gray-500">{t('analytics.noSalesDataForThisWeek')}</div>
            ) : (
              <div className="week-stats">
                <div className="stat">
                  <span className="stat-label">{t('analytics.sales')}:</span>
                  <span className="stat-value">{week.salesCount}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">{t('analytics.items')}:</span>
                  <span className="stat-value">{week.totalItems}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">{t('common.total')}:</span>
                  <span className="stat-value green">{fmtUSD(week.totalSales)}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">{t('analytics.avg')}:</span>
                  <span className="stat-value">{fmtUSD(week.averageSale)}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
