import { DB, DEFAULT_SETTINGS } from '../types/models';
import { processBackupFile } from './dataConverter';

const STORAGE_KEY = 'nim-db-v1';

export function loadDB(): DB {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const empty: DB = {
      items: [],
      purchases: [],
      sales: [],
      settings: { ...DEFAULT_SETTINGS },
      cashWithdrawals: [],
      transactions: [],
      branches: [],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(empty));
    return empty;
  }
  try {
    const parsed: any = JSON.parse(raw);
    if (!parsed.settings) parsed.settings = { ...DEFAULT_SETTINGS };

    // Backward compatibility: migrate revenueWithdrawals to cashWithdrawals
    if (parsed.revenueWithdrawals && !parsed.cashWithdrawals) {
      parsed.cashWithdrawals = parsed.revenueWithdrawals;
      delete parsed.revenueWithdrawals;
    }
    if (!parsed.cashWithdrawals) parsed.cashWithdrawals = [];

    // Backward compatibility: migrate revenueUsed to cashUsed in purchases
    if (parsed.purchases) {
      parsed.purchases = parsed.purchases.map((p: any) => {
        if (p.revenueUsed !== undefined && p.cashUsed === undefined) {
          return { ...p, cashUsed: p.revenueUsed, revenueUsed: undefined };
        }
        return p;
      });
    }

    // Backward compatibility: migrate revenueAmount to cashAmount in transactions
    if (parsed.transactions) {
      parsed.transactions = parsed.transactions.map((t: any) => {
        if (t.revenueAmount !== undefined && t.cashAmount === undefined) {
          return { ...t, cashAmount: t.revenueAmount, revenueAmount: undefined };
        }
        return t;
      });
    }

    if (!parsed.transactions) parsed.transactions = [];
    if (!parsed.branches) parsed.branches = [];
    // Ensure backward compatibility: add branchId to items if missing
    if (parsed.items) {
      parsed.items = parsed.items.map((item: any) => ({
        ...item,
        branchId: item.branchId ?? undefined,
      }));
    }
    // Ensure backward compatibility: add branchId to sales if missing
    if (parsed.sales) {
      parsed.sales = parsed.sales.map((sale: any) => ({
        ...sale,
        branchId: sale.branchId ?? undefined,
      }));
    }
    return parsed;
  } catch {
    const empty: DB = {
      items: [],
      purchases: [],
      sales: [],
      settings: { ...DEFAULT_SETTINGS },
      cashWithdrawals: [],
      transactions: [],
      branches: [],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(empty));
    return empty;
  }
}

export function saveDB(db: DB) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export function exportBackup(): string {
  return localStorage.getItem(STORAGE_KEY) ?? '';
}

export function importBackup(json: string) {
  try {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid backup file format');
    }

    let dbData: DB;

    // Check if it's the new format (has settings and proper structure)
    if ('settings' in parsed && 'items' in parsed && 'purchases' in parsed && 'sales' in parsed) {
      // New format - validate and use directly
      if (!parsed.settings) parsed.settings = { ...DEFAULT_SETTINGS };

      // Backward compatibility: migrate revenueWithdrawals to cashWithdrawals
      if (parsed.revenueWithdrawals && !parsed.cashWithdrawals) {
        parsed.cashWithdrawals = parsed.revenueWithdrawals;
        delete parsed.revenueWithdrawals;
      }
      if (!parsed.cashWithdrawals) parsed.cashWithdrawals = [];

      // Backward compatibility: migrate revenueUsed to cashUsed in purchases
      if (parsed.purchases) {
        parsed.purchases = parsed.purchases.map((p: any) => {
          if (p.revenueUsed !== undefined && p.cashUsed === undefined) {
            return { ...p, cashUsed: p.revenueUsed, revenueUsed: undefined };
          }
          return p;
        });
      }

      // Backward compatibility: migrate revenueAmount to cashAmount in transactions
      if (parsed.transactions) {
        parsed.transactions = parsed.transactions.map((t: any) => {
          if (t.revenueAmount !== undefined && t.cashAmount === undefined) {
            return { ...t, cashAmount: t.revenueAmount, revenueAmount: undefined };
          }
          return t;
        });
      }

      if (!parsed.transactions) parsed.transactions = [];
      if (!parsed.branches) parsed.branches = [];
      dbData = parsed as DB;
    } else if ('items' in parsed) {
      // Old format - convert it
      dbData = processBackupFile(json);
    } else {
      throw new Error('Invalid backup file - missing required items field');
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(dbData));
  } catch (error) {
    throw new Error(`Failed to import backup: ${error}`);
  }
}

export function clearAll() {
  localStorage.removeItem(STORAGE_KEY);
}
