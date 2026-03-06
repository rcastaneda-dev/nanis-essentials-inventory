import { supabase } from './client';
import { Purchase, InventoryItem, CashWithdrawal } from '../../types/models';
import { toPurchase, toSupabasePurchase, PurchaseWithLines } from './mappers';
import { upsertProducts } from './productService';
import { upsertCashWithdrawal } from './cashWithdrawalService';
import { isValidUUID } from '../utils';

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
 * Save a purchase header, lines, inventory updates, and optional cash withdrawals.
 * New records are inserted without id (DB generates uuid).
 * Lines are always deleted+re-inserted without id.
 * Returns the DB-generated purchase id.
 */
export async function upsertPurchaseWithRelations(
  purchase: Purchase,
  updatedItems: InventoryItem[],
  updatedWithdrawals?: CashWithdrawal[]
): Promise<string> {
  const { row, lineRows } = toSupabasePurchase(purchase);
  const isNew = !isValidUUID(purchase.id);
  let purchaseId: string;

  if (isNew) {
    const { id: _, ...insertPayload } = row;
    const { data, error } = await supabase
      .from('purchases')
      .insert(insertPayload)
      .select('id')
      .single();
    if (error) throw new Error(`Failed to save purchase: ${error.message}`);
    purchaseId = data.id as string;
  } else {
    const { error } = await supabase.from('purchases').update(row).eq('id', purchase.id);
    if (error) throw new Error(`Failed to save purchase: ${error.message}`);
    purchaseId = purchase.id;

    const { error: deleteError } = await supabase
      .from('purchase_lines')
      .delete()
      .eq('purchase_id', purchaseId);
    if (deleteError) throw new Error(`Failed to clear purchase lines: ${deleteError.message}`);
  }

  // Save products first so temp ids from QuickAdd resolve to real UUIDs
  const productIdMap = await upsertProducts(updatedItems);

  if (lineRows.length > 0) {
    const rowsWithPurchaseId = lineRows.map(({ id: _, ...rest }) => ({
      ...rest,
      purchase_id: purchaseId,
      product_id: productIdMap.get(rest.product_id) ?? rest.product_id,
    }));
    const { error: insertError } = await supabase.from('purchase_lines').insert(rowsWithPurchaseId);
    if (insertError) throw new Error(`Failed to insert purchase lines: ${insertError.message}`);
  }

  if (updatedWithdrawals) {
    const withdrawalsWithPurchaseId = updatedWithdrawals.map(cw =>
      cw.linkedPurchaseId === purchase.id ? { ...cw, linkedPurchaseId: purchaseId } : cw
    );
    await Promise.all(withdrawalsWithPurchaseId.map(cw => upsertCashWithdrawal(cw)));
  }

  return purchaseId;
}

export async function deletePurchase(id: string): Promise<void> {
  const { error } = await supabase.from('purchases').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete purchase: ${error.message}`);
}
