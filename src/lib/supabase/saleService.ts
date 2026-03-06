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
 * Save a sale header, lines, and inventory updates.
 * New records are inserted without id (DB generates uuid).
 * Lines are always deleted+re-inserted without id.
 * Returns the DB-generated sale id.
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
    if (error) throw new Error(`Failed to save sale: ${error.message}`);
    saleId = data.id as string;
  } else {
    const { error } = await supabase.from('sales').update(row).eq('id', sale.id);
    if (error) throw new Error(`Failed to save sale: ${error.message}`);
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
  const { error } = await supabase.from('sales').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete sale: ${error.message}`);
}
