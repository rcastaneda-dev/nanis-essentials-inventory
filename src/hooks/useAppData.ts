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
    ])
      .then(([items, branches, settings, purchases, sales, transactions, cashWithdrawals]) => {
        setDb({ items, branches, settings, purchases, sales, transactions, cashWithdrawals });
      })
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
    ])
      .then(([items, branches, settings, purchases, sales, transactions, cashWithdrawals]) => {
        setDb({ items, branches, settings, purchases, sales, transactions, cashWithdrawals });
      })
      .catch(err => {
        // eslint-disable-next-line no-console
        console.error('Failed to refresh data from Supabase:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  // --- Product ---

  const saveProduct = useCallback(async (item: InventoryItem) => {
    setDb(prev => {
      const exists = prev.items.find(i => i.id === item.id);
      const nextItems = exists
        ? prev.items.map(i => (i.id === item.id ? item : i))
        : [...prev.items, item];
      return { ...prev, items: nextItems };
    });
    await upsertProduct(item);
  }, []);

  // --- Branch ---

  const saveBranch = useCallback(async (branch: Branch) => {
    setDb(prev => {
      const exists = prev.branches.find(b => b.id === branch.id);
      const nextBranches = exists
        ? prev.branches.map(b => (b.id === branch.id ? branch : b))
        : [...prev.branches, branch];
      return { ...prev, branches: nextBranches };
    });
    await upsertBranchApi(branch);
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
    setDb(prev => {
      const exists = prev.transactions.find(t => t.id === tx.id);
      const next = exists
        ? prev.transactions.map(t => (t.id === tx.id ? tx : t))
        : [...prev.transactions, tx];
      return { ...prev, transactions: next };
    });
    await upsertTransactionApi(tx);
  }, []);

  const removeTransaction = useCallback(async (id: string) => {
    setDb(prev => ({ ...prev, transactions: prev.transactions.filter(t => t.id !== id) }));
    await deleteTransactionApi(id);
  }, []);

  // --- Cash Withdrawal ---

  const saveCashWithdrawal = useCallback(async (cw: CashWithdrawal) => {
    setDb(prev => {
      const exists = prev.cashWithdrawals.find(w => w.id === cw.id);
      const next = exists
        ? prev.cashWithdrawals.map(w => (w.id === cw.id ? cw : w))
        : [...prev.cashWithdrawals, cw];
      return { ...prev, cashWithdrawals: next };
    });
    await upsertCashWithdrawalApi(cw);
  }, []);

  // --- Purchase ---

  const savePurchase = useCallback(
    async (
      purchase: Purchase,
      updatedItems: InventoryItem[],
      updatedWithdrawals?: CashWithdrawal[]
    ) => {
      setDb(prev => {
        const exists = prev.purchases.find(p => p.id === purchase.id);
        const nextPurchases = exists
          ? prev.purchases.map(p => (p.id === purchase.id ? purchase : p))
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
      await upsertPurchaseWithRelations(purchase, updatedItems, updatedWithdrawals);
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
    setDb(prev => {
      const exists = prev.sales.find(s => s.id === sale.id);
      const nextSales = exists
        ? prev.sales.map(s => (s.id === sale.id ? sale : s))
        : [...prev.sales, sale];

      let nextItems = [...prev.items];
      updatedItems.forEach(ui => {
        nextItems = nextItems.map(it => (it.id === ui.id ? ui : it));
      });

      return { ...prev, sales: nextSales, items: nextItems };
    });
    await upsertSaleWithRelations(sale, updatedItems);
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
