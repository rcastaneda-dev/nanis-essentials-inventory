import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InventoryItem, Category } from '../../../types/models';
import { uid, nowIso } from '../../../lib/utils';
import { getCategoryTranslationKey } from '../../../lib/i18nUtils';

const CATEGORIES: Category[] = [
  'Hair Care',
  'Body Care',
  'Makeup',
  'Fragrance',
  'Skin Care',
  'Other',
];

interface QuickAddItemFormProps {
  onSave: (_item: InventoryItem) => void;
  onCancel: () => void;
}

export function QuickAddItemForm({ onSave, onCancel }: QuickAddItemFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('Other');
  const [description, setDescription] = useState('');
  const [weightLbs, setWeightLbs] = useState<number>(0);

  const save = () => {
    if (!name.trim()) {
      window.alert(t('inventory.nameRequired'));
      return;
    }

    const item: InventoryItem = {
      id: uid(),
      name: name.trim(),
      category,
      description: description.trim() || undefined,
      stock: 0, // Will be set by the purchase
      weightLbs: weightLbs || undefined,
      images: [], // No images for quick add
      primaryImageId: undefined,
      costPreShipping: 0, // Will be set by the purchase
      costPostShipping: 0, // Will be set by the purchase
      minPrice: 5, // Cost + 20% (will be updated when cost is set)
      maxPrice: 10, // Cost + 30% (will be updated when cost is set)
      minProfit: 0,
      maxProfit: 0,
      createdAt: nowIso(),
    };
    onSave(item);
  };

  return (
    <div className="quick-add-form">
      <div className="form-header">
        <h3>{t('inventory.quickAddItem')}</h3>
        <button className="icon" onClick={onCancel}>
          ✕
        </button>
      </div>

      <div className="form-body grid two">
        <div>
          <label>{t('inventory.itemNameRequired')}</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('inventory.enterItemName')}
            autoFocus
            data-testid="quick-add-name-input"
          />
        </div>
        <div>
          <label>{t('inventory.category')}</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value as Category)}
            data-testid="quick-add-category-select"
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>
                {t(`categories.${getCategoryTranslationKey(c)}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>{t('inventory.weight')}</label>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={weightLbs}
            onChange={e => setWeightLbs(parseFloat(e.target.value) || 0)}
            placeholder="0.0"
            data-testid="quick-add-weight-input"
          />
        </div>
        <div>
          <label>{t('inventory.briefDescription')}</label>
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={t('inventory.briefDescription')}
          />
        </div>
      </div>

      <div className="form-footer row gap end">
        <button className="primary" onClick={save} data-testid="quick-add-add-btn">
          {t('inventory.addItem')}
        </button>
        <button onClick={onCancel}>{t('common.cancel')}</button>
      </div>
    </div>
  );
}
