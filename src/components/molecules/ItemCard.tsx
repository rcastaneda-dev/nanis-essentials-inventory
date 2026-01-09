import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { Text, Badge } from '../atoms/Typography';
import { ItemCardImage } from '../ItemImageDisplay';
import { InventoryItem, DB } from '../../types/models';
import { fmtUSD } from '../../lib/utils';

interface ItemCardProps {
  item: InventoryItem;
  onEdit: (_item: InventoryItem) => void;
  onDelete: (_id: string) => void;
  testId?: string;
  db?: DB; // Optional DB for branch name lookup
}

export function ItemCard({ item, onEdit, onDelete, testId = 'item-card', db }: ItemCardProps) {
  const { t } = useTranslation();
  const isOutOfStock = item.stock === 0;
  const isLastItem = item.stock === 1;
  const unitCost = item.costPostShipping ?? item.costPreShipping ?? 0;
  const branchName = item.branchId && db?.branches?.find(b => b.id === item.branchId)?.name;

  return (
    <div
      className={`card item-card-modern ${isOutOfStock ? 'out-of-stock-card' : ''}`}
      data-testid={testId}
      data-name={item.name}
    >
      {/* Header Section */}
      <div className="item-card-header">
        <div className="item-card-title-wrapper">
          <h3 className="item-card-title">{item.name}</h3>
          <span className="item-card-date">{new Date(item.createdAt).toLocaleDateString()}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {branchName && (
            <Badge variant="default" className="badge-small">
              {branchName}
            </Badge>
          )}
          <div className="item-card-category-badge">{item.category}</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="item-card-content">
        {/* Image Section */}
        <div className="item-card-image-section">
          <div className="item-card-image-wrapper">
            <ItemCardImage
              images={item.images || []}
              primaryImageId={item.primaryImageId}
              category={item.category}
              itemName={item.name}
            />
          </div>
          {(isOutOfStock || isLastItem) && (
            <div className="item-card-status-badges">
              {isOutOfStock && <Badge variant="danger">{t('itemCard.outOfStock')}</Badge>}
              {isLastItem && !isOutOfStock && (
                <Badge variant="warning">{t('itemCard.lastItem')}</Badge>
              )}
            </div>
          )}
        </div>

        {/* Details Section */}
        <div className="item-card-details">
          {/* Pricing & Inventory Info */}
          <div className="item-card-pricing">
            <div className="item-card-unit-cost">
              <span className="item-card-label">{t('itemCard.unitCost')}</span>
              <span className="item-card-value">{fmtUSD(unitCost)}</span>
            </div>
            <div className="item-card-stock">
              <span className="item-card-label">{t('itemCard.stock')}</span>
              <div className="item-card-stock-value">
                <span className="item-card-value stock-number">{item.stock}</span>
              </div>
            </div>
            {item.weightLbs && item.weightLbs > 0 && (
              <div className="item-card-weight">
                <span className="item-card-label">{t('itemCard.weight')}</span>
                <span className="item-card-value">{item.weightLbs.toFixed(2)} lbs</span>
              </div>
            )}
          </div>

          {/* Potential Revenue Container */}
          <div className="item-card-revenue">
            <div className="item-card-price-range">
              <span className="item-card-label">{t('itemCard.priceRange')}</span>
              <span className="item-card-value price-range-value">
                {fmtUSD(item.minPrice ?? 0)} - {fmtUSD(item.maxPrice ?? 0)}
              </span>
            </div>
            <div className="item-card-profit-range">
              <span className="item-card-label">{t('itemCard.potentialProfit')}</span>
              <span className="item-card-value revenue-value">
                {fmtUSD(item.minProfit ?? 0)} - {fmtUSD(item.maxProfit ?? 0)}
              </span>
            </div>
          </div>

          {/* Description */}
          {item.description && (
            <div className="item-card-description">
              <Text variant="muted">{item.description}</Text>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="item-card-actions">
        <Button onClick={() => onEdit(item)}>{t('common.edit')}</Button>
        <Button variant="danger" onClick={() => onDelete(item.id)}>
          {t('common.delete')}
        </Button>
      </div>
    </div>
  );
}
