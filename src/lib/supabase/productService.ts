import { supabase } from './client';
import { InventoryItem } from '../../types/models';
import { toInventoryItem, toSupabaseProduct, LocationWithProduct } from './mappers';

/**
 * Fetch all products joined with their location inventory from Supabase.
 * Each location_inventory row produces one InventoryItem (product + stock at location).
 */
export async function fetchAllProducts(): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from('location_inventory')
    .select(
      `
      id,
      product_id,
      branch_id,
      stock,
      location_notes,
      created_at,
      updated_at,
      products (
        id,
        name,
        sku,
        description,
        notes,
        category,
        weight_lbs,
        cost_pre_shipping,
        cost_post_shipping,
        min_price,
        max_price,
        competitor_a_price,
        competitor_b_price,
        min_revenue,
        max_revenue,
        images,
        primary_image_url,
        brand_id,
        catalog_price,
        is_active,
        created_at,
        updated_at
      )
    `
    )
    .order('created_at', { referencedTable: 'products', ascending: false });

  if (error) {
    throw new Error(`Failed to fetch products: ${error.message}`);
  }

  return (data as unknown as LocationWithProduct[]).map(toInventoryItem);
}

/**
 * Upsert a product and its location inventory into Supabase.
 * Handles both insert (new product) and update (existing product) cases.
 */
export async function upsertProduct(item: InventoryItem): Promise<void> {
  const { product, locationInventory } = toSupabaseProduct(item);

  const { error: productError } = await supabase
    .from('products')
    .upsert(product, { onConflict: 'id' });

  if (productError) {
    throw new Error(`Failed to save product: ${productError.message}`);
  }

  await upsertLocationInventory(locationInventory);
}

/**
 * Handles the location_inventory upsert with proper NULL branch_id handling.
 * PostgreSQL unique indexes don't match NULLs by default, so we manually
 * check-then-insert/update for the NULL branch case.
 */
async function upsertLocationInventory(loc: {
  product_id: string;
  branch_id: string | null;
  stock: number;
}) {
  let query = supabase.from('location_inventory').select('id').eq('product_id', loc.product_id);

  if (loc.branch_id) {
    query = query.eq('branch_id', loc.branch_id);
  } else {
    query = query.is('branch_id', null);
  }

  const { data: existing } = await query.maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('location_inventory')
      .update({ stock: loc.stock, updated_at: new Date().toISOString() })
      .eq('id', existing.id);

    if (error) {
      throw new Error(`Failed to update inventory: ${error.message}`);
    }
  } else {
    const { error } = await supabase.from('location_inventory').insert(loc);

    if (error) {
      throw new Error(`Failed to create inventory: ${error.message}`);
    }
  }
}
