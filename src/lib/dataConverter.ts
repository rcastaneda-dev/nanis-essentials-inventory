import { InventoryItem, Category, Purchase, Sale, DB, DEFAULT_SETTINGS } from '../types/models';
import { uid, nowIso } from './utils';

interface OldItem {
  id: string;
  name: string;
  description: string;
  category: string;
  count: number;
  totalCost: number;
  minPrice: number;
  maxPrice: number;
  competitorAPrice?: number;
  competitorBPrice?: number;
  minProfit: number;
  maxProfit: number;
  createdAt: string;
}

interface OldPurchaseItem {
  itemId: string;
  quantity: number;
  unitCost: number;
  hasSubItems: boolean;
  subItemsCount: number;
}

interface OldPurchase {
  id: string;
  items: OldPurchaseItem[];
  subtotal: number;
  tax: number;
  shippingUS: number;
  shippingInternational: number;
  weight: number;
  weightCost: number;
  totalCost: number;
  date: string;
}

interface OldSaleItem {
  itemId: string;
  quantity: number;
  unitPrice: number;
}

interface OldSale {
  id: string;
  items: OldSaleItem[];
  paymentMethod: string;
  totalAmount: number;
  date: string;
}

interface OldBackup {
  items: OldItem[];
  purchases: OldPurchase[];
  sales: OldSale[];
  exported?: string;
  encrypted?: boolean;
}

const _VALID_CATEGORIES: Category[] = [
  'Hair Care',
  'Body Care',
  'Makeup',
  'Fragrance',
  'Skin Care',
  'Other',
];

function mapCategory(oldCategory: string): Category {
  // Try to match the old category to a valid one
  const normalized = oldCategory.toLowerCase();

  if (normalized.includes('body') || normalized.includes('care')) return 'Body Care';
  if (normalized.includes('hair')) return 'Hair Care';
  if (normalized.includes('makeup') || normalized.includes('cosmetic')) return 'Makeup';
  if (normalized.includes('fragrance') || normalized.includes('perfume')) return 'Fragrance';
  if (normalized.includes('skin')) return 'Skin Care';

  return 'Other';
}

export function convertOldBackupToNew(oldData: OldBackup): DB {
  // Convert items
  const items: InventoryItem[] = oldData.items.map(oldItem => {
    const costPerUnit = oldItem.count > 0 ? oldItem.totalCost / oldItem.count : 0;

    return {
      id: oldItem.id,
      name: oldItem.name,
      description: oldItem.description || undefined,
      category: mapCategory(oldItem.category),
      stock: oldItem.count,
      images: [], // No images in old format
      primaryImageId: undefined,
      costPreShipping: costPerUnit,
      costPostShipping: costPerUnit, // Assume same for old data
      minPrice: oldItem.minPrice || costPerUnit + 5,
      maxPrice: oldItem.maxPrice || costPerUnit + 10,
      competitorAPrice: oldItem.competitorAPrice,
      competitorBPrice: oldItem.competitorBPrice,
      minProfit: oldItem.minProfit || 0,
      maxProfit: oldItem.maxProfit || 0,
      createdAt: oldItem.createdAt,
      updatedAt: nowIso(),
    };
  });

  // Convert purchases
  const purchases: Purchase[] = oldData.purchases.map(oldPurchase => {
    const lines = oldPurchase.items
      .filter(item => item.itemId) // Only include items with valid IDs
      .map(item => ({
        id: uid(),
        itemId: item.itemId,
        quantity: item.quantity,
        unitCost: item.unitCost,
        hasSubItems: item.hasSubItems,
        subItemsQty: item.hasSubItems ? item.subItemsCount : undefined,
        // Calculate allocations (simplified)
        perUnitTax: 0,
        perUnitShippingUS: 0,
        perUnitShippingIntl: 0,
        unitCostPostShipping: item.unitCost,
      }));

    const totalUnits = lines.reduce(
      (acc, l) => acc + l.quantity + (l.hasSubItems ? (l.subItemsQty ?? 0) : 0),
      0
    );

    return {
      id: oldPurchase.id,
      createdAt: oldPurchase.date,
      orderedDate: oldPurchase.date, // Use same date for both ordered and payment
      paymentDate: oldPurchase.date,
      lines,
      subtotal: oldPurchase.subtotal,
      tax: oldPurchase.tax,
      shippingUS: oldPurchase.shippingUS || 0,
      shippingIntl: oldPurchase.shippingInternational || 0,
      weightLbs: oldPurchase.weight || 0,
      totalUnits,
      totalCost: oldPurchase.totalCost,
    };
  });

  // Convert sales
  const sales: Sale[] = oldData.sales.map(oldSale => {
    const lines = oldSale.items
      .filter(item => item.itemId) // Only include items with valid IDs
      .map(item => ({
        id: uid(),
        itemId: item.itemId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }));

    return {
      id: oldSale.id,
      createdAt: oldSale.date,
      buyerName: undefined, // Old format didn't have buyer names
      paymentMethod: (oldSale.paymentMethod as any) || 'cash',
      lines,
      totalAmount: oldSale.totalAmount,
    };
  });

  return {
    items,
    purchases,
    sales,
    settings: { ...DEFAULT_SETTINGS },
    revenueWithdrawals: [], // Legacy data has no revenue withdrawals
    transactions: [], // Legacy data has no transactions
    branches: [], // Legacy data has no branches
  };
}

export function processBackupFile(jsonContent: string): DB {
  try {
    const oldData: OldBackup = JSON.parse(jsonContent);
    return convertOldBackupToNew(oldData);
  } catch (error) {
    throw new Error(`Failed to parse backup file: ${error}`);
  }
}
