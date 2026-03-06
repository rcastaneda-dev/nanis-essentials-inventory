import { supabase } from './client';
import { Purchase, InventoryItem, CashWithdrawal } from '../../types/models';
import { toPurchase, toSupabasePurchase, PurchaseWithLines } from './mappers';
import { upsertProduct } from './productService';
import { upsertCashWithdrawal } from './cashWithdrawalService';

export async function fetchAllPurchases(): Promise<Purchase[]> {
  const { data, error } = await supabase
    .from('purchases')
    .select(
      `
      *,
      purchase_lines (*)
    `
    )
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch purchases: ${error.message}`);
  return (data as unknown as PurchaseWithLines[]).map(toPurchase);
}

/**
 * Upsert a purchase with its lines, updated inventory items, and optional cash withdrawals.
 * Line strategy: delete all existing lines for this purchase, then re-insert.
 */
export async function upsertPurchaseWithRelations(
  purchase: Purchase,
  updatedItems: InventoryItem[],
  updatedWithdrawals?: CashWithdrawal[]
): Promise<void> {
  const { row, lineRows } = toSupabasePurchase(purchase);

  // 1. Upsert the purchase header
  const { error: purchaseError } = await supabase
    .from('purchases')
    .upsert(row, { onConflict: 'id' });
  if (purchaseError) throw new Error(`Failed to save purchase: ${purchaseError.message}`);

  // 2. Replace lines: delete existing, then insert new
  const { error: deleteError } = await supabase
    .from('purchase_lines')
    .delete()
    .eq('purchase_id', purchase.id);
  if (deleteError) throw new Error(`Failed to clear purchase lines: ${deleteError.message}`);

  if (lineRows.length > 0) {
    const rowsWithPurchaseId = lineRows.map(l => ({ ...l, purchase_id: purchase.id }));
    const { error: insertError } = await supabase.from('purchase_lines').insert(rowsWithPurchaseId);
    if (insertError) throw new Error(`Failed to insert purchase lines: ${insertError.message}`);
  }

  // 3. Update inventory for affected products
  await Promise.all(updatedItems.map(item => upsertProduct(item)));

  // 4. Update cash withdrawals if provided
  if (updatedWithdrawals) {
    await Promise.all(updatedWithdrawals.map(cw => upsertCashWithdrawal(cw)));
  }
}

export async function deletePurchase(id: string): Promise<void> {
  // Lines cascade-delete automatically via FK constraint
  const { error } = await supabase.from('purchases').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete purchase: ${error.message}`);
}
