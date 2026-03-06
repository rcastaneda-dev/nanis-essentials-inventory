import { supabase } from './client';
import { Sale, InventoryItem } from '../../types/models';
import { toSale, toSupabaseSale, SaleWithLines } from './mappers';
import { upsertProduct } from './productService';

export async function fetchAllSales(): Promise<Sale[]> {
  const { data, error } = await supabase
    .from('sales')
    .select(
      `
      *,
      sale_lines (*)
    `
    )
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch sales: ${error.message}`);
  return (data as unknown as SaleWithLines[]).map(toSale);
}

/**
 * Upsert a sale with its lines and updated inventory items.
 * Line strategy: delete all existing lines for this sale, then re-insert.
 */
export async function upsertSaleWithRelations(
  sale: Sale,
  updatedItems: InventoryItem[]
): Promise<void> {
  const { row, lineRows } = toSupabaseSale(sale);

  // 1. Upsert the sale header
  const { error: saleError } = await supabase.from('sales').upsert(row, { onConflict: 'id' });
  if (saleError) throw new Error(`Failed to save sale: ${saleError.message}`);

  // 2. Replace lines: delete existing, then insert new
  const { error: deleteError } = await supabase.from('sale_lines').delete().eq('sale_id', sale.id);
  if (deleteError) throw new Error(`Failed to clear sale lines: ${deleteError.message}`);

  if (lineRows.length > 0) {
    const rowsWithSaleId = lineRows.map(l => ({ ...l, sale_id: sale.id }));
    const { error: insertError } = await supabase.from('sale_lines').insert(rowsWithSaleId);
    if (insertError) throw new Error(`Failed to insert sale lines: ${insertError.message}`);
  }

  // 3. Update inventory for affected products
  await Promise.all(updatedItems.map(item => upsertProduct(item)));
}

export async function deleteSale(id: string): Promise<void> {
  // Lines cascade-delete automatically via FK constraint
  const { error } = await supabase.from('sales').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete sale: ${error.message}`);
}
