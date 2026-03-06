import React, { useState, useEffect } from 'react';
import { Modal } from '../../molecules/Modal';
import { Button } from '../../atoms/Button';
import { InventoryItem } from '../../../types/models';
import { parseNumber, itemDisplayName } from '../../../lib/utils';

interface QuantityInputModalProps {
  item: InventoryItem;
  maxQuantity: number;
  // eslint-disable-next-line no-unused-vars
  onConfirm: (quantity: number) => void;
  onCancel: () => void;
}

export function QuantityInputModal({
  item,
  maxQuantity,
  onConfirm,
  onCancel,
}: QuantityInputModalProps) {
  const [quantity, setQuantity] = useState(maxQuantity);

  useEffect(() => {
    setQuantity(maxQuantity);
  }, [maxQuantity]);

  const handleConfirm = () => {
    const qty = Math.max(1, Math.min(quantity, maxQuantity));
    if (qty <= 0 || qty > maxQuantity) {
      alert(`Quantity must be between 1 and ${maxQuantity}`);
      return;
    }
    onConfirm(qty);
  };

  return (
    <Modal title={`Move ${itemDisplayName(item)} to Branch`} onClose={onCancel}>
      <div className="section-title">Select Quantity</div>
      <div className="grid two row-gap">
        <div>
          <label>Available Stock: {maxQuantity}</label>
          <input
            type="number"
            min={1}
            max={maxQuantity}
            value={quantity}
            onChange={e => setQuantity(parseNumber(e.target.value))}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleConfirm();
              }
            }}
          />
        </div>
        <div className="flex align-center">
          <p className="text-muted">
            Moving {quantity} unit{quantity !== 1 ? 's' : ''} of {itemDisplayName(item)}
          </p>
        </div>
      </div>

      <div className="row gap end" style={{ marginTop: '1.5rem' }}>
        <Button variant="primary" onClick={handleConfirm}>
          Confirm
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </Modal>
  );
}
