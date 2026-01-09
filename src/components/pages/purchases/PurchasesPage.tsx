import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PurchaseForm } from './PurchaseForm';
import { DB, Purchase, InventoryItem } from '../../../types/models';
import { fmtUSD } from '../../../lib/utils';

interface PurchasesPageProps {
  db: DB;
  persist: (_db: DB) => void;
}

export function PurchasesPage({ db, persist }: PurchasesPageProps) {
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Purchase | null>(null);

  const onDelete = (id: string) => {
    if (!window.confirm(t('purchases.deletePurchase'))) return;
    const p = db.purchases.find(x => x.id === id);
    if (p) {
      const nextItems = db.items.map(it => {
        const qty = p.lines
          .filter(l => l.itemId === it.id)
          .reduce((acc, l) => acc + l.quantity + (l.hasSubItems ? (l.subItemsQty ?? 0) : 0), 0);
        return { ...it, stock: Math.max(0, it.stock - qty) };
      });
      persist({ ...db, items: nextItems, purchases: db.purchases.filter(x => x.id !== id) });
    } else {
      persist({ ...db, purchases: db.purchases.filter(x => x.id !== id) });
    }
  };

  const handleSave = (
    purchase: Purchase,
    updatedItems: InventoryItem[],
    updatedWithdrawals?: any[]
  ) => {
    const exists = db.purchases.find(p => p.id === purchase.id);
    const itemsWorking = [...db.items];

    // Remove the old purchase quantity subtraction logic since PurchaseForm now handles it
    // if (exists) {
    //   exists.lines.forEach(l => {
    //     const units = l.quantity + (l.hasSubItems ? (l.subItemsQty ?? 0) : 0);
    //     itemsWorking = itemsWorking.map(it =>
    //       it.id === l.itemId ? { ...it, stock: Math.max(0, it.stock - units) } : it
    //     );
    //   });
    // }

    updatedItems.forEach(ui => {
      const existingIdx = itemsWorking.findIndex(it => it.id === ui.id);
      if (existingIdx >= 0) {
        itemsWorking[existingIdx] = ui;
      } else {
        // New item added during purchase
        itemsWorking.push(ui);
      }
    });
    const nextPurchases = exists
      ? db.purchases.map(p => (p.id === purchase.id ? purchase : p))
      : [...db.purchases, purchase];

    const nextWithdrawals = updatedWithdrawals ?? db.cashWithdrawals;

    persist({
      ...db,
      items: itemsWorking,
      purchases: nextPurchases,
      cashWithdrawals: nextWithdrawals,
    });
    setShowForm(false);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>{t('purchases.title')}</h2>
        <button
          className="primary"
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        >
          {t('purchases.registerPurchase')}
        </button>
      </div>

      <div className="cards two-cols" data-testid="purchase-cards">
        {db.purchases.map(p => (
          <div key={p.id} className="card" data-testid="purchase-card">
            <div className="card-row">
              <div className="card-title">{t('purchases.purchaseNumber', { id: p.id })}</div>
              <div className="muted">{new Date(p.createdAt).toLocaleDateString()}</div>
            </div>
            <div className="grid three">
              <div>
                <b>{t('purchases.subtotal')}:</b> {fmtUSD(p.subtotal)}
              </div>
              <div>
                <b>{t('purchases.tax')}:</b> {fmtUSD(p.tax)}
              </div>
              <div>
                <b>{t('purchases.total')}:</b> {fmtUSD(p.totalCost)}
              </div>
              <div>
                <b>{t('purchases.shippingUS')}:</b> {fmtUSD(p.shippingUS)}
              </div>
              <div>
                <b>{t('purchases.shippingIntl')}:</b> {fmtUSD(p.shippingIntl)}
              </div>
              <div>
                <b>{t('purchases.items')}:</b> {p.totalUnits}
              </div>
            </div>
            <div className="row gap">
              <button
                onClick={() => {
                  setEditing(p);
                  setShowForm(true);
                }}
              >
                {t('common.edit')}
              </button>
              <button className="danger" onClick={() => onDelete(p.id)}>
                {t('common.delete')}
              </button>
            </div>
          </div>
        ))}
        {db.purchases.length === 0 && <div className="empty">{t('purchases.noPurchases')}</div>}
      </div>

      {showForm && (
        <PurchaseForm
          db={db}
          initial={editing ?? undefined}
          onClose={() => setShowForm(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
