import React, { useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { ItemCard } from '../molecules/ItemCard';
import { Text } from '../atoms/Typography';
import { InventoryItem } from '../../types/models';

interface ItemGridProps {
  items: InventoryItem[];
  onEdit: (_item: InventoryItem) => void;
  onDelete: (_id: string) => void;
  emptyMessage?: string;
  noResultsMessage?: string;
  showEmptyState?: boolean;
  showNoResults?: boolean;
  testId?: string;
  columns?: 'two' | 'three';
  lastSellingPricesByItemId?: Map<string, number[]>;
  branchNameById?: Map<string, string>;
}

const ITEM_HEIGHT = 480; // Approximate height of an ItemCard
const VIRTUALIZATION_THRESHOLD = 20; // Only virtualize if more than 20 items

export function ItemGrid({
  items,
  onEdit,
  onDelete,
  emptyMessage = 'No items yet.',
  noResultsMessage = 'No items match your search.',
  showEmptyState = false,
  showNoResults = false,
  testId = 'inventory-cards',
  columns = 'three',
  lastSellingPricesByItemId,
  branchNameById,
}: ItemGridProps) {
  const numColumns = columns === 'two' ? 2 : 3;
  const shouldVirtualize = items.length > VIRTUALIZATION_THRESHOLD;

  // Group items into rows for virtualization
  const rows = useMemo(() => {
    const result: InventoryItem[][] = [];
    for (let i = 0; i < items.length; i += numColumns) {
      result.push(items.slice(i, i + numColumns));
    }
    return result;
  }, [items, numColumns]);

  const gridClass = columns === 'two' ? 'cards two-cols' : 'cards three-cols';

  // Show empty/no results states
  if (showEmptyState) {
    return (
      <div className={gridClass} data-testid={testId}>
        <div className="empty">
          <Text variant="muted">{emptyMessage}</Text>
        </div>
      </div>
    );
  }

  if (showNoResults) {
    return (
      <div className={gridClass} data-testid={testId}>
        <div className="empty">
          <Text variant="muted">{noResultsMessage}</Text>
        </div>
      </div>
    );
  }

  const itemKey = (item: InventoryItem) =>
    item.branchId ? `${item.id}-${item.branchId}` : item.id;

  // For small lists, render without virtualization
  if (!shouldVirtualize) {
    return (
      <div className={gridClass} data-testid={testId}>
        {items.map(item => {
          const lastSellingPrices = lastSellingPricesByItemId?.get(item.id) || [];
          const branchName = item.branchId ? branchNameById?.get(item.branchId) : undefined;
          return (
            <ItemCard
              key={itemKey(item)}
              item={item}
              onEdit={onEdit}
              onDelete={onDelete}
              lastSellingPrices={lastSellingPrices}
              branchName={branchName}
            />
          );
        })}
      </div>
    );
  }

  // Virtualized rendering for large lists
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const rowItems = rows[index];
    return (
      <div style={{ ...style, display: 'flex', gap: '1rem', padding: '0 1rem' }}>
        {rowItems.map(item => {
          const lastSellingPrices = lastSellingPricesByItemId?.get(item.id) || [];
          const branchName = item.branchId ? branchNameById?.get(item.branchId) : undefined;
          return (
            <div
              key={itemKey(item)}
              style={{ flex: 1, minWidth: 0 }}
              data-testid={`${testId}-item-${itemKey(item)}`}
            >
              <ItemCard
                item={item}
                onEdit={onEdit}
                onDelete={onDelete}
                lastSellingPrices={lastSellingPrices}
                branchName={branchName}
              />
            </div>
          );
        })}
        {/* Fill empty slots in the last row */}
        {rowItems.length < numColumns &&
          Array.from({ length: numColumns - rowItems.length }).map((_, i) => (
            <div key={`empty-${i}`} style={{ flex: 1, minWidth: 0 }} />
          ))}
      </div>
    );
  };

  return (
    <div data-testid={testId}>
      <List height={800} itemCount={rows.length} itemSize={ITEM_HEIGHT} width="100%">
        {Row}
      </List>
    </div>
  );
}
