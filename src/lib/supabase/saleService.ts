import { supabase } from './client';
import { Sale, InventoryItem } from '../../types/models';
import { toSale, toSupabaseSale, SaleWithLines } from './mappers';
import { upsertProduct } from './productService';
import { isValidUUID } from '../utils';

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
 * Save a sale with its lines and updated inventory items.
 * New sales are inserted without id; existing ones are updated.
 * Lines are always deleted and re-inserted (without id — DB generates).
 * Returns the DB id for the sale.
 */
export async function upsertSaleWithRelations(
  sale: Sale,
  updatedItems: InventoryItem[]
): Promise<string> {
  const { row, lineRows } = toSupabaseSale(sale);
  const isNew = !isValidUUID(sale.id);
  let saleId: string;

  if (isNew) {
    const { id: _, ...insertPayload } = row;
    const { data, error } = await supabase
      .from('sales')
      .insert(insertPayload)
      .select('id')
      .single();
    if (error) throw new Error(`Failed to create sale: ${error.message}`);
    saleId = data.id as string;
  } else {
    const { error } = await supabase.from('sales').update(row).eq('id', sale.id);
    if (error) throw new Error(`Failed to update sale: ${error.message}`);
    saleId = sale.id;

    const { error: deleteError } = await supabase.from('sale_lines').delete().eq('sale_id', saleId);
    if (deleteError) throw new Error(`Failed to clear sale lines: ${deleteError.message}`);
  }

  await Promise.all(updatedItems.map(item => upsertProduct(item)));

  if (lineRows.length > 0) {
    const rowsWithSaleId = lineRows.map(({ id: _, ...rest }) => ({
      ...rest,
      sale_id: saleId,
    }));
    const { error: insertError } = await supabase.from('sale_lines').insert(rowsWithSaleId);
    if (insertError) throw new Error(`Failed to insert sale lines: ${insertError.message}`);
  }

  return saleId;
}

export async function deleteSale(id: string): Promise<void> {
  // Lines cascade-delete automatically via FK constraint
  const { error } = await supabase.from('sales').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete sale: ${error.message}`);
}
