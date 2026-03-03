import {
  InventoryItem,
  Category,
  ItemImage,
  Branch,
  Settings,
  CashWithdrawal,
  Transaction,
  TransactionType,
  Purchase,
  PurchaseLine,
  Sale,
  SaleLine,
  PaymentMethod,
  PaymentSource,
  SalesChannel,
  InstallmentPlan,
} from '../../types/models';

// ---------------------------------------------------------------------------
// Image helpers
// ---------------------------------------------------------------------------

type SupabaseImage = { url?: string; isPrimary?: boolean; isTrue?: boolean };

function normalizeSupabaseImages(images: unknown): ItemImage[] {
  if (!Array.isArray(images) || images.length === 0) return [];
  return images
    .filter(
      (img): img is SupabaseImage =>
        img && typeof img === 'object' && typeof (img as SupabaseImage).url === 'string'
    )
    .map(img => {
      const url = img.url!;
      const isPrimary = img.isPrimary ?? img.isTrue ?? false;
      return {
        id: url,
        name: '',
        dataUrl: url,
        size: 0,
        type: 'image/webp',
        uploadedAt: new Date().toISOString(),
        isPrimary,
      } satisfies ItemImage;
    });
}

// ---------------------------------------------------------------------------
// Product / Location Inventory
// ---------------------------------------------------------------------------

export interface ProductRow {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  notes: string | null;
  category: Category;
  weight_lbs: number | null;
  cost_pre_shipping: number | null;
  cost_post_shipping: number | null;
  min_price: number | null;
  max_price: number | null;
  competitor_a_price: number | null;
  competitor_b_price: number | null;
  min_revenue: number | null;
  max_revenue: number | null;
  images: unknown;
  primary_image_url: string | null;
  brand_id: string | null;
  catalog_price: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocationInventoryRow {
  id: string;
  product_id: string;
  branch_id: string | null;
  stock: number;
  location_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LocationWithProduct extends LocationInventoryRow {
  products: ProductRow;
}

export function toInventoryItem(row: LocationWithProduct): InventoryItem {
  const p = row.products;
  const images = normalizeSupabaseImages(p.images);
  const primaryUrl = p.primary_image_url ?? undefined;
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? undefined,
    notes: p.notes ?? undefined,
    category: p.category,
    stock: row.stock,
    weightLbs: p.weight_lbs ?? undefined,
    images,
    primaryImageId: primaryUrl || (images.find(img => img.isPrimary)?.id ?? images[0]?.id),
    costPreShipping: p.cost_pre_shipping ?? undefined,
    costPostShipping: p.cost_post_shipping ?? undefined,
    minPrice: p.min_price ?? undefined,
    maxPrice: p.max_price ?? undefined,
    catalogPrice: p.catalog_price ?? undefined,
    competitorAPrice: p.competitor_a_price ?? undefined,
    competitorBPrice: p.competitor_b_price ?? undefined,
    minProfit: p.min_revenue ?? undefined,
    maxProfit: p.max_revenue ?? undefined,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    branchId: row.branch_id ?? undefined,
  };
}

export function toSupabaseProduct(item: InventoryItem) {
  const primaryId = item.primaryImageId;
  const sorted = [...item.images].sort((a, b) => {
    const aIsPrimary = a.id === primaryId ? 1 : 0;
    const bIsPrimary = b.id === primaryId ? 1 : 0;
    return bIsPrimary - aIsPrimary;
  });

  const serializedImages =
    sorted.length > 0 ? sorted.map((img, i) => ({ url: img.dataUrl, isPrimary: i === 0 })) : null;

  const primaryUrl = sorted.length > 0 ? sorted[0].dataUrl : null;

  const product: Omit<ProductRow, 'sku' | 'brand_id' | 'is_active'> = {
    id: item.id,
    name: item.name,
    description: item.description ?? null,
    notes: item.notes ?? null,
    category: item.category,
    weight_lbs: item.weightLbs ?? null,
    cost_pre_shipping: item.costPreShipping ?? null,
    cost_post_shipping: item.costPostShipping ?? null,
    min_price: item.minPrice ?? null,
    max_price: item.maxPrice ?? null,
    catalog_price: item.catalogPrice ?? null,
    competitor_a_price: item.competitorAPrice ?? null,
    competitor_b_price: item.competitorBPrice ?? null,
    min_revenue: item.minProfit ?? null,
    max_revenue: item.maxProfit ?? null,
    images: serializedImages,
    primary_image_url: primaryUrl,
    created_at: item.createdAt,
    updated_at: item.updatedAt ?? new Date().toISOString(),
  };

  const locationInventory = {
    product_id: item.id,
    branch_id: item.branchId ?? null,
    stock: item.stock,
  };

  return { product, locationInventory };
}

// ---------------------------------------------------------------------------
// Branch
// ---------------------------------------------------------------------------

export interface BranchRow {
  id: string;
  name: string;
  created_at: string;
  closed_at: string | null;
}

export function toBranch(row: BranchRow): Branch {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    closedAt: row.closed_at ?? undefined,
  };
}

export function toSupabaseBranch(branch: Branch): BranchRow {
  return {
    id: branch.id,
    name: branch.name,
    created_at: branch.createdAt,
    closed_at: branch.closedAt ?? null,
  };
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export interface SettingsRow {
  id: string;
  weight_cost_per_lb: number;
  tax_rate_percent: number;
  encryption_enabled: boolean | null;
  updated_at: string;
}

export function toSettings(row: SettingsRow): Settings {
  return {
    weightCostPerLb: Number(row.weight_cost_per_lb),
    taxRatePercent: Number(row.tax_rate_percent),
    encryptionEnabled: row.encryption_enabled ?? undefined,
  };
}

export function toSupabaseSettings(settings: Settings): Omit<SettingsRow, 'id'> {
  return {
    weight_cost_per_lb: settings.weightCostPerLb,
    tax_rate_percent: settings.taxRatePercent,
    encryption_enabled: settings.encryptionEnabled ?? null,
    updated_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Transaction
// ---------------------------------------------------------------------------

export interface TransactionRow {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  category: string;
  notes: string | null;
  created_at: string;
  payment_method: PaymentMethod | null;
  payment_source: PaymentSource | null;
  cash_amount: number | null;
  external_amount: number | null;
}

export function toTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    description: row.description,
    category: row.category,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    paymentMethod: row.payment_method ?? undefined,
    paymentSource: row.payment_source ?? undefined,
    cashAmount: row.cash_amount !== null ? Number(row.cash_amount) : undefined,
    externalAmount: row.external_amount !== null ? Number(row.external_amount) : undefined,
  };
}

export function toSupabaseTransaction(tx: Transaction): TransactionRow {
  return {
    id: tx.id,
    type: tx.type,
    amount: tx.amount,
    description: tx.description,
    category: tx.category,
    notes: tx.notes ?? null,
    created_at: tx.createdAt,
    payment_method: tx.paymentMethod ?? null,
    payment_source: tx.paymentSource ?? null,
    cash_amount: tx.cashAmount ?? null,
    external_amount: tx.externalAmount ?? null,
  };
}

// ---------------------------------------------------------------------------
// CashWithdrawal
// ---------------------------------------------------------------------------

export interface CashWithdrawalRow {
  id: string;
  amount: number;
  reason: string;
  withdrawn_at: string;
  notes: string | null;
  linked_purchase_id: string | null;
}

export function toCashWithdrawal(row: CashWithdrawalRow): CashWithdrawal {
  return {
    id: row.id,
    amount: Number(row.amount),
    reason: row.reason,
    withdrawnAt: row.withdrawn_at,
    notes: row.notes ?? undefined,
    linkedPurchaseId: row.linked_purchase_id ?? undefined,
  };
}

export function toSupabaseCashWithdrawal(cw: CashWithdrawal): CashWithdrawalRow {
  return {
    id: cw.id,
    amount: cw.amount,
    reason: cw.reason,
    withdrawn_at: cw.withdrawnAt,
    notes: cw.notes ?? null,
    linked_purchase_id: cw.linkedPurchaseId ?? null,
  };
}

// ---------------------------------------------------------------------------
// Purchase + PurchaseLine
// ---------------------------------------------------------------------------

export interface PurchaseRow {
  id: string;
  created_at: string;
  ordered_date: string | null;
  payment_date: string | null;
  subtotal: number;
  discount: number | null;
  tax: number;
  shipping_us: number;
  shipping_intl: number;
  weight_lbs: number;
  total_units: number;
  total_cost: number;
  actual_cost: number;
  cash_used: number | null;
  payment_source: PaymentSource | null;
  destination_branch_id: string | null;
}

export interface PurchaseLineRow {
  id: string;
  purchase_id: string;
  product_id: string;
  quantity: number;
  unit_cost: number;
  has_sub_items: boolean;
  sub_items_qty: number | null;
  per_unit_tax: number | null;
  per_unit_shipping_us: number | null;
  per_unit_shipping_intl: number | null;
  unit_cost_post_shipping: number | null;
}

/** Joined row from querying purchases with embedded purchase_lines */
export interface PurchaseWithLines extends PurchaseRow {
  purchase_lines: PurchaseLineRow[];
}

function toPurchaseLine(row: PurchaseLineRow): PurchaseLine {
  return {
    id: row.id,
    itemId: row.product_id,
    quantity: Number(row.quantity),
    unitCost: Number(row.unit_cost),
    hasSubItems: row.has_sub_items,
    subItemsQty: row.sub_items_qty !== null ? Number(row.sub_items_qty) : undefined,
    perUnitTax: row.per_unit_tax !== null ? Number(row.per_unit_tax) : undefined,
    perUnitShippingUS:
      row.per_unit_shipping_us !== null ? Number(row.per_unit_shipping_us) : undefined,
    perUnitShippingIntl:
      row.per_unit_shipping_intl !== null ? Number(row.per_unit_shipping_intl) : undefined,
    unitCostPostShipping:
      row.unit_cost_post_shipping !== null ? Number(row.unit_cost_post_shipping) : undefined,
  };
}

export function toPurchase(row: PurchaseWithLines): Purchase {
  return {
    id: row.id,
    createdAt: row.created_at,
    orderedDate: row.ordered_date ?? undefined,
    paymentDate: row.payment_date ?? undefined,
    lines: (row.purchase_lines || []).map(toPurchaseLine),
    subtotal: Number(row.subtotal),
    discount: row.discount !== null ? Number(row.discount) : undefined,
    tax: Number(row.tax),
    shippingUS: Number(row.shipping_us),
    shippingIntl: Number(row.shipping_intl),
    weightLbs: Number(row.weight_lbs),
    totalUnits: Number(row.total_units),
    totalCost: Number(row.total_cost),
    actualCost: Number(row.actual_cost),
    cashUsed: row.cash_used !== null ? Number(row.cash_used) : undefined,
    paymentSource: row.payment_source ?? undefined,
  };
}

export function toSupabasePurchase(purchase: Purchase) {
  const row: PurchaseRow = {
    id: purchase.id,
    created_at: purchase.createdAt,
    ordered_date: purchase.orderedDate ?? null,
    payment_date: purchase.paymentDate ?? null,
    subtotal: purchase.subtotal,
    discount: purchase.discount ?? null,
    tax: purchase.tax,
    shipping_us: purchase.shippingUS,
    shipping_intl: purchase.shippingIntl,
    weight_lbs: purchase.weightLbs,
    total_units: purchase.totalUnits,
    total_cost: purchase.totalCost,
    actual_cost: purchase.actualCost ?? purchase.totalCost - (purchase.discount ?? 0),
    cash_used: purchase.cashUsed ?? null,
    payment_source: purchase.paymentSource ?? null,
    destination_branch_id: null,
  };

  const lineRows: Omit<PurchaseLineRow, 'purchase_id'>[] = purchase.lines.map(l => ({
    id: l.id,
    product_id: l.itemId,
    quantity: l.quantity,
    unit_cost: l.unitCost,
    has_sub_items: l.hasSubItems,
    sub_items_qty: l.subItemsQty ?? null,
    per_unit_tax: l.perUnitTax ?? null,
    per_unit_shipping_us: l.perUnitShippingUS ?? null,
    per_unit_shipping_intl: l.perUnitShippingIntl ?? null,
    unit_cost_post_shipping: l.unitCostPostShipping ?? null,
  }));

  return { row, lineRows };
}

// ---------------------------------------------------------------------------
// Sale + SaleLine
// ---------------------------------------------------------------------------

export interface SaleRow {
  id: string;
  created_at: string;
  buyer_name: string | null;
  payment_method: PaymentMethod;
  channel: SalesChannel | null;
  installments: InstallmentPlan | null;
  total_amount: number;
  third_party_delivery: boolean | null;
  branch_id: string | null;
}

export interface SaleLineRow {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
}

export interface SaleWithLines extends SaleRow {
  sale_lines: SaleLineRow[];
}

function toSaleLine(row: SaleLineRow): SaleLine {
  return {
    id: row.id,
    itemId: row.product_id,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
  };
}

export function toSale(row: SaleWithLines): Sale {
  return {
    id: row.id,
    createdAt: row.created_at,
    buyerName: row.buyer_name ?? undefined,
    paymentMethod: row.payment_method,
    channel: row.channel ?? undefined,
    installments: row.installments ?? undefined,
    lines: (row.sale_lines || []).map(toSaleLine),
    totalAmount: Number(row.total_amount),
    branchId: row.branch_id ?? undefined,
    thirdPartyDelivery: row.third_party_delivery ?? undefined,
  };
}

export function toSupabaseSale(sale: Sale) {
  const row: SaleRow = {
    id: sale.id,
    created_at: sale.createdAt,
    buyer_name: sale.buyerName ?? null,
    payment_method: sale.paymentMethod,
    channel: sale.channel ?? null,
    installments: sale.installments ?? null,
    total_amount: sale.totalAmount,
    third_party_delivery: sale.thirdPartyDelivery ?? null,
    branch_id: sale.branchId ?? null,
  };

  const lineRows: Omit<SaleLineRow, 'sale_id'>[] = sale.lines.map(l => ({
    id: l.id,
    product_id: l.itemId,
    quantity: l.quantity,
    unit_price: l.unitPrice,
  }));

  return { row, lineRows };
}
