import { useState, useEffect, useCallback } from 'react';
import {
  DB,
  InventoryItem,
  Purchase,
  Sale,
  Transaction,
  CashWithdrawal,
  Branch,
  Settings,
  DEFAULT_SETTINGS,
} from '../types/models';
import {
  fetchAllProducts,
  upsertProduct,
  persistMoveToBranch,
  PendingMoveToBranch,
} from '../lib/supabase/productService';
import {
  fetchAllBranches,
  upsertBranch as upsertBranchApi,
  deleteBranch as deleteBranchApi,
} from '../lib/supabase/branchService';
import { fetchAllBrands } from '../lib/supabase/brandService';
import {
  fetchSettings,
  updateSettings as updateSettingsApi,
} from '../lib/supabase/settingsService';
import {
  fetchAllTransactions,
  upsertTransaction as upsertTransactionApi,
  deleteTransaction as deleteTransactionApi,
} from '../lib/supabase/transactionService';
import {
  fetchAllCashWithdrawals,
  upsertCashWithdrawal as upsertCashWithdrawalApi,
} from '../lib/supabase/cashWithdrawalService';
import {
  fetchAllPurchases,
  upsertPurchaseWithRelations,
  deletePurchase as deletePurchaseApi,
} from '../lib/supabase/purchaseService';
import {
  fetchAllSales,
  upsertSaleWithRelations,
  deleteSale as deleteSaleApi,
} from '../lib/supabase/saleService';

const EMPTY_DB: DB = {
  items: [],
  purchases: [],
  sales: [],
  settings: { ...DEFAULT_SETTINGS },
  cashWithdrawals: [],
  transactions: [],
  branches: [],
  brands: [],
};

export function useAppData() {
  const [db, setDb] = useState<DB>(EMPTY_DB);
  const [loading, setLoading] = useState(true);

  // Load all entities from Supabase on mount
  useEffect(() => {
    Promise.all([
      fetchAllProducts(),
      fetchAllBranches(),
      fetchSettings(),
      fetchAllPurchases(),
      fetchAllSales(),
      fetchAllTransactions(),
      fetchAllCashWithdrawals(),
      fetchAllBrands(),
    ])
      .then(
        ([items, branches, settings, purchases, sales, transactions, cashWithdrawals, brands]) => {
          setDb({
            items,
            branches,
            settings,
            purchases,
            sales,
            transactions,
            cashWithdrawals,
            brands,
          });
        }
      )
      .catch(err => {
        // eslint-disable-next-line no-console
        console.error('Failed to load data from Supabase:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  /** Update local state only -- Supabase writes happen in individual save functions. */
  const persist = useCallback((next: DB) => {
    setDb(next);
  }, []);

  const refreshData = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchAllProducts(),
      fetchAllBranches(),
      fetchSettings(),
      fetchAllPurchases(),
      fetchAllSales(),
      fetchAllTransactions(),
      fetchAllCashWithdrawals(),
      fetchAllBrands(),
    ])
      .then(
        ([items, branches, settings, purchases, sales, transactions, cashWithdrawals, brands]) => {
          setDb({
            items,
            branches,
            settings,
            purchases,
            sales,
            transactions,
            cashWithdrawals,
            brands,
          });
        }
      )
      .catch(err => {
        // eslint-disable-next-line no-console
        console.error('Failed to refresh data from Supabase:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  // --- Product ---

  const saveProduct = useCallback(async (item: InventoryItem) => {
    const tempId = item.id;
    const itemBranchId = item.branchId ?? null;
    const matches = (i: InventoryItem) => i.id === tempId && (i.branchId ?? null) === itemBranchId;

    setDb(prev => {
      const exists = prev.items.find(matches);
      const nextItems = exists
        ? prev.items.map(i => (matches(i) ? item : i))
        : [...prev.items, item];
      return { ...prev, items: nextItems };
    });
    const dbId = await upsertProduct(item);
    if (dbId !== tempId) {
      setDb(prev => ({
        ...prev,
        items: prev.items.map(i => (matches(i) ? { ...i, id: dbId } : i)),
      }));
    }
  }, []);

  // --- Branch ---

  const saveBranch = useCallback(async (branch: Branch) => {
    const tempId = branch.id;
    setDb(prev => {
      const exists = prev.branches.find(b => b.id === tempId);
      const nextBranches = exists
        ? prev.branches.map(b => (b.id === tempId ? branch : b))
        : [...prev.branches, branch];
      return { ...prev, branches: nextBranches };
    });
    const dbId = await upsertBranchApi(branch);
    if (dbId !== tempId) {
      setDb(prev => ({
        ...prev,
        branches: prev.branches.map(b => (b.id === tempId ? { ...b, id: dbId } : b)),
      }));
    }
  }, []);

  const saveMoveToBranch = useCallback(
    async (
      pendingMoves: PendingMoveToBranch[],
      targetBranchId: string,
      updatedItems: InventoryItem[]
    ) => {
      await persistMoveToBranch(pendingMoves, targetBranchId, updatedItems);
      setDb(prev => ({ ...prev, items: updatedItems }));
    },
    []
  );

  const removeBranch = useCallback(async (id: string) => {
    setDb(prev => ({ ...prev, branches: prev.branches.filter(b => b.id !== id) }));
    await deleteBranchApi(id);
  }, []);

  // --- Settings ---

  const saveSettings = useCallback(async (settings: Settings) => {
    setDb(prev => ({ ...prev, settings }));
    await updateSettingsApi(settings);
  }, []);

  // --- Transaction ---

  const saveTransaction = useCallback(async (tx: Transaction) => {
    const tempId = tx.id;
    setDb(prev => {
      const exists = prev.transactions.find(t => t.id === tempId);
      const next = exists
        ? prev.transactions.map(t => (t.id === tempId ? tx : t))
        : [...prev.transactions, tx];
      return { ...prev, transactions: next };
    });
    const dbId = await upsertTransactionApi(tx);
    if (dbId !== tempId) {
      setDb(prev => ({
        ...prev,
        transactions: prev.transactions.map(t => (t.id === tempId ? { ...t, id: dbId } : t)),
      }));
    }
  }, []);

  const removeTransaction = useCallback(async (id: string) => {
    setDb(prev => ({ ...prev, transactions: prev.transactions.filter(t => t.id !== id) }));
    await deleteTransactionApi(id);
  }, []);

  // --- Cash Withdrawal ---

  const saveCashWithdrawal = useCallback(async (cw: CashWithdrawal) => {
    const tempId = cw.id;
    setDb(prev => {
      const exists = prev.cashWithdrawals.find(w => w.id === tempId);
      const next = exists
        ? prev.cashWithdrawals.map(w => (w.id === tempId ? cw : w))
        : [...prev.cashWithdrawals, cw];
      return { ...prev, cashWithdrawals: next };
    });
    const dbId = await upsertCashWithdrawalApi(cw);
    if (dbId !== tempId) {
      setDb(prev => ({
        ...prev,
        cashWithdrawals: prev.cashWithdrawals.map(w => (w.id === tempId ? { ...w, id: dbId } : w)),
      }));
    }
  }, []);

  // --- Purchase ---

  const savePurchase = useCallback(
    async (
      purchase: Purchase,
      updatedItems: InventoryItem[],
      updatedWithdrawals?: CashWithdrawal[]
    ) => {
      const tempId = purchase.id;
      setDb(prev => {
        const exists = prev.purchases.find(p => p.id === tempId);
        const nextPurchases = exists
          ? prev.purchases.map(p => (p.id === tempId ? purchase : p))
          : [...prev.purchases, purchase];

        const nextItems = [...prev.items];
        updatedItems.forEach(ui => {
          const idx = nextItems.findIndex(it => it.id === ui.id);
          if (idx >= 0) nextItems[idx] = ui;
          else nextItems.push(ui);
        });

        const nextWithdrawals = updatedWithdrawals ?? prev.cashWithdrawals;

        return {
          ...prev,
          purchases: nextPurchases,
          items: nextItems,
          cashWithdrawals: nextWithdrawals,
        };
      });
      const dbId = await upsertPurchaseWithRelations(purchase, updatedItems, updatedWithdrawals);
      if (dbId !== tempId) {
        setDb(prev => ({
          ...prev,
          purchases: prev.purchases.map(p => (p.id === tempId ? { ...p, id: dbId } : p)),
        }));
      }
    },
    []
  );

  const removePurchase = useCallback(async (id: string, restoredItems: InventoryItem[]) => {
    setDb(prev => {
      let nextItems = [...prev.items];
      restoredItems.forEach(ri => {
        nextItems = nextItems.map(it => (it.id === ri.id ? ri : it));
      });
      return { ...prev, purchases: prev.purchases.filter(p => p.id !== id), items: nextItems };
    });
    await deletePurchaseApi(id);
    await Promise.all(restoredItems.map(item => upsertProduct(item)));
  }, []);

  // --- Sale ---

  const saveSale = useCallback(async (sale: Sale, updatedItems: InventoryItem[]) => {
    const tempId = sale.id;
    setDb(prev => {
      const exists = prev.sales.find(s => s.id === tempId);
      const nextSales = exists
        ? prev.sales.map(s => (s.id === tempId ? sale : s))
        : [...prev.sales, sale];

      let nextItems = [...prev.items];
      updatedItems.forEach(ui => {
        nextItems = nextItems.map(it => (it.id === ui.id ? ui : it));
      });

      return { ...prev, sales: nextSales, items: nextItems };
    });
    const dbId = await upsertSaleWithRelations(sale, updatedItems);
    if (dbId !== tempId) {
      setDb(prev => ({
        ...prev,
        sales: prev.sales.map(s => (s.id === tempId ? { ...s, id: dbId } : s)),
      }));
    }
  }, []);

  const removeSale = useCallback(async (id: string, restoredItems: InventoryItem[]) => {
    setDb(prev => {
      let nextItems = [...prev.items];
      restoredItems.forEach(ri => {
        nextItems = nextItems.map(it => (it.id === ri.id ? ri : it));
      });
      return { ...prev, sales: prev.sales.filter(s => s.id !== id), items: nextItems };
    });
    await deleteSaleApi(id);
    await Promise.all(restoredItems.map(item => upsertProduct(item)));
  }, []);

  return {
    db,
    persist,
    refreshData,
    loading,
    // Product
    saveProduct,
    // Branch
    saveBranch,
    saveMoveToBranch,
    removeBranch,
    // Settings
    saveSettings,
    // Transaction
    saveTransaction,
    removeTransaction,
    // CashWithdrawal
    saveCashWithdrawal,
    // Purchase
    savePurchase,
    removePurchase,
    // Sale
    saveSale,
    removeSale,
  };
}
