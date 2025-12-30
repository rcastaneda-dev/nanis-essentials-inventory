import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useSensor,
  useSensors,
  PointerSensor,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import { Modal } from '../../molecules/Modal';
import { Button } from '../../atoms/Button';
import { QuantityInputModal } from './QuantityInputModal';
import { DB, InventoryItem } from '../../../types/models';
import { fmtUSD } from '../../../lib/utils';

interface PendingMove {
  itemId: string;
  quantity: number;
  item: InventoryItem;
}

interface MoveToBranchModalProps {
  db: DB;
  // eslint-disable-next-line no-unused-vars
  onSave: (moves: PendingMove[], targetBranchId: string) => void;
  onClose: () => void;
}

function CompactItemCard({
  item,
  pendingMove,
  onDragStart,
  t,
}: {
  item: InventoryItem;
  pendingMove?: PendingMove;
  onDragStart: () => void;
  t: (_key: string) => string;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const availableStock = pendingMove ? item.stock - pendingMove.quantity : item.stock;
  const unitCost = item.costPostShipping ?? item.costPreShipping ?? 0;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        opacity: isDragging ? 0.5 : availableStock === 0 ? 0.5 : 1,
        cursor: availableStock > 0 ? 'grab' : 'not-allowed',
      }}
      {...listeners}
      {...attributes}
      onClick={availableStock > 0 ? onDragStart : undefined}
    >
      <div
        className="card"
        style={{
          padding: '0.75rem',
          marginBottom: '0.5rem',
          minHeight: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem' }}>{item.name}</h4>
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
          {pendingMove && (
            <div
              style={{
                background: '#4CAF50',
                color: 'white',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: '600',
                marginLeft: '0.5rem',
              }}
            >
              {pendingMove.quantity}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DropZone({
  pendingMoves,
  onRemoveMove,
  mainInventoryItems,
}: {
  pendingMoves: PendingMove[];
  onRemoveMove: (_itemId: string) => void;
  mainInventoryItems: InventoryItem[];
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'drop-zone',
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        minHeight: '400px',
        maxHeight: '600px',
        overflowY: 'auto',
        border: isOver ? '3px dashed #4CAF50' : '2px solid #e5e7eb',
        borderRadius: '8px',
        padding: '1rem',
        background: isOver ? '#f0f8f0' : '#f9f9f9',
      }}
    >
      {pendingMoves.length === 0 ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            minHeight: '200px',
            color: '#999',
            textAlign: 'center',
          }}
        >
          <p>Drag items here or click to add</p>
        </div>
      ) : (
        <div>
          {pendingMoves.map(move => {
            const item = mainInventoryItems.find(i => i.id === move.itemId);
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
                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem' }}>{item.name}</h4>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      <div>Qty: {move.quantity}</div>
                      <div>
                        Unit Cost:{' '}
                        {fmtUSD((item.costPostShipping ?? item.costPreShipping ?? 0) + 1)}
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

export function MoveToBranchModal({ db, onSave, onClose }: MoveToBranchModalProps) {
  const { t } = useTranslation();
  const [targetBranchId, setTargetBranchId] = useState<string>('');
  const [pendingMoves, setPendingMoves] = useState<PendingMove[]>([]);
  const [draggedItem, setDraggedItem] = useState<InventoryItem | null>(null);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [quantityModalItem, setQuantityModalItem] = useState<InventoryItem | null>(null);

  const sensors = useSensors(useSensor(PointerSensor));

  const activeBranches = db.branches?.filter(b => !b.closedAt) || [];
  const mainInventoryItems = db.items.filter(item => !item.branchId && item.stock > 0);

  const handleDragStart = (event: DragStartEvent) => {
    const itemId = event.active.id as string;
    const item = mainInventoryItems.find(i => i.id === itemId);
    if (item) {
      setDraggedItem(item);
    }
  };

  const handleItemClick = (item: InventoryItem) => {
    if (!targetBranchId) {
      alert(t('inventory.moveToBranchDialog.selectBranch'));
      return;
    }

    const existingMove = pendingMoves.find(m => m.itemId === item.id);
    const availableStock = existingMove ? item.stock - existingMove.quantity : item.stock;

    if (availableStock <= 0) {
      alert('No available stock for this item');
      return;
    }

    // Show quantity input modal
    setQuantityModalItem(item);
    setShowQuantityModal(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggedItem(null);
    const { active, over } = event;

    if (!over || over.id !== 'drop-zone' || !targetBranchId) {
      return;
    }

    const itemId = active.id as string;
    const item = mainInventoryItems.find(i => i.id === itemId);

    if (!item || item.stock === 0) {
      return;
    }

    handleItemClick(item);
  };

  const handleQuantityConfirm = (quantity: number) => {
    if (!quantityModalItem) return;

    const existingMoveIndex = pendingMoves.findIndex(m => m.itemId === quantityModalItem.id);
    const item = mainInventoryItems.find(i => i.id === quantityModalItem.id);

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

  const handleSave = () => {
    if (!targetBranchId) {
      alert('Please select a target branch');
      return;
    }

    if (pendingMoves.length === 0) {
      alert('No items selected to move');
      return;
    }

    onSave(pendingMoves, targetBranchId);
  };

  const totalPendingUnits = pendingMoves.reduce((sum, m) => sum + m.quantity, 0);

  return (
    <>
      <Modal title={t('inventory.moveToBranchDialog.title')} onClose={onClose}>
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="section-title">
            {t('inventory.moveToBranchDialog.selectTargetBranch')}
          </div>
          <div className="grid two row-gap" style={{ marginBottom: '2rem' }}>
            <div>
              <label>{t('inventory.moveToBranchDialog.branch')}</label>
              <select
                value={targetBranchId}
                onChange={e => setTargetBranchId(e.target.value)}
                disabled={pendingMoves.length > 0}
              >
                <option value="">{t('inventory.moveToBranchDialog.selectBranch')}</option>
                {activeBranches.map(branch => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
              {pendingMoves.length > 0 && (
                <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  {t('inventory.moveToBranchDialog.clearPendingHint')}
                </p>
              )}
            </div>
          </div>

          {targetBranchId && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1.5rem',
                marginTop: '1rem',
              }}
            >
              {/* Left Column - Available Items */}
              <div>
                <div className="section-title" style={{ marginBottom: '0.75rem' }}>
                  {t('inventory.moveToBranchDialog.mainInventoryItems', {
                    count: mainInventoryItems.length,
                  })}
                </div>
                <div
                  style={{
                    maxHeight: '500px',
                    overflowY: 'auto',
                    paddingRight: '0.5rem',
                  }}
                >
                  {mainInventoryItems.length === 0 ? (
                    <div className="empty">
                      <p>{t('inventory.moveToBranchDialog.noItemsAvailable')}</p>
                    </div>
                  ) : (
                    mainInventoryItems.map(item => {
                      const pendingMove = pendingMoves.find(m => m.itemId === item.id);
                      return (
                        <CompactItemCard
                          key={item.id}
                          item={item}
                          pendingMove={pendingMove}
                          onDragStart={() => handleItemClick(item)}
                          t={t}
                        />
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column - Pending Moves */}
              <div>
                <div className="section-title" style={{ marginBottom: '0.75rem' }}>
                  {t('inventory.moveToBranchDialog.movingToBranch', { count: totalPendingUnits })}
                </div>
                <DropZone
                  pendingMoves={pendingMoves}
                  onRemoveMove={handleRemovePendingMove}
                  mainInventoryItems={mainInventoryItems}
                />
              </div>
            </div>
          )}

          <DragOverlay>
            {draggedItem ? (
              <div
                className="card"
                style={{
                  opacity: 0.8,
                  transform: 'rotate(5deg)',
                  padding: '0.75rem',
                  maxWidth: '200px',
                }}
              >
                <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem' }}>{draggedItem.name}</h4>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  {t('inventory.moveToBranchDialog.stock')}: {draggedItem.stock}
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        <div className="row gap end" style={{ marginTop: '2rem' }}>
          {pendingMoves.length > 0 && (
            <Button variant="secondary" onClick={handleReset}>
              {t('inventory.moveToBranchDialog.reset')}
            </Button>
          )}
          <Button variant="primary" onClick={handleSave} disabled={pendingMoves.length === 0}>
            {t('inventory.moveToBranchDialog.saveUnits', { count: totalPendingUnits })}
          </Button>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
        </div>
      </Modal>

      {showQuantityModal && quantityModalItem && (
        <QuantityInputModal
          item={quantityModalItem}
          maxQuantity={(() => {
            const existingMove = pendingMoves.find(m => m.itemId === quantityModalItem.id);
            const item = mainInventoryItems.find(i => i.id === quantityModalItem.id);
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
