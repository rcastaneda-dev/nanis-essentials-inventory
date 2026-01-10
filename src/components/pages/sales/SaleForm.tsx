import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../shared/Modal';
import {
  DB,
  Sale,
  SaleLine,
  InventoryItem,
  PaymentMethod,
  SalesChannel,
} from '../../../types/models';
import { parseNumber, uid, nowIso, fmtUSD } from '../../../lib/utils';

interface SaleFormProps {
  db: DB;
  initial?: Sale;
  onClose: () => void;
  onSave: (_sale: Sale, _updatedItems: InventoryItem[]) => void;
}

export function SaleForm({ db, initial, onClose, onSave }: SaleFormProps) {
  const { t } = useTranslation();
  const [lines, setLines] = useState<SaleLine[]>(
    initial?.lines ?? [
      {
        id: uid(),
        itemId: '',
        quantity: 1,
        unitPrice: 0,
      },
    ]
  );
  const [buyerName, setBuyerName] = useState<string>(initial?.buyerName ?? '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    initial?.paymentMethod ?? 'cash'
  );
  const [channel, setChannel] = useState<SalesChannel | ''>(initial?.channel ?? '');
  const [branchId, setBranchId] = useState<string | ''>(initial?.branchId ?? '');
  const [numberOfPayments, setNumberOfPayments] = useState<number>(
    initial?.installments?.numberOfPayments ?? 2
  );
  const [thirdPartyDelivery, setThirdPartyDelivery] = useState<boolean>(
    initial?.thirdPartyDelivery ?? false
  );

  // Convert ISO string to YYYY-MM-DD format for date input
  const toDateInputValue = (isoString: string) => {
    return isoString.split('T')[0];
  };

  const [saleDate, setSaleDate] = useState<string>(
    initial?.createdAt ? toDateInputValue(initial.createdAt) : toDateInputValue(nowIso())
  );

  // Build unique buyer options from existing sales
  const buyerOptions = useMemo(() => {
    const names = new Set<string>();
    db.sales.forEach((s: any) => {
      if (s.buyerName) names.add(s.buyerName);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [db.sales]);

  // Autocomplete state for buyer name
  const [showBuyerSuggestions, setShowBuyerSuggestions] = useState(false);
  const [buyerActiveIndex, setBuyerActiveIndex] = useState(0);
  const filteredBuyerOptions = useMemo(() => {
    const q = buyerName.trim().toLowerCase();
    if (!q) return buyerOptions;
    return buyerOptions.filter(n => n.toLowerCase().includes(q));
  }, [buyerName, buyerOptions]);

  // Autocomplete state for item selection (per line)
  const [itemSearchQueries, setItemSearchQueries] = useState<Record<string, string>>({});
  const [showItemSuggestions, setShowItemSuggestions] = useState<Record<string, boolean>>({});
  const [itemActiveIndices, setItemActiveIndices] = useState<Record<string, number>>({});
  const itemBlurTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});
  const buyerBlurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const linesRef = useRef<SaleLine[]>(lines);
  const dbRef = useRef<DB>(db);

  // Get available items based on branch filter
  const availableItems = useMemo(() => {
    return db.items
      .filter(i => {
        if (branchId) {
          return i.stock > 0 && i.branchId === branchId;
        }
        return i.stock > 0 && !i.branchId;
      })
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [db.items, branchId]);

  // Get filtered items for a specific line
  const getFilteredItems = (lineId: string) => {
    const query = itemSearchQueries[lineId]?.trim().toLowerCase() || '';
    if (!query) return availableItems;
    return availableItems.filter(i => i.name.toLowerCase().includes(query));
  };

  // Keep refs in sync with current state/props
  linesRef.current = lines;
  dbRef.current = db;

  // Cleanup all pending timeouts on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      // Clear all item blur timeouts
      Object.values(itemBlurTimeoutsRef.current).forEach(timeout => {
        clearTimeout(timeout);
      });
      itemBlurTimeoutsRef.current = {};

      // Clear buyer blur timeout
      if (buyerBlurTimeoutRef.current) {
        clearTimeout(buyerBlurTimeoutRef.current);
        buyerBlurTimeoutRef.current = null;
      }
    };
  }, []);

  function addLine() {
    setLines([
      ...lines,
      {
        id: uid(),
        itemId: db.items[0]?.id ?? '',
        quantity: 1,
        unitPrice: db.items[0]?.minPrice ?? 0,
      },
    ]);
  }

  function deleteLine(lineId: string) {
    if (lines.length > 1) {
      setLines(lines.filter(l => l.id !== lineId));

      // Clean up autocomplete state for the deleted line
      setItemSearchQueries(prev => {
        const next = { ...prev };
        delete next[lineId];
        return next;
      });
      setShowItemSuggestions(prev => {
        const next = { ...prev };
        delete next[lineId];
        return next;
      });
      setItemActiveIndices(prev => {
        const next = { ...prev };
        delete next[lineId];
        return next;
      });

      // Clear any pending timeout for the deleted line
      if (itemBlurTimeoutsRef.current[lineId]) {
        clearTimeout(itemBlurTimeoutsRef.current[lineId]);
        delete itemBlurTimeoutsRef.current[lineId];
      }
    }
  }

  const total = lines.reduce((acc, l) => acc + l.quantity * l.unitPrice, 0);
  const amountPerPayment =
    paymentMethod === 'installments' && numberOfPayments > 0 ? total / numberOfPayments : 0;

  function save() {
    if (!lines.length) {
      alert(t('purchases.addAtLeastOneItem'));
      return;
    }
    if (!lines.every(l => l.itemId)) {
      alert(t('purchases.selectItemForAllLines'));
      return;
    }

    // Validate sale date is not more than 1 week in the past
    const selectedDate = new Date(saleDate);
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    oneWeekAgo.setHours(0, 0, 0, 0);

    if (selectedDate < oneWeekAgo) {
      alert(t('sales.dateCannotBeMoreThanWeekOld'));
      return;
    }

    // Convert YYYY-MM-DD to ISO timestamp, preserving time if editing
    const saleDateISO = initial?.createdAt
      ? new Date(saleDate + 'T' + initial.createdAt.split('T')[1]).toISOString()
      : new Date(saleDate).toISOString();

    const s: Sale = {
      id: initial?.id ?? uid(),
      createdAt: saleDateISO,
      buyerName: buyerName.trim() || undefined,
      paymentMethod,
      channel: channel || undefined,
      branchId: branchId || undefined,
      installments:
        paymentMethod === 'installments' ? { numberOfPayments, amountPerPayment } : undefined,
      lines,
      totalAmount: total,
      thirdPartyDelivery: thirdPartyDelivery || undefined,
    };

    let itemsUpdated = [...db.items];
    lines.forEach(l => {
      // Find the item in the correct inventory (main or branch)
      const itemToUpdate = branchId
        ? itemsUpdated.find(it => it.id === l.itemId && it.branchId === branchId)
        : itemsUpdated.find(it => it.id === l.itemId && !it.branchId);

      if (itemToUpdate) {
        itemsUpdated = itemsUpdated.map(it => {
          if (it.id !== itemToUpdate.id) return it;
          const next = Math.max(0, it.stock - l.quantity);
          return { ...it, stock: next, updatedAt: nowIso() };
        });
      }
    });

    onSave(s, itemsUpdated);
  }

  return (
    <Modal title={initial ? t('sales.editSale') : t('sales.registerSale')} onClose={onClose}>
      <div className="section-title">{t('sales.saleItems')}</div>

      {lines.map((l, idx) => {
        const selectedItem = db.items.find(i => i.id === l.itemId);
        const priceRange = selectedItem
          ? `${fmtUSD(selectedItem.minPrice ?? 0)} - ${fmtUSD(selectedItem.maxPrice ?? 0)}`
          : '';

        return (
          <div key={l.id} className="grid-with-delete">
            <div className="grid three row-gap">
              <div>
                <label>{t('purchases.selectItem')}</label>
                <div className="autocomplete">
                  <input
                    type="text"
                    placeholder={t('sales.typeToSearchItems')}
                    value={
                      itemSearchQueries[l.id] !== undefined
                        ? itemSearchQueries[l.id]
                        : selectedItem?.name || ''
                    }
                    onFocus={() => {
                      // Cancel any pending blur timeout for this line
                      if (itemBlurTimeoutsRef.current[l.id]) {
                        clearTimeout(itemBlurTimeoutsRef.current[l.id]);
                        delete itemBlurTimeoutsRef.current[l.id];
                      }
                      setShowItemSuggestions(prev => ({ ...prev, [l.id]: true }));
                      // Look up item from current db to avoid stale closure
                      if (!itemSearchQueries[l.id]) {
                        const currentItem = dbRef.current.items.find(i => i.id === l.itemId);
                        if (currentItem) {
                          setItemSearchQueries(prev => ({ ...prev, [l.id]: currentItem.name }));
                        }
                      }
                    }}
                    onChange={e => {
                      const query = e.target.value;
                      setItemSearchQueries(prev => ({ ...prev, [l.id]: query }));
                      setShowItemSuggestions(prev => ({ ...prev, [l.id]: true }));
                      setItemActiveIndices(prev => ({ ...prev, [l.id]: 0 }));
                    }}
                    onKeyDown={e => {
                      const filtered = getFilteredItems(l.id);
                      const isShowing = showItemSuggestions[l.id];
                      if (!isShowing || filtered.length === 0) return;

                      const activeIdx = itemActiveIndices[l.id] || 0;

                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setItemActiveIndices(prev => ({
                          ...prev,
                          [l.id]: Math.min(activeIdx + 1, filtered.length - 1),
                        }));
                      }
                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setItemActiveIndices(prev => ({
                          ...prev,
                          [l.id]: Math.max(activeIdx - 1, 0),
                        }));
                      }
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const selected = filtered[activeIdx];
                        if (selected) {
                          const defaultPrice = selected.minPrice ?? 0;
                          setLines(
                            lines.map(x =>
                              x.id === l.id
                                ? {
                                    ...x,
                                    itemId: selected.id,
                                    unitPrice: defaultPrice,
                                  }
                                : x
                            )
                          );
                          setItemSearchQueries(prev => ({ ...prev, [l.id]: selected.name }));
                          setShowItemSuggestions(prev => ({ ...prev, [l.id]: false }));
                        }
                      }
                      if (e.key === 'Escape') {
                        setShowItemSuggestions(prev => ({ ...prev, [l.id]: false }));
                      }
                    }}
                    onBlur={() => {
                      // Clear any existing timeout for this line
                      if (itemBlurTimeoutsRef.current[l.id]) {
                        clearTimeout(itemBlurTimeoutsRef.current[l.id]);
                      }
                      // Store lineId to avoid stale closure
                      const lineId = l.id;
                      // Set new timeout and store its ID
                      itemBlurTimeoutsRef.current[lineId] = setTimeout(() => {
                        setShowItemSuggestions(prev => ({ ...prev, [lineId]: false }));
                        // Read the current selected item from refs (which have latest state/props) to avoid stale closure
                        const currentLine = linesRef.current.find(line => line.id === lineId);
                        if (currentLine) {
                          const currentSelectedItem = dbRef.current.items.find(
                            i => i.id === currentLine.itemId
                          );
                          // Only reset if the current query doesn't match the selected item
                          // This prevents overwriting a newly selected item's name
                          if (currentSelectedItem) {
                            setItemSearchQueries(prev => {
                              if (prev[lineId] !== currentSelectedItem.name) {
                                return { ...prev, [lineId]: currentSelectedItem.name };
                              }
                              return prev;
                            });
                          }
                        }
                        delete itemBlurTimeoutsRef.current[lineId];
                      }, 100);
                    }}
                    autoComplete="off"
                  />
                  {showItemSuggestions[l.id] && getFilteredItems(l.id).length > 0 && (
                    <div className="autocomplete-list" role="listbox">
                      {getFilteredItems(l.id).map((item, idx) => {
                        const activeIdx = itemActiveIndices[l.id] || 0;
                        return (
                          <div
                            key={item.id}
                            role="option"
                            aria-selected={activeIdx === idx}
                            className={`autocomplete-item ${activeIdx === idx ? 'active' : ''}`}
                            onMouseDown={() => {
                              const defaultPrice = item.minPrice ?? 0;
                              setLines(
                                lines.map(x =>
                                  x.id === l.id
                                    ? {
                                        ...x,
                                        itemId: item.id,
                                        unitPrice: defaultPrice,
                                      }
                                    : x
                                )
                              );
                              setItemSearchQueries(prev => ({ ...prev, [l.id]: item.name }));
                              setShowItemSuggestions(prev => ({ ...prev, [l.id]: false }));
                            }}
                          >
                            {item.name}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label>{t('purchases.quantity')}</label>
                <input
                  type="number"
                  value={l.quantity}
                  onChange={e =>
                    setLines(
                      lines.map(x =>
                        x.id === l.id ? { ...x, quantity: parseNumber(e.target.value) } : x
                      )
                    )
                  }
                />
              </div>
              <div>
                <label>
                  {t('sales.unitPrice')}
                  {priceRange && (
                    <span className="price-range-inline">
                      {t('sales.range')}: {priceRange}
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={l.unitPrice}
                  onChange={e =>
                    setLines(
                      lines.map(x =>
                        x.id === l.id ? { ...x, unitPrice: parseNumber(e.target.value) } : x
                      )
                    )
                  }
                />
              </div>
              {idx === lines.length - 1 && (
                <div className="col-span-3">
                  <button className="link" onClick={addLine}>
                    {t('purchases.addAnotherItem')}
                  </button>
                </div>
              )}
            </div>
            {lines.length > 1 && (
              <button
                type="button"
                className="delete-line-btn"
                onClick={() => deleteLine(l.id)}
                title={t('purchases.removeItem')}
              >
                ✕
              </button>
            )}
          </div>
        );
      })}

      <div className="grid three row-gap">
        <div>
          <label>{t('sales.saleDate')}</label>
          <input
            type="date"
            value={saleDate}
            max={toDateInputValue(nowIso())}
            onChange={e => setSaleDate(e.target.value)}
          />
        </div>
        <div>
          <label>{t('sales.buyerName')}</label>
          <div className="autocomplete">
            <input
              type="text"
              placeholder={t('sales.enterCustomerName')}
              value={buyerName}
              onFocus={() => {
                // Cancel any pending blur timeout
                if (buyerBlurTimeoutRef.current) {
                  clearTimeout(buyerBlurTimeoutRef.current);
                  buyerBlurTimeoutRef.current = null;
                }
                setShowBuyerSuggestions(true);
              }}
              onChange={e => {
                setBuyerName(e.target.value);
                setShowBuyerSuggestions(true);
                setBuyerActiveIndex(0);
              }}
              onKeyDown={e => {
                if (!showBuyerSuggestions || filteredBuyerOptions.length === 0) return;
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setBuyerActiveIndex(i => Math.min(i + 1, filteredBuyerOptions.length - 1));
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setBuyerActiveIndex(i => Math.max(i - 1, 0));
                }
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const val = filteredBuyerOptions[buyerActiveIndex];
                  if (val) {
                    setBuyerName(val);
                    setShowBuyerSuggestions(false);
                  }
                }
                if (e.key === 'Escape') {
                  setShowBuyerSuggestions(false);
                }
              }}
              onBlur={() => {
                // Clear any existing timeout
                if (buyerBlurTimeoutRef.current) {
                  clearTimeout(buyerBlurTimeoutRef.current);
                }
                // Set new timeout and store its ID
                buyerBlurTimeoutRef.current = setTimeout(() => {
                  setShowBuyerSuggestions(false);
                  buyerBlurTimeoutRef.current = null;
                }, 100);
              }}
              autoComplete="off"
            />
            {showBuyerSuggestions && filteredBuyerOptions.length > 0 && (
              <div className="autocomplete-list" role="listbox">
                {filteredBuyerOptions.map((name, idx) => (
                  <div
                    key={name}
                    role="option"
                    aria-selected={buyerActiveIndex === idx}
                    className={`autocomplete-item ${buyerActiveIndex === idx ? 'active' : ''}`}
                    onMouseDown={() => {
                      setBuyerName(name);
                      setShowBuyerSuggestions(false);
                    }}
                  >
                    {name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div>
          <label>{t('sales.salesChannel')}</label>
          <select value={channel} onChange={e => setChannel(e.target.value as SalesChannel | '')}>
            <option value="">{t('sales.selectChannel')}</option>
            <option value="facebook_marketplace">{t('sales.facebookMarketplace')}</option>
            <option value="instagram">{t('sales.instagram')}</option>
            <option value="tiktok">{t('sales.tiktok')}</option>
            <option value="family_friends">{t('sales.familyFriends')}</option>
            <option value="loyal_customer">{t('sales.loyalCustomer')}</option>
            <option value="referred_to_store">{t('sales.referredToStore')}</option>
            <option value="store_customer">{t('sales.storeCustomer')}</option>
            <option value="other">{t('sales.other')}</option>
          </select>
        </div>
        <div>
          <label>{t('sales.whereWasThisSold')}</label>
          <select value={branchId} onChange={e => setBranchId(e.target.value)}>
            <option value="">{t('sales.mainInventory')}</option>
            {db.branches
              ?.filter(b => !b.closedAt)
              .map(branch => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label>{t('sales.paymentMethod')}</label>
          <select
            value={paymentMethod}
            onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
          >
            <option value="cash">{t('transactions.cash')}</option>
            <option value="transfer">{t('transactions.transfer')}</option>
            <option value="installments">{t('transactions.installments')}</option>
            <option value="payment_link">{t('transactions.paymentLink')}</option>
            <option value="credit_card">{t('transactions.creditCard')}</option>
          </select>
        </div>
        <div className="checkbox">
          <label>
            <input
              type="checkbox"
              checked={thirdPartyDelivery}
              onChange={e => setThirdPartyDelivery(e.target.checked)}
            />
            {t('sales.thirdPartyDelivery')}
          </label>
        </div>
        {paymentMethod === 'installments' && (
          <>
            <div>
              <label>{t('sales.numberOfPayments')}</label>
              <input
                type="number"
                value={numberOfPayments}
                onChange={e => setNumberOfPayments(parseNumber(e.target.value))}
              />
            </div>
            <div className="summary">
              <b>{t('sales.amountPerPayment')}:</b> {fmtUSD(amountPerPayment)}
            </div>
          </>
        )}
        <div className="col-span-3 summary">
          <b>{t('sales.totalAmount')}:</b> {fmtUSD(total)}
        </div>
      </div>

      <div className="row gap end">
        <button className="primary" onClick={save}>
          {initial ? t('purchases.saveChanges') : t('sales.registerSale')}
        </button>
        <button onClick={onClose}>{t('common.cancel')}</button>
      </div>
    </Modal>
  );
}
