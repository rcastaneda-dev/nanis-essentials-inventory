import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../shared/Modal';
import {
  Transaction,
  TransactionType,
  PaymentMethod,
  PaymentSource,
  DB,
} from '../../../types/models';
import { RevenueService } from '../../../lib/revenueService';
import { fmtUSD } from '../../../lib/utils';
import { getTransactionCategoryTranslationKey } from '../../../lib/transactionUtils';

interface TransactionFormProps {
  initial?: Transaction;
  onClose: () => void;
  onSave: (_transaction: Transaction) => void;
  db: DB;
}

const TRANSACTION_CATEGORIES = [
  'Packaging',
  'Marketing',
  'Platform Fees',
  'Payment Processing',
  'Equipment',
  'Office Supplies',
  'Professional Services',
  'Shipping Supplies',
  'Branding Materials',
  'Other',
];

export function TransactionForm({ initial, onClose, onSave, db }: TransactionFormProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    type: initial?.type || ('expense' as TransactionType),
    amount: initial?.amount?.toString() || '',
    description: initial?.description || '',
    category: initial?.category || '',
    notes: initial?.notes || '',
    paymentMethod: initial?.paymentMethod || ('cash' as PaymentMethod),
    paymentSource: initial?.paymentSource || ('external' as PaymentSource),
    cashAmount: initial?.cashAmount?.toString() || '',
    externalAmount: initial?.externalAmount?.toString() || '',
  });

  const isIncome = formData.type === 'income';
  const isDiscount = formData.type === 'discount';
  const isNonFinancial = isIncome || isDiscount; // Types that don't affect revenue calculations

  const [errors, setErrors] = useState<Record<string, string>>({});
  const isMixed = formData.paymentSource === 'mixed';
  const availableCash = RevenueService.calculateAvailableCash(db);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.description.trim()) {
      newErrors.description = t('transactions.descriptionRequired');
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = t('transactions.amountMustBeGreaterThanZero');
    }

    if (!formData.category.trim()) {
      newErrors.category = t('transactions.categoryRequired');
    }

    // Cash validation (only for expenses/fees, not income or discount)
    if (!isNonFinancial && formData.paymentSource === 'revenue') {
      const totalAmt = parseFloat(formData.amount) || 0;
      if (totalAmt > availableCash) {
        newErrors.amount = t('transactions.insufficientCash', {
          amount: fmtUSD(availableCash),
        });
      }
    }

    // Mixed source validation (only for expenses/fees, not income or discount)
    if (!isNonFinancial && isMixed) {
      const cashAmt = parseFloat(formData.cashAmount) || 0;
      const externalAmt = parseFloat(formData.externalAmount) || 0;
      const totalAmt = parseFloat(formData.amount) || 0;

      if (cashAmt <= 0 && externalAmt <= 0) {
        newErrors.mixedAmounts = t('transactions.mustSpecifyBothAmounts');
      } else if (Math.abs(cashAmt + externalAmt - totalAmt) > 0.01) {
        newErrors.mixedAmounts = t('transactions.amountsMustEqualTotal');
      } else if (cashAmt > availableCash) {
        newErrors.mixedAmounts = t('transactions.cashAmountExceedsAvailable', {
          amount: fmtUSD(availableCash),
        });
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const transaction: Transaction = {
      id: initial?.id || `txn-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type: formData.type,
      amount: parseFloat(formData.amount),
      description: formData.description.trim(),
      category: formData.category.trim(),
      notes: formData.notes.trim() || undefined,
      createdAt: initial?.createdAt || new Date().toISOString(),
      // Income and discount transactions don't need payment info
      ...(isNonFinancial
        ? {}
        : {
            paymentMethod: formData.paymentMethod,
            paymentSource: formData.paymentSource,
            // Include mixed source breakdown only if mixed
            ...(isMixed && {
              cashAmount: parseFloat(formData.cashAmount),
              externalAmount: parseFloat(formData.externalAmount),
            }),
          }),
    };

    onSave(transaction);
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };

      // Auto-calculate remaining amount for mixed sources
      if (field === 'cashAmount' || field === 'externalAmount') {
        const totalAmount = parseFloat(prev.amount) || 0;
        if (field === 'cashAmount') {
          const cashAmount = parseFloat(value) || 0;
          const remainingExternal = Math.max(0, totalAmount - cashAmount);
          newData.externalAmount = remainingExternal.toFixed(2);
        } else if (field === 'externalAmount') {
          const externalAmount = parseFloat(value) || 0;
          const remainingCash = Math.max(0, totalAmount - externalAmount);
          newData.cashAmount = remainingCash.toFixed(2);
        }
      }

      return newData;
    });

    if (errors[field] || errors.mixedAmounts) {
      setErrors(prev => ({ ...prev, [field]: '', mixedAmounts: '' }));
    }
  };

  return (
    <Modal
      title={initial ? t('transactions.editTransaction') : t('transactions.addTransaction')}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="transaction-form">
        <div className="form-section">
          <label>
            {t('transactions.transactionType')}
            <select
              value={formData.type}
              onChange={e => updateField('type', e.target.value)}
              required
            >
              <option value="expense">{t('transactions.businessExpense')}</option>
              <option value="fee">{t('transactions.feePayment')}</option>
              <option value="income">{t('transactions.income')}</option>
              <option value="discount">{t('transactions.discount')}</option>
            </select>
          </label>
        </div>

        <div className="form-section">
          <label>
            {t('transactions.description')}
            <input
              type="text"
              value={formData.description}
              onChange={e => updateField('description', e.target.value)}
              placeholder={t('transactions.descriptionPlaceholder')}
              required
            />
            {errors.description && <div className="error">{errors.description}</div>}
          </label>
        </div>

        <div className="form-row">
          <label>
            {t('transactions.totalAmount')}
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={e => updateField('amount', e.target.value)}
              placeholder="0.00"
              required
            />
            {errors.amount && <div className="error">{errors.amount}</div>}
          </label>

          <label>
            {t('transactions.category')} *
            <select
              value={formData.category}
              onChange={e => updateField('category', e.target.value)}
              required
            >
              <option value="">{t('transactions.selectCategory')}</option>
              {TRANSACTION_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>
                  {t(
                    `transactions.transactionCategories.${getTransactionCategoryTranslationKey(cat)}`
                  )}
                </option>
              ))}
            </select>
            {errors.category && <div className="error">{errors.category}</div>}
          </label>
        </div>

        {!isNonFinancial && (
          <>
            <div className="form-row">
              <label>
                {t('transactions.paymentMethod')}
                <select
                  value={formData.paymentMethod}
                  onChange={e => updateField('paymentMethod', e.target.value as PaymentMethod)}
                >
                  <option value="cash">{t('transactions.cash')}</option>
                  <option value="transfer">{t('transactions.transfer')}</option>
                  <option value="installments">{t('transactions.installments')}</option>
                  <option value="payment_link">{t('transactions.paymentLink')}</option>
                  <option value="credit_card">{t('transactions.creditCard')}</option>
                </select>
              </label>

              <label>
                {t('transactions.paymentSource')}
                <select
                  value={formData.paymentSource}
                  onChange={e => updateField('paymentSource', e.target.value as PaymentSource)}
                >
                  <option value="external">{t('transactions.externalFunds')}</option>
                  <option value="revenue">{t('transactions.businessCash')}</option>
                  <option value="mixed">{t('transactions.mixedSources')}</option>
                </select>
              </label>
            </div>

            {(formData.paymentSource === 'revenue' || formData.paymentSource === 'mixed') && (
              <div className="revenue-info">
                <div className="available-revenue">
                  <strong>
                    {t('transactions.availableBusinessCash')}: {fmtUSD(availableCash)}
                  </strong>
                </div>
              </div>
            )}

            {isMixed && (
              <div className="form-section mixed-sources-section">
                <h4>{t('transactions.mixedSourceBreakdown')}</h4>
                <div className="form-row">
                  <label>
                    {t('transactions.fromBusinessCash')}
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.cashAmount}
                      onChange={e => updateField('cashAmount', e.target.value)}
                      placeholder="0.00"
                    />
                  </label>

                  <label>
                    {t('transactions.fromExternalFunds')}
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.externalAmount}
                      onChange={e => updateField('externalAmount', e.target.value)}
                      placeholder="0.00"
                    />
                  </label>
                </div>
                {errors.mixedAmounts && <div className="error">{errors.mixedAmounts}</div>}
                <div className="mixed-hint">{t('transactions.mixedHint')}</div>
              </div>
            )}
          </>
        )}

        {isIncome && (
          <div className="revenue-info">
            <div className="available-revenue">
              <strong>{t('transactions.incomeNote')}</strong>
            </div>
          </div>
        )}

        {isDiscount && (
          <div className="revenue-info">
            <div className="available-revenue">
              <strong>{t('transactions.discountNote')}</strong>
            </div>
          </div>
        )}

        <div className="form-section">
          <label>
            {t('transactions.notes')}
            <textarea
              value={formData.notes}
              onChange={e => updateField('notes', e.target.value)}
              placeholder={t('transactions.notes')}
              rows={3}
            />
          </label>
        </div>

        <div className="form-actions">
          <button type="button" onClick={onClose}>
            {t('transactions.cancel')}
          </button>
          <button type="submit" className="primary">
            {initial ? t('transactions.updateTransaction') : t('transactions.addTransaction')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
