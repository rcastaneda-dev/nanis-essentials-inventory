import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../shared/Modal';
import { ImageUploadSection } from '../../organisms/ImageUploadSection';
import { InventoryItem, Category, ItemImage } from '../../../types/models';
import { parseNumber, uid, nowIso, fmtUSD } from '../../../lib/utils';
import { getCategoryTranslationKey } from '../../../lib/i18nUtils';

const CATEGORIES: Category[] = [
  'Hair Care',
  'Body Care',
  'Makeup',
  'Fragrance',
  'Skin Care',
  'Other',
];

interface InventoryFormProps {
  initial?: InventoryItem;
  onClose: () => void;
  onSave: (_item: InventoryItem) => void;
}

export function InventoryForm({ initial, onClose, onSave }: InventoryFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState<Category>(initial?.category ?? 'Other');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [stock, setStock] = useState<number>(initial?.stock ?? 0);
  const [weightLbs, setWeightLbs] = useState<number>(initial?.weightLbs ?? 0);
  const [costPostShipping, setCostPostShipping] = useState<number>(initial?.costPostShipping ?? 0);
  const [costPreShipping, setCostPreShipping] = useState<number>(initial?.costPreShipping ?? 0);
  const [compA, setCompA] = useState<number | undefined>(initial?.competitorAPrice);
  const [compB, setCompB] = useState<number | undefined>(initial?.competitorBPrice);
  const [images, setImages] = useState<ItemImage[]>(initial?.images || []);
  const [primaryImageId, setPrimaryImageId] = useState<string | undefined>(initial?.primaryImageId);

  const autoMin = useMemo(() => {
    const raw = (costPostShipping || 0) * 1.2;
    return Math.ceil(raw);
  }, [costPostShipping]);

  const autoMax = useMemo(() => {
    const raw = (costPostShipping || 0) * 1.3;
    return Math.ceil(raw);
  }, [costPostShipping]);

  const [minPrice, setMinPrice] = useState<number | undefined>(initial?.minPrice ?? autoMin);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(initial?.maxPrice ?? autoMax);

  // Update min/max prices when cost post-shipping changes
  React.useEffect(() => {
    setMinPrice(autoMin);
    setMaxPrice(autoMax);
  }, [autoMin, autoMax]);

  const minProfit = (minPrice ?? 0) - (costPostShipping || costPreShipping || 0);
  const maxProfit = (maxPrice ?? 0) - (costPostShipping || costPreShipping || 0);

  const save = () => {
    if (!name.trim()) {
      alert(t('inventory.nameRequired'));
      return;
    }
    const item: InventoryItem = {
      id: initial?.id ?? uid(),
      name: name.trim(),
      category,
      description: description.trim() || undefined,
      notes: notes.trim() || undefined,
      stock,
      weightLbs: weightLbs || undefined,
      images,
      primaryImageId,
      costPreShipping: costPreShipping || undefined,
      costPostShipping: costPostShipping || undefined,
      minPrice,
      maxPrice,
      competitorAPrice: compA,
      competitorBPrice: compB,
      minProfit,
      maxProfit,
      createdAt: initial?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    };
    onSave(item);
  };

  return (
    <Modal title={initial ? t('inventory.editItem') : t('inventory.addItem')} onClose={onClose}>
      <div className="form grid two">
        <div>
          <label>{t('inventory.itemName')}</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            data-testid="item-name-input"
          />
        </div>
        <div>
          <label>{t('inventory.category')}</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value as Category)}
            data-testid="item-category-select"
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>
                {t(`categories.${getCategoryTranslationKey(c)}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-2">
          <label>{t('inventory.description')}</label>
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            data-testid="item-description-input"
          />
        </div>

        <div>
          <label>{t('inventory.initialCount')}</label>
          <input
            type="number"
            value={stock}
            onChange={e => setStock(parseNumber(e.target.value))}
            data-testid="item-stock-input"
          />
        </div>
        <div>
          <label>{t('inventory.weight')}</label>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={weightLbs}
            onChange={e => setWeightLbs(parseNumber(e.target.value))}
            data-testid="item-weight-input"
          />
        </div>
        <div>
          <label>{t('inventory.costPostShipping')}</label>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={costPostShipping}
            onChange={e => setCostPostShipping(parseNumber(e.target.value))}
            data-testid="item-cost-post-shipping-input"
          />
        </div>
        <div>
          <label>{t('inventory.costPreShipping')}</label>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={costPreShipping}
            onChange={e => setCostPreShipping(parseNumber(e.target.value))}
            data-testid="item-cost-pre-shipping-input"
          />
        </div>

        <div>
          <label>
            {t('inventory.minPrice')}{' '}
            <span className="formula-hint">{t('inventory.formulaHint20')}</span>
          </label>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={minPrice ?? 0}
            onChange={e => setMinPrice(parseNumber(e.target.value))}
            data-testid="item-min-price-input"
          />
        </div>
        <div>
          <label>
            {t('inventory.maxPrice')}{' '}
            <span className="formula-hint">{t('inventory.formulaHint30')}</span>
          </label>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={maxPrice ?? 0}
            onChange={e => setMaxPrice(parseNumber(e.target.value))}
            data-testid="item-max-price-input"
          />
        </div>

        <div>
          <label>{t('inventory.competitorAPrice')}</label>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={compA ?? ''}
            onChange={e => setCompA(e.target.value ? parseNumber(e.target.value) : undefined)}
          />
        </div>
        <div>
          <label>{t('inventory.competitorBPrice')}</label>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={compB ?? ''}
            onChange={e => setCompB(e.target.value ? parseNumber(e.target.value) : undefined)}
          />
        </div>

        <div className="col-span-2">
          <label>{t('inventory.notes')}</label>
          <input value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>

      <ImageUploadSection
        images={images}
        onImagesChange={setImages}
        primaryImageId={primaryImageId}
        onPrimaryImageChange={setPrimaryImageId}
      />

      <div className="summary grid two">
        <div>
          <b>{t('inventory.minProfit')}:</b> {fmtUSD(minProfit)}
        </div>
        <div>
          <b>{t('inventory.maxProfit')}:</b> {fmtUSD(maxProfit)}
        </div>
      </div>

      <div className="row gap end">
        <button className="primary" onClick={save}>
          {initial ? t('inventory.saveChanges') : t('inventory.addItem')}
        </button>
        <button onClick={onClose}>{t('common.cancel')}</button>
      </div>
    </Modal>
  );
}
