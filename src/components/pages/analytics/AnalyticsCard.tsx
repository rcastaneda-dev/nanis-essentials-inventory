import React from 'react';
import { useTranslation } from 'react-i18next';
import { ItemCardImage } from '../../ItemImageDisplay';
import { InventoryItem } from '../../../types/models';
import { fmtUSD } from '../../../lib/utils';

interface AnalyticsItemCardProps {
  title: string;
  item?: InventoryItem;
  emptyMessage?: string;
  testId?: string;
  valueDisplay?: 'price' | 'category';
}

export function AnalyticsItemCard({
  title,
  item,
  emptyMessage = 'N/A',
  testId,
  valueDisplay = 'category',
}: AnalyticsItemCardProps) {
  return (
    <div className="card analytics-item-card" data-testid={testId}>
      <div className="card-title">{title}</div>
      {item ? (
        <div className="analytics-item-content">
          <div className="analytics-item-image">
            <ItemCardImage
              images={item.images || []}
              primaryImageId={item.primaryImageId}
              category={item.category}
              itemName={item.name}
            />
          </div>
          <div className="analytics-item-details">
            <div className="analytics-item-name">{item.name}</div>
            <div className="analytics-item-meta">
              {valueDisplay === 'category' && <span className="muted">{item.category}</span>}
              {valueDisplay === 'price' && (
                <span className="green">{fmtUSD(item.maxPrice ?? 0)}</span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <span className="muted">{emptyMessage}</span>
      )}
    </div>
  );
}

interface AnalyticsSimpleCardProps {
  title: string;
  value: string;
  className?: string;
  testId?: string;
}

export function AnalyticsSimpleCard({
  title,
  value,
  className = '',
  testId,
}: AnalyticsSimpleCardProps) {
  return (
    <div className={`card ${className}`} data-testid={testId}>
      <div className="card-title">{title}</div>
      <div className="green">{value}</div>
    </div>
  );
}

interface AnalyticsPaymentCardProps {
  title: string;
  count: number;
  amount: number;
  testId?: string;
}

export function AnalyticsPaymentCard({ title, count, amount, testId }: AnalyticsPaymentCardProps) {
  const { t } = useTranslation();
  return (
    <div className="card subcard" data-testid={testId}>
      <div className="card-title">{title}</div>
      <div className="grid two">
        <div>
          <b>{t('analytics.count')}:</b> {count}
        </div>
        <div>
          <b>{t('analytics.amount')}:</b> {fmtUSD(amount)}
        </div>
      </div>
    </div>
  );
}
