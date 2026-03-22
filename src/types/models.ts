export type Category = 'Hair Care' | 'Body Care' | 'Makeup' | 'Fragrance' | 'Skin Care' | 'Other';

export type PaymentMethod = 'cash' | 'transfer' | 'installments' | 'payment_link' | 'credit_card';

export type PaymentSource = 'external' | 'revenue' | 'mixed';

export type SalesChannel =
  | 'facebook_marketplace'
  | 'instagram'
  | 'tiktok'
  | 'family_friends'
  | 'loyal_customer'
  | 'referred_to_store'
  | 'store_customer'
  | 'other';

export interface ItemImage {
  id: string;
  name: string; // Original filename
  dataUrl: string; // Base64 encoded image data
  thumbnailUrl?: string; // Base64 encoded thumbnail (smaller for grid views)
  size: number; // File size in bytes
  type: string; // MIME type (image/jpeg, image/png)
  uploadedAt: string; // ISO timestamp
  isPrimary?: boolean; // Primary image flag
}

export interface Brand {
  id: string;
  name: string;
  displayName?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  brandId?: string;
  brandName?: string; // Denormalised for display without an extra join
  color?: string;
  description?: string;
  category: Category;
  stock: number;
  // Physical properties
  weightLbs?: number; // Weight per unit in pounds
  // Image support
  images: ItemImage[]; // Array of product images
  primaryImageId?: string; // Main display image
  // Costs are per unit
  costPreShipping?: number; // base unit cost, before any tax/shipping allocations
  costPostShipping?: number; // cost after all allocations
  // Pricing
  minPrice?: number;
  maxPrice?: number;
  catalogPrice?: number; // Catalog/list price
  minProfit?: number;
  maxProfit?: number;
  isActive?: boolean; // Whether the product is active (visible in catalog)
  createdAt: string; // ISO
  updatedAt?: string; // ISO
  branchId?: string; // Branch/store ID - undefined for main inventory
  /** The location_inventory PK for this product/location row. Present for items loaded from DB. */
  locationInventoryId?: string;
}

export interface PurchaseLine {
  id: string;
  itemId: string;
  quantity: number; // number of units
  unitCost: number; // base cost per unit (pre-shipping/tax)
  // Derived per-unit allocations (post-save)
  perUnitTax?: number;
  perUnitShippingUS?: number;
  perUnitShippingIntl?: number;
  unitCostPostShipping?: number; // unitCost + allocations
}

export interface Purchase {
  id: string;
  createdAt: string; // ISO
  orderedDate?: string; // ISO - when the order was placed
  paymentDate?: string; // ISO - when this purchase is/will be paid
  lines: PurchaseLine[];
  // Footer fields
  subtotal: number; // editable, default sum(qty*unitCost)
  discount?: number; // Total discount amount received on this purchase
  tax: number;
  shippingUS: number;
  shippingIntl: number; // default weight * weightCost
  weightLbs: number;
  // Derived
  totalUnits: number;
  totalCost: number; // subtotal + tax + shippingUS + shippingIntl (before discount)
  actualCost: number; // totalCost - discount (actual amount paid, used for analytics)
  // Cash reinvestment
  cashUsed?: number; // Amount of business cash used to pay for this purchase
  paymentSource?: PaymentSource; // How this purchase was paid for
}

export interface SaleLine {
  id: string;
  itemId: string;
  quantity: number;
  unitPrice: number; // price per sold unit
}

export interface InstallmentPlan {
  numberOfPayments: number;
  amountPerPayment: number;
}

export interface Sale {
  id: string;
  createdAt: string; // ISO
  buyerName?: string; // Name of the buyer
  paymentMethod: PaymentMethod;
  channel?: SalesChannel; // Sales channel where the sale originated
  installments?: InstallmentPlan;
  lines: SaleLine[];
  totalAmount: number;
  branchId?: string; // Branch/store where sale occurred - undefined for main inventory
  thirdPartyDelivery?: boolean; // Whether this sale required third-party delivery service
}

export interface Branch {
  id: string;
  name: string;
  createdAt: string; // ISO timestamp
  closedAt?: string; // ISO timestamp - set when branch is closed
}

export interface Settings {
  weightCostPerLb: number; // default 7.00, editable in code or via settings
  taxRatePercent: number; // default 8.775%, editable in code or via settings
  encryptionEnabled?: boolean; // placeholder for future
}

export interface DB {
  items: InventoryItem[];
  purchases: Purchase[];
  sales: Sale[];
  settings: Settings;
  cashWithdrawals: CashWithdrawal[]; // Track cash withdrawals for reinvestment
  transactions: Transaction[]; // Track business expenses and fees
  branches: Branch[]; // Branch/store locations
  brands: Brand[]; // Product brands for dropdown selection
}

export interface CashWithdrawal {
  id: string;
  amount: number;
  reason: string;
  withdrawnAt: string; // ISO timestamp
  linkedPurchaseId?: string; // Optional link to the purchase this funded
  notes?: string;
}

// Legacy type alias for backward compatibility during migration
export type RevenueWithdrawal = CashWithdrawal;

export type TransactionType = 'expense' | 'fee' | 'income' | 'discount';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  category: string; // e.g., 'Packaging', 'Marketing', 'Fees', 'Equipment'
  notes?: string;
  createdAt: string; // ISO timestamp
  paymentMethod?: PaymentMethod;
  paymentSource?: PaymentSource;
  // Mixed source breakdown (only when paymentSource === 'mixed')
  cashAmount?: number; // Amount paid from business cash
  externalAmount?: number; // Amount paid from external funds
}

export const DEFAULT_SETTINGS: Settings = {
  weightCostPerLb: 7.0,
  taxRatePercent: 8.775,
};
