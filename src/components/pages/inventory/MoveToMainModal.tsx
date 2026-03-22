import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../molecules/Modal';
import { Button } from '../../atoms/Button';
import { QuantityInputModal } from './QuantityInputModal';
import { DB, InventoryItem } from '../../../types/models';
import { fmtUSD, itemDisplayName } from '../../../lib/utils';
import { useIsMobile } from '../../../hooks/useMediaQuery';

interface PendingMove {
  itemId: string;
  quantity: number;
  item: InventoryItem;
}

interface MoveToMainModalProps {
  db: DB;
  sourceBranchId: string;
  // eslint-disable-next-line no-unused-vars
  onSave: (moves: PendingMove[]) => void | Promise<void>;
  onClose: () => void;
}

function CompactItemCard({
  item,
  pendingMove,
  onClick,
  t,
}: {
  item: InventoryItem;
  pendingMove?: PendingMove;
  onClick: () => void;
  t: (_key: string) => string;
}) {
  const availableStock = pendingMove ? item.stock - pendingMove.quantity : item.stock;
  const unitCost = item.costPostShipping ?? item.costPreShipping ?? 0;

  return (
    <div
      className="card transfer-item-card"
      style={{
        opacity: availableStock === 0 ? 0.5 : 1,
        cursor: availableStock > 0 ? 'pointer' : 'not-allowed',
        padding: '0.75rem',
        marginBottom: '0.5rem',
        minHeight: 'auto',
      }}
      onClick={availableStock > 0 ? onClick : undefined}
      role="button"
      tabIndex={availableStock > 0 ? 0 : -1}
      onKeyDown={e => {
        if ((e.key === 'Enter' || e.key === ' ') && availableStock > 0) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem' }}>{itemDisplayName(item)}</h4>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
            <div>
              {t('inventory.moveToBranchDialog.stock')}: {availableStock}
            </div>
            <div>
              {t('inventory.moveToBranchDialog.cost')}: {fmtUSD(unitCost)}
            </div>
            {item.category && (
              <div>
                {t('inventory.moveToBranchDialog.category')}: {item.category}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.5rem' }}>
          {pendingMove && (
            <div
              style={{
                background: '#4CAF50',
                color: 'white',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: '600',
              }}
            >
              {pendingMove.quantity}
            </div>
          )}
          {availableStock > 0 && (
            <div
              style={{
                background: '#e5e7eb',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                fontWeight: '700',
                color: '#374151',
              }}
            >
              +
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PendingMovesList({
  pendingMoves,
  onRemoveMove,
  sourceItems,
  costAdjustment,
  t,
}: {
  pendingMoves: PendingMove[];
  onRemoveMove: (_itemId: string) => void;
  sourceItems: InventoryItem[];
  costAdjustment: number;
  t: (_key: string, _fallback?: string) => string;
}) {
  return (
    <div
      className="transfer-pending-list"
      style={{
        minHeight: '200px',
        maxHeight: '600px',
        overflowY: 'auto',
        border: '2px solid #e5e7eb',
        borderRadius: '8px',
        padding: '1rem',
        background: '#f9f9f9',
      }}
    >
      {pendingMoves.length === 0 ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            minHeight: '150px',
            color: '#999',
            textAlign: 'center',
          }}
        >
          <p>{t('inventory.moveToBranchDialog.tapToAdd', 'Tap items to add them here')}</p>
        </div>
      ) : (
        <div>
          {pendingMoves.map(move => {
            const item = sourceItems.find(i => i.id === move.itemId);
            if (!item) return null;

            return (
              <div
                key={move.itemId}
                className="card"
                style={{
                  padding: '0.75rem',
                  marginBottom: '0.5rem',
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem' }}>
                      {itemDisplayName(item)}
                    </h4>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      <div>Qty: {move.quantity}</div>
                      <div>
                        Unit Cost:{' '}
                        {fmtUSD(
                          (item.costPostShipping ?? item.costPreShipping ?? 0) + costAdjustment
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="danger"
                    onClick={() => onRemoveMove(move.itemId)}
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                  >
                    ✕
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PendingMovesSummaryBar({
  pendingMoves,
  onRemoveMove,
  sourceItems,
  totalUnits,
  costAdjustment,
  label,
}: {
  pendingMoves: PendingMove[];
  onRemoveMove: (_itemId: string) => void;
  sourceItems: InventoryItem[];
  totalUnits: number;
  costAdjustment: number;
  label: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        background: '#f0f8f0',
        border: '2px solid #4CAF50',
        borderRadius: '8px',
        marginBottom: '1rem',
        overflow: 'hidden',
      }}
    >
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.75rem 1rem',
          cursor: 'pointer',
        }}
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded(!expanded);
          }
        }}
      >
        <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>
          {label} ({totalUnits} units)
        </span>
        <span style={{ fontSize: '1.2rem' }}>{expanded ? '\u25B2' : '\u25BC'}</span>
      </div>
      {expanded && (
        <div style={{ padding: '0 1rem 0.75rem 1rem', maxHeight: '40vh', overflowY: 'auto' }}>
          {pendingMoves.map(move => {
            const item = sourceItems.find(i => i.id === move.itemId);
            if (!item) return null;
            return (
              <div
                key={move.itemId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.5rem 0',
                  borderBottom: '1px solid #e5e7eb',
                  fontSize: '0.85rem',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div>
                    {itemDisplayName(item)} x{move.quantity}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    {fmtUSD((item.costPostShipping ?? item.costPreShipping ?? 0) + costAdjustment)}{' '}
                    ea
                  </div>
                </div>
                <Button
                  variant="danger"
                  onClick={() => onRemoveMove(move.itemId)}
                  style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem' }}
                >
                  ✕
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function MoveToMainModal({ db, sourceBranchId, onSave, onClose }: MoveToMainModalProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [pendingMoves, setPendingMoves] = useState<PendingMove[]>([]);
  const [saving, setSaving] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [quantityModalItem, setQuantityModalItem] = useState<InventoryItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const branchItems = db.items.filter(item => item.branchId === sourceBranchId && item.stock > 0);
  const branchName = db.branches?.find(b => b.id === sourceBranchId)?.name || 'Branch';

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return branchItems;
    const q = searchQuery.toLowerCase();
    return branchItems.filter(
      item =>
        itemDisplayName(item).toLowerCase().includes(q) || item.category?.toLowerCase().includes(q)
    );
  }, [branchItems, searchQuery]);

  const handleItemClick = (item: InventoryItem) => {
    const existingMove = pendingMoves.find(m => m.itemId === item.id);
    const availableStock = existingMove ? item.stock - existingMove.quantity : item.stock;

    if (availableStock <= 0) {
      alert('No available stock for this item');
      return;
    }

    setQuantityModalItem(item);
    setShowQuantityModal(true);
  };

  const handleQuantityConfirm = (quantity: number) => {
    if (!quantityModalItem) return;

    const existingMoveIndex = pendingMoves.findIndex(m => m.itemId === quantityModalItem.id);
    const item = branchItems.find(i => i.id === quantityModalItem.id);

    if (!item) return;

    const currentPendingQty = existingMoveIndex >= 0 ? pendingMoves[existingMoveIndex].quantity : 0;
    const newTotalQty = currentPendingQty + quantity;

    if (newTotalQty > item.stock) {
      alert(`Cannot move more than available stock (${item.stock} units)`);
      return;
    }

    const newMove: PendingMove = {
      itemId: quantityModalItem.id,
      quantity: newTotalQty,
      item: quantityModalItem,
    };

    if (existingMoveIndex >= 0) {
      const updated = [...pendingMoves];
      updated[existingMoveIndex] = newMove;
      setPendingMoves(updated);
    } else {
      setPendingMoves([...pendingMoves, newMove]);
    }

    setShowQuantityModal(false);
    setQuantityModalItem(null);
  };

  const handleRemovePendingMove = (itemId: string) => {
    setPendingMoves(pendingMoves.filter(m => m.itemId !== itemId));
  };

  const handleReset = () => {
    if (pendingMoves.length === 0) return;
    if (
      // eslint-disable-next-line quotes
      window.confirm("Reset all pending moves? This will clear all items you've selected to move.")
    ) {
      setPendingMoves([]);
    }
  };

  const handleSave = async () => {
    if (pendingMoves.length === 0) {
      alert('No items selected to move');
      return;
    }

    setSaving(true);
    try {
      await onSave(pendingMoves);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      alert(`Failed to move items: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const totalPendingUnits = pendingMoves.reduce((sum, m) => sum + m.quantity, 0);
  const movingToMainLabel = t('inventory.moveToMainDialog.movingToMain', 'Moving to Main');

  return (
    <>
      <Modal
        title={t('inventory.moveToMainDialog.title', {
          branch: branchName,
          defaultValue: `Move Items from ${branchName} to Main Inventory`,
        })}
        onClose={onClose}
      >
        {isMobile && pendingMoves.length > 0 && (
          <PendingMovesSummaryBar
            pendingMoves={pendingMoves}
            onRemoveMove={handleRemovePendingMove}
            sourceItems={branchItems}
            totalUnits={totalPendingUnits}
            costAdjustment={-1}
            label={movingToMainLabel}
          />
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: '1.5rem',
            marginTop: '1rem',
          }}
        >
          {/* Available Items */}
          <div>
            <div className="section-title" style={{ marginBottom: '0.75rem' }}>
              {t('inventory.moveToMainDialog.branchInventory', {
                count: branchItems.length,
                defaultValue: `Branch Inventory (${branchItems.length} items)`,
              })}
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('inventory.moveToBranchDialog.searchPlaceholder', 'Search items...')}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                marginBottom: '0.75rem',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '0.875rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div
              style={{
                maxHeight: isMobile ? '60vh' : '500px',
                overflowY: 'auto',
                paddingRight: '0.5rem',
              }}
            >
              {branchItems.length === 0 ? (
                <div className="empty">
                  <p>
                    {t(
                      'inventory.moveToMainDialog.noItemsAvailable',
                      'No items available in branch inventory to move.'
                    )}
                  </p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="empty">
                  <p style={{ color: '#999' }}>
                    {t('inventory.moveToBranchDialog.noResults', 'No items match your search')}
                  </p>
                </div>
              ) : (
                filteredItems.map(item => {
                  const pendingMove = pendingMoves.find(m => m.itemId === item.id);
                  return (
                    <CompactItemCard
                      key={item.id}
                      item={item}
                      pendingMove={pendingMove}
                      onClick={() => handleItemClick(item)}
                      t={t}
                    />
                  );
                })
              )}
            </div>
          </div>

          {/* Pending Moves - desktop only */}
          {!isMobile && (
            <div>
              <div className="section-title" style={{ marginBottom: '0.75rem' }}>
                {movingToMainLabel} ({totalPendingUnits} units)
              </div>
              <PendingMovesList
                pendingMoves={pendingMoves}
                onRemoveMove={handleRemovePendingMove}
                sourceItems={branchItems}
                costAdjustment={-1}
                t={t}
              />
            </div>
          )}
        </div>

        <div className="row gap end" style={{ marginTop: '2rem' }}>
          {pendingMoves.length > 0 && (
            <Button variant="secondary" onClick={handleReset}>
              {t('inventory.moveToBranchDialog.reset')}
            </Button>
          )}
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={pendingMoves.length === 0 || saving}
          >
            {saving
              ? t('common.saving', 'Saving...')
              : t('inventory.moveToBranchDialog.saveUnits', { count: totalPendingUnits })}
          </Button>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
        </div>
      </Modal>

      {showQuantityModal && quantityModalItem && (
        <QuantityInputModal
          item={quantityModalItem}
          maxQuantity={(() => {
            const existingMove = pendingMoves.find(m => m.itemId === quantityModalItem.id);
            const item = branchItems.find(i => i.id === quantityModalItem.id);
            return existingMove && item
              ? item.stock - existingMove.quantity
              : quantityModalItem.stock;
          })()}
          onConfirm={handleQuantityConfirm}
          onCancel={() => {
            setShowQuantityModal(false);
            setQuantityModalItem(null);
          }}
        />
      )}
    </>
  );
}
