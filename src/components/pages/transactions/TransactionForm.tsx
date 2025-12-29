import React, { useState } from 'react';
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
  const [formData, setFormData] = useState({
    type: initial?.type || ('expense' as TransactionType),
    amount: initial?.amount?.toString() || '',
    description: initial?.description || '',
    category: initial?.category || '',
    notes: initial?.notes || '',
    paymentMethod: initial?.paymentMethod || ('cash' as PaymentMethod),
    paymentSource: initial?.paymentSource || ('external' as PaymentSource),
    revenueAmount: initial?.revenueAmount?.toString() || '',
    externalAmount: initial?.externalAmount?.toString() || '',
  });

  const isIncome = formData.type === 'income';
  const isDiscount = formData.type === 'discount';
  const isNonFinancial = isIncome || isDiscount; // Types that don't affect revenue calculations

  const [errors, setErrors] = useState<Record<string, string>>({});
  const isMixed = formData.paymentSource === 'mixed';
  const availableRevenue = RevenueService.calculateAvailableRevenue(db);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!formData.category.trim()) {
      newErrors.category = 'Category is required';
    }

    // Revenue validation (only for expenses/fees, not income or discount)
    if (!isNonFinancial && formData.paymentSource === 'revenue') {
      const totalAmt = parseFloat(formData.amount) || 0;
      if (totalAmt > availableRevenue) {
        newErrors.amount = `Insufficient revenue. Available: ${fmtUSD(availableRevenue)}`;
      }
    }

    // Mixed source validation (only for expenses/fees, not income or discount)
    if (!isNonFinancial && isMixed) {
      const revenueAmt = parseFloat(formData.revenueAmount) || 0;
      const externalAmt = parseFloat(formData.externalAmount) || 0;
      const totalAmt = parseFloat(formData.amount) || 0;

      if (revenueAmt <= 0 && externalAmt <= 0) {
        newErrors.mixedAmounts = 'Must specify amounts for both revenue and external funds';
      } else if (Math.abs(revenueAmt + externalAmt - totalAmt) > 0.01) {
        newErrors.mixedAmounts = 'Revenue + External amounts must equal total amount';
      } else if (revenueAmt > availableRevenue) {
        newErrors.mixedAmounts = `Revenue amount exceeds available funds. Available: ${fmtUSD(availableRevenue)}`;
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
              revenueAmount: parseFloat(formData.revenueAmount),
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
      if (field === 'revenueAmount' || field === 'externalAmount') {
        const totalAmount = parseFloat(prev.amount) || 0;
        if (field === 'revenueAmount') {
          const revenueAmount = parseFloat(value) || 0;
          const remainingExternal = Math.max(0, totalAmount - revenueAmount);
          newData.externalAmount = remainingExternal.toFixed(2);
        } else if (field === 'externalAmount') {
          const externalAmount = parseFloat(value) || 0;
          const remainingRevenue = Math.max(0, totalAmount - externalAmount);
          newData.revenueAmount = remainingRevenue.toFixed(2);
        }
      }

      return newData;
    });

    if (errors[field] || errors.mixedAmounts) {
      setErrors(prev => ({ ...prev, [field]: '', mixedAmounts: '' }));
    }
  };

  return (
    <Modal title={initial ? 'Edit Transaction' : 'Add Transaction'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="transaction-form">
        <div className="form-section">
          <label>
            Transaction Type *
            <select
              value={formData.type}
              onChange={e => updateField('type', e.target.value)}
              required
            >
              <option value="expense">Business Expense</option>
              <option value="fee">Fee Payment</option>
              <option value="income">Income / Revenue</option>
              <option value="discount">Discount (Purchase)</option>
            </select>
          </label>
        </div>

        <div className="form-section">
          <label>
            Description *
            <input
              type="text"
              value={formData.description}
              onChange={e => updateField('description', e.target.value)}
              placeholder="e.g., Branded shopping bags, Etsy listing fee"
              required
            />
            {errors.description && <div className="error">{errors.description}</div>}
          </label>
        </div>

        <div className="form-row">
          <label>
            Total Amount ($) *
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
            Category *
            <select
              value={formData.category}
              onChange={e => updateField('category', e.target.value)}
              required
            >
              <option value="">Select category</option>
              {TRANSACTION_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
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
                Payment Method
                <select
                  value={formData.paymentMethod}
                  onChange={e => updateField('paymentMethod', e.target.value as PaymentMethod)}
                >
                  <option value="cash">Cash</option>
                  <option value="transfer">Bank Transfer</option>
                  <option value="installments">Installments</option>
                  <option value="payment_link">Payment Link</option>
                  <option value="credit_card">Credit Card</option>
                </select>
              </label>

              <label>
                Payment Source
                <select
                  value={formData.paymentSource}
                  onChange={e => updateField('paymentSource', e.target.value as PaymentSource)}
                >
                  <option value="external">External Funds</option>
                  <option value="revenue">Business Revenue</option>
                  <option value="mixed">Mixed Sources</option>
                </select>
              </label>
            </div>

            {(formData.paymentSource === 'revenue' || formData.paymentSource === 'mixed') && (
              <div className="revenue-info">
                <div className="available-revenue">
                  <strong>Available Business Revenue: {fmtUSD(availableRevenue)}</strong>
                </div>
              </div>
            )}

            {isMixed && (
              <div className="form-section mixed-sources-section">
                <h4>Mixed Source Breakdown</h4>
                <div className="form-row">
                  <label>
                    From Business Revenue ($)
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.revenueAmount}
                      onChange={e => updateField('revenueAmount', e.target.value)}
                      placeholder="0.00"
                    />
                  </label>

                  <label>
                    From External Funds ($)
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
                <div className="mixed-hint">
                  Tip: When you enter one amount, the other will auto-calculate to match your total.
                </div>
              </div>
            )}
          </>
        )}

        {isIncome && (
          <div className="revenue-info">
            <div className="available-revenue">
              <strong>Note:</strong> Income transactions will be added to your business revenue and
              increase your available funds.
            </div>
          </div>
        )}

        {isDiscount && (
          <div className="revenue-info">
            <div className="available-revenue">
              <strong>Note:</strong> Discount transactions are tracked for informational purposes
              only. They do not affect revenue calculations or financial reports.
            </div>
          </div>
        )}

        <div className="form-section">
          <label>
            Notes
            <textarea
              value={formData.notes}
              onChange={e => updateField('notes', e.target.value)}
              placeholder="Additional details about this transaction..."
              rows={3}
            />
          </label>
        </div>

        <div className="form-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary">
            {initial ? 'Update Transaction' : 'Add Transaction'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
