import React from 'react';
import { ItemCardImage } from '../ItemImageDisplay';
import { InventoryItem } from '../../types/models';
import { fmtUSD, itemDisplayName } from '../../lib/utils';
import { Text, Heading } from '../atoms/Typography';

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
      <div className="card-title">
        <Heading level={4}>{title}</Heading>
      </div>
      {item ? (
        <div className="analytics-item-content">
          <div className="analytics-item-image">
            <ItemCardImage
              images={item.images || []}
              primaryImageId={item.primaryImageId}
              category={item.category}
              itemName={itemDisplayName(item)}
            />
          </div>
          <div className="analytics-item-details">
            <div className="analytics-item-name">{itemDisplayName(item)}</div>
            <div className="analytics-item-meta">
              {valueDisplay === 'category' && <Text variant="muted">{item.category}</Text>}
              {valueDisplay === 'price' && (
                <Text className="green">{fmtUSD(item.maxPrice ?? 0)}</Text>
              )}
            </div>
          </div>
        </div>
      ) : (
        <Text variant="muted">{emptyMessage}</Text>
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
      <div className="card-title">
        <Heading level={4}>{title}</Heading>
      </div>
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
  return (
    <div className="card subcard" data-testid={testId}>
      <div className="card-title">
        <Heading level={4}>{title}</Heading>
      </div>
      <div className="grid two">
        <div>
          <Text>
            <b>Count:</b> {count}
          </Text>
        </div>
        <div>
          <Text>
            <b>Amount:</b> {fmtUSD(amount)}
          </Text>
        </div>
      </div>
    </div>
  );
}
