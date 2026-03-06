import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PurchaseForm } from './PurchaseForm';
import { DB, Purchase, InventoryItem, CashWithdrawal } from '../../../types/models';
import { fmtUSD } from '../../../lib/utils';

interface PurchasesPageProps {
  db: DB;

  savePurchase: (
    purchase: Purchase,
    updatedItems: InventoryItem[],
    updatedWithdrawals?: CashWithdrawal[]
  ) => Promise<void>;
  removePurchase: (id: string, restoredItems: InventoryItem[]) => Promise<void>;
}

export function PurchasesPage({ db, savePurchase, removePurchase }: PurchasesPageProps) {
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Purchase | null>(null);

  const onDelete = (id: string) => {
    if (!window.confirm(t('purchases.deletePurchase'))) return;
    const p = db.purchases.find(x => x.id === id);
    if (p) {
      const restoredItems = db.items
        .map(it => {
          const qty = p.lines
            .filter(l => l.itemId === it.id)
            .reduce((acc, l) => acc + l.quantity, 0);
          return qty > 0 ? { ...it, stock: Math.max(0, it.stock - qty) } : it;
        })
        .filter(it => {
          const original = db.items.find(o => o.id === it.id);
          return original && original.stock !== it.stock;
        });
      removePurchase(id, restoredItems);
    } else {
      removePurchase(id, []);
    }
  };

  const handleSave = (
    purchase: Purchase,
    updatedItems: InventoryItem[],
    updatedWithdrawals?: CashWithdrawal[]
  ) => {
    savePurchase(purchase, updatedItems, updatedWithdrawals);
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
