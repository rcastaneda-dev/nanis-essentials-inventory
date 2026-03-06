import { supabase } from './client';
import { InventoryItem } from '../../types/models';
import { toInventoryItem, toSupabaseProduct, LocationWithProduct } from './mappers';
import { uploadProductImages, isBase64Image } from './storageService';
import { isValidUUID } from '../utils';

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
        category,
        weight_lbs,
        cost_pre_shipping,
        cost_post_shipping,
        min_price,
        max_price,
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
 * Save a product and its location inventory to Supabase.
 * New products (non-UUID id, e.g. from uid()) are inserted without id — the DB generates one.
 * Existing products (valid UUID from DB) are updated in place.
 * Returns the DB id (generated for inserts, unchanged for updates).
 */
export async function upsertProduct(item: InventoryItem): Promise<string> {
  const isNew = !isValidUUID(item.id);
  const hasNewImages = item.images.some(img => isBase64Image(img.dataUrl));

  if (hasNewImages) {
    const uploadedImages = await uploadProductImages(item.id, item.images);

    const oldPrimaryId = item.primaryImageId;
    if (oldPrimaryId) {
      const match = item.images.findIndex(img => img.id === oldPrimaryId);
      if (match !== -1) {
        item = { ...item, primaryImageId: uploadedImages[match].id };
      }
    }

    item = { ...item, images: uploadedImages };
  }

  const { product, locationInventory } = toSupabaseProduct(item);

  if (isNew) {
    const { id: _tempId, created_at: _ca, ...insertPayload } = product;

    const { data, error } = await supabase
      .from('products')
      .insert(insertPayload)
      .select('id')
      .single();

    if (error) throw new Error(`Failed to save product: ${error.message}`);

    const dbId = data.id as string;
    locationInventory.product_id = dbId;
    await upsertLocationInventory(locationInventory);
    return dbId;
  }

  const { error: productError } = await supabase.from('products').update(product).eq('id', item.id);

  if (productError) throw new Error(`Failed to save product: ${productError.message}`);

  await upsertLocationInventory(locationInventory);
  return item.id;
}

/** Pending move from MoveToBranchModal: itemId is product id. */
export type PendingMoveToBranch = {
  itemId: string;
  quantity: number;
  item: InventoryItem;
};

/**
 * Persist "Move Items to Branch" to Supabase: update source (main) and target (branch)
 * location_inventory so data survives refresh.
 */
export async function persistMoveToBranch(
  pendingMoves: PendingMoveToBranch[],
  targetBranchId: string,
  updatedItems: InventoryItem[]
): Promise<void> {
  for (const move of pendingMoves) {
    const sourceItem = updatedItems.find(i => i.id === move.itemId && !i.branchId);
    if (!sourceItem) continue;

    await upsertLocationInventory({
      product_id: move.itemId,
      branch_id: null,
      stock: sourceItem.stock,
    });

    const branchItem = updatedItems.find(
      i => i.id === move.itemId && i.branchId === targetBranchId
    );
    if (branchItem) {
      await upsertLocationInventory({
        product_id: move.itemId,
        branch_id: targetBranchId,
        stock: branchItem.stock,
      });
    }
  }
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
