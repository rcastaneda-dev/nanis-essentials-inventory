import { supabase } from './client';

export interface MigrationProgress {
  entity: string;
  status: 'pending' | 'in_progress' | 'done' | 'error';
  count?: number;
  error?: string;
}

export interface MigrationResult {
  success: boolean;
  counts: Record<string, number>;
  errors: string[];
}

interface BackupData {
  items: any[];
  purchases: any[];
  sales: any[];
  settings: any;
  transactions: any[];
  branches: any[];
  cashWithdrawals: any[];
}

const MIGRATION_ENTITIES = [
  'branches',
  'products',
  'location_inventory',
  'purchases',
  'purchase_lines',
  'sales',
  'sale_lines',
  'transactions',
  'cash_withdrawals',
  'settings',
] as const;

/**
 * One-time migration: seed historical data from a backup JSON into Supabase.
 * Generates new UUIDs for every entity and remaps all FK references.
 */
export async function migrateBackupToSupabase(
  backupJson: string,
  onProgress?: (progress: MigrationProgress) => void
): Promise<MigrationResult> {
  const data: BackupData = JSON.parse(backupJson);
  const counts: Record<string, number> = {};
  const errors: string[] = [];

  const idMap: Record<string, string> = {};

  data.branches?.forEach(b => {
    idMap[b.id] = crypto.randomUUID();
  });
  data.items?.forEach(i => {
    idMap[i.id] = crypto.randomUUID();
  });
  data.purchases?.forEach(p => {
    idMap[p.id] = crypto.randomUUID();
    p.lines?.forEach((l: any) => {
      idMap[l.id] = crypto.randomUUID();
    });
  });
  data.sales?.forEach(s => {
    idMap[s.id] = crypto.randomUUID();
    s.lines?.forEach((l: any) => {
      idMap[l.id] = crypto.randomUUID();
    });
  });
  data.transactions?.forEach(t => {
    idMap[t.id] = crypto.randomUUID();
  });
  data.cashWithdrawals?.forEach(cw => {
    idMap[cw.id] = crypto.randomUUID();
  });

  const remap = (oldId: string | undefined): string | null => {
    if (!oldId) return null;
    return idMap[oldId] ?? null;
  };

  // Mark all entities as pending
  MIGRATION_ENTITIES.forEach(entity => {
    onProgress?.({ entity, status: 'pending' });
  });

  // 1. Branches
  onProgress?.({ entity: 'branches', status: 'in_progress' });
  try {
    const rows = (data.branches || []).map(b => ({
      id: idMap[b.id],
      name: b.name,
      created_at: b.createdAt,
      closed_at: b.closedAt ?? null,
    }));
    if (rows.length > 0) {
      const { error } = await supabase.from('branches').insert(rows);
      if (error) throw error;
    }
    counts.branches = rows.length;
    onProgress?.({ entity: 'branches', status: 'done', count: rows.length });
  } catch (e: any) {
    errors.push(`branches: ${e.message}`);
    onProgress?.({ entity: 'branches', status: 'error', error: e.message });
  }

  // 2. Products
  onProgress?.({ entity: 'products', status: 'in_progress' });
  try {
    const rows = (data.items || []).map(item => ({
      id: idMap[item.id],
      name: item.name,
      description: item.description ?? null,
      category: item.category ?? 'Other',
      weight_lbs: item.weightLbs ?? null,
      cost_pre_shipping: item.costPreShipping ?? null,
      cost_post_shipping: item.costPostShipping ?? null,
      min_price: item.minPrice ?? null,
      max_price: item.maxPrice ?? null,
      min_revenue: item.minRevenue ?? item.minProfit ?? null,
      max_revenue: item.maxRevenue ?? item.maxProfit ?? null,
      images: [],
      primary_image_url: null,
      created_at: item.createdAt,
      updated_at: item.updatedAt ?? item.createdAt,
    }));
    if (rows.length > 0) {
      const { error } = await supabase.from('products').insert(rows);
      if (error) throw error;
    }
    counts.products = rows.length;
    onProgress?.({ entity: 'products', status: 'done', count: rows.length });
  } catch (e: any) {
    errors.push(`products: ${e.message}`);
    onProgress?.({ entity: 'products', status: 'error', error: e.message });
  }

  // 3. Location Inventory
  onProgress?.({ entity: 'location_inventory', status: 'in_progress' });
  try {
    const rows = (data.items || []).map(item => ({
      id: crypto.randomUUID(),
      product_id: idMap[item.id],
      branch_id: remap(item.branchId),
      stock: item.stock ?? 0,
    }));
    if (rows.length > 0) {
      const { error } = await supabase.from('location_inventory').insert(rows);
      if (error) throw error;
    }
    counts.location_inventory = rows.length;
    onProgress?.({ entity: 'location_inventory', status: 'done', count: rows.length });
  } catch (e: any) {
    errors.push(`location_inventory: ${e.message}`);
    onProgress?.({ entity: 'location_inventory', status: 'error', error: e.message });
  }

  // 4. Purchases
  onProgress?.({ entity: 'purchases', status: 'in_progress' });
  try {
    const rows = (data.purchases || []).map(p => ({
      id: idMap[p.id],
      created_at: p.createdAt,
      ordered_date: p.orderedDate ?? null,
      payment_date: p.paymentDate ?? null,
      subtotal: p.subtotal ?? 0,
      discount: p.discount ?? 0,
      tax: p.tax ?? 0,
      shipping_us: p.shippingUS ?? 0,
      shipping_intl: p.shippingIntl ?? 0,
      weight_lbs: p.weightLbs ?? 0,
      total_units: p.totalUnits ?? 0,
      total_cost: p.totalCost ?? 0,
      actual_cost: p.actualCost ?? (p.totalCost ?? 0) - (p.discount ?? 0),
      cash_used: p.cashUsed ?? null,
      payment_source: p.paymentSource ?? null,
      destination_branch_id: null,
    }));
    if (rows.length > 0) {
      const { error } = await supabase.from('purchases').insert(rows);
      if (error) throw error;
    }
    counts.purchases = rows.length;
    onProgress?.({ entity: 'purchases', status: 'done', count: rows.length });
  } catch (e: any) {
    errors.push(`purchases: ${e.message}`);
    onProgress?.({ entity: 'purchases', status: 'error', error: e.message });
  }

  // 5. Purchase Lines
  onProgress?.({ entity: 'purchase_lines', status: 'in_progress' });
  try {
    const rows = (data.purchases || []).flatMap(p =>
      (p.lines || []).map((l: any) => ({
        id: idMap[l.id],
        purchase_id: idMap[p.id],
        product_id: remap(l.itemId),
        quantity: l.quantity,
        unit_cost: l.unitCost,
        per_unit_tax: l.perUnitTax ?? null,
        per_unit_shipping_us: l.perUnitShippingUS ?? null,
        per_unit_shipping_intl: l.perUnitShippingIntl ?? null,
        unit_cost_post_shipping: l.unitCostPostShipping ?? null,
      }))
    );
    if (rows.length > 0) {
      const { error } = await supabase.from('purchase_lines').insert(rows);
      if (error) throw error;
    }
    counts.purchase_lines = rows.length;
    onProgress?.({ entity: 'purchase_lines', status: 'done', count: rows.length });
  } catch (e: any) {
    errors.push(`purchase_lines: ${e.message}`);
    onProgress?.({ entity: 'purchase_lines', status: 'error', error: e.message });
  }

  // 6. Sales
  onProgress?.({ entity: 'sales', status: 'in_progress' });
  try {
    const rows = (data.sales || []).map(s => ({
      id: idMap[s.id],
      created_at: s.createdAt,
      buyer_name: s.buyerName ?? null,
      payment_method: s.paymentMethod,
      channel: s.channel ?? null,
      installments: s.installments ?? null,
      total_amount: s.totalAmount,
      third_party_delivery: s.thirdPartyDelivery ?? false,
      branch_id: remap(s.branchId),
    }));
    if (rows.length > 0) {
      const { error } = await supabase.from('sales').insert(rows);
      if (error) throw error;
    }
    counts.sales = rows.length;
    onProgress?.({ entity: 'sales', status: 'done', count: rows.length });
  } catch (e: any) {
    errors.push(`sales: ${e.message}`);
    onProgress?.({ entity: 'sales', status: 'error', error: e.message });
  }

  // 7. Sale Lines
  onProgress?.({ entity: 'sale_lines', status: 'in_progress' });
  try {
    const rows = (data.sales || []).flatMap(s =>
      (s.lines || []).map((l: any) => ({
        id: idMap[l.id],
        sale_id: idMap[s.id],
        product_id: remap(l.itemId),
        quantity: l.quantity,
        unit_price: l.unitPrice,
      }))
    );
    if (rows.length > 0) {
      const { error } = await supabase.from('sale_lines').insert(rows);
      if (error) throw error;
    }
    counts.sale_lines = rows.length;
    onProgress?.({ entity: 'sale_lines', status: 'done', count: rows.length });
  } catch (e: any) {
    errors.push(`sale_lines: ${e.message}`);
    onProgress?.({ entity: 'sale_lines', status: 'error', error: e.message });
  }

  // 8. Transactions
  onProgress?.({ entity: 'transactions', status: 'in_progress' });
  try {
    const rows = (data.transactions || []).map(t => ({
      id: idMap[t.id],
      type: t.type,
      amount: t.amount,
      description: t.description,
      category: t.category,
      notes: t.notes ?? null,
      created_at: t.createdAt,
      payment_method: t.paymentMethod ?? null,
      payment_source: t.paymentSource ?? null,
      cash_amount: t.cashAmount ?? null,
      external_amount: t.externalAmount ?? null,
    }));
    if (rows.length > 0) {
      const { error } = await supabase.from('transactions').insert(rows);
      if (error) throw error;
    }
    counts.transactions = rows.length;
    onProgress?.({ entity: 'transactions', status: 'done', count: rows.length });
  } catch (e: any) {
    errors.push(`transactions: ${e.message}`);
    onProgress?.({ entity: 'transactions', status: 'error', error: e.message });
  }

  // 9. Cash Withdrawals (broken linkedPurchaseId refs resolve to null via remap)
  onProgress?.({ entity: 'cash_withdrawals', status: 'in_progress' });
  try {
    const rows = (data.cashWithdrawals || []).map(cw => ({
      id: idMap[cw.id],
      amount: cw.amount,
      reason: cw.reason,
      withdrawn_at: cw.withdrawnAt,
      notes: cw.notes ?? null,
      linked_purchase_id: remap(cw.linkedPurchaseId),
    }));
    if (rows.length > 0) {
      const { error } = await supabase.from('cash_withdrawals').insert(rows);
      if (error) throw error;
    }
    counts.cash_withdrawals = rows.length;
    onProgress?.({ entity: 'cash_withdrawals', status: 'done', count: rows.length });
  } catch (e: any) {
    errors.push(`cash_withdrawals: ${e.message}`);
    onProgress?.({ entity: 'cash_withdrawals', status: 'error', error: e.message });
  }

  // 10. Settings (update singleton, only fields present in backup)
  onProgress?.({ entity: 'settings', status: 'in_progress' });
  try {
    if (data.settings) {
      const patch: Record<string, any> = { updated_at: new Date().toISOString() };
      if (data.settings.weightCostPerLb !== undefined) {
        patch.weight_cost_per_lb = data.settings.weightCostPerLb;
      }
      if (data.settings.taxRatePercent !== undefined) {
        patch.tax_rate_percent = data.settings.taxRatePercent;
      }
      const { error } = await supabase.from('settings').update(patch).not('id', 'is', null);
      if (error) throw error;
    }
    counts.settings = 1;
    onProgress?.({ entity: 'settings', status: 'done', count: 1 });
  } catch (e: any) {
    errors.push(`settings: ${e.message}`);
    onProgress?.({ entity: 'settings', status: 'error', error: e.message });
  }

  return { success: errors.length === 0, counts, errors };
}
