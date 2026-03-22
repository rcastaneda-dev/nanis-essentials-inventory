import { supabase } from './client';
import { InventoryItem } from '../../types/models';
import { toInventoryItem, toSupabaseProduct, LocationWithProduct } from './mappers';
import { uploadProductImages, isBase64Image } from './storageService';
import { isValidUUID } from '../utils';

type ExistingLocationInventoryRow = {
  id: string;
  product_id: string;
  branch_id: string | null;
};

function getLocationInventoryKey(productId: string, branchId: string | null) {
  return `${productId}:${branchId ?? 'null'}`;
}

async function fetchExistingLocationInventoryIds(items: InventoryItem[]) {
  const existingProductIds = Array.from(new Set(items.map(item => item.id).filter(isValidUUID)));
  const existingLocationInventoryIds = new Map<string, string>();

  if (existingProductIds.length === 0) {
    return existingLocationInventoryIds;
  }

  const { data, error } = await supabase
    .from('location_inventory')
    .select('id, product_id, branch_id')
    .in('product_id', existingProductIds);

  if (error) {
    throw new Error(`Failed to fetch inventory rows: ${error.message}`);
  }

  for (const row of (data ?? []) as ExistingLocationInventoryRow[]) {
    existingLocationInventoryIds.set(
      getLocationInventoryKey(row.product_id, row.branch_id),
      row.id
    );
  }

  return existingLocationInventoryIds;
}

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
        color,
        catalog_price,
        is_active,
        created_at,
        updated_at,
        brands (id, name, display_name)
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
export async function upsertProduct(
  item: InventoryItem,
  options?: { existingLocationInventoryId?: string | null }
): Promise<string> {
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
    await upsertLocationInventory(locationInventory, options?.existingLocationInventoryId ?? null);
    return dbId;
  }

  const { error: productError } = await supabase.from('products').update(product).eq('id', item.id);

  if (productError) throw new Error(`Failed to save product: ${productError.message}`);

  // Prefer an explicitly provided id, then the one carried on the item (set during fetch),
  // then fall back to a live lookup (handles items constructed outside a DB fetch).
  const resolvedLocationInventoryId =
    options?.existingLocationInventoryId !== undefined
      ? options.existingLocationInventoryId
      : (item.locationInventoryId ?? undefined);

  await upsertLocationInventory(locationInventory, resolvedLocationInventoryId);
  return item.id;
}

export async function upsertProducts(items: InventoryItem[]): Promise<Map<string, string>> {
  const existingLocationInventoryIds = await fetchExistingLocationInventoryIds(items);
  const productIdMap = new Map<string, string>();

  for (const item of items) {
    const existingLocationInventoryId = isValidUUID(item.id)
      ? (existingLocationInventoryIds.get(
          getLocationInventoryKey(item.id, item.branchId ?? null)
        ) ?? null)
      : null;
    const dbId = await upsertProduct(item, { existingLocationInventoryId });

    if (dbId !== item.id) {
      productIdMap.set(item.id, dbId);
    }
  }

  return productIdMap;
}

/** Pending move: itemId is product id. */
export type PendingMove = {
  itemId: string;
  quantity: number;
  item: InventoryItem;
};

/** @deprecated Use PendingMove instead */
export type PendingMoveToBranch = PendingMove;

/**
 * Persist "Move Items to Branch" to Supabase: update source (main) and target (branch)
 * location_inventory so data survives refresh.
 */
export async function persistMoveToBranch(
  pendingMoves: PendingMove[],
  targetBranchId: string,
  updatedItems: InventoryItem[]
): Promise<void> {
  await Promise.all(
    pendingMoves.map(async move => {
      const sourceItem = updatedItems.find(i => i.id === move.itemId && !i.branchId);
      if (!sourceItem) return;

      const branchItem = updatedItems.find(
        i => i.id === move.itemId && i.branchId === targetBranchId
      );

      await Promise.all([
        upsertLocationInventory({
          product_id: move.itemId,
          branch_id: null,
          stock: sourceItem.stock,
        }),
        branchItem
          ? upsertLocationInventory({
              product_id: move.itemId,
              branch_id: targetBranchId,
              stock: branchItem.stock,
            })
          : Promise.resolve(),
      ]);
    })
  );
}

/**
 * Persist "Move Items to Main" to Supabase: update source (branch) and target (main)
 * location_inventory so data survives refresh.
 * When branch stock reaches 0, the row is deleted.
 */
export async function persistMoveToMain(
  pendingMoves: PendingMove[],
  sourceBranchId: string,
  updatedItems: InventoryItem[]
): Promise<void> {
  await Promise.all(
    pendingMoves.map(async move => {
      const branchItem = updatedItems.find(
        i => i.id === move.itemId && i.branchId === sourceBranchId
      );
      const mainItem = updatedItems.find(i => i.id === move.itemId && !i.branchId);

      const ops: Promise<void>[] = [];

      // Branch item was removed from updatedItems when stock hit 0 → delete the row
      if (!branchItem) {
        ops.push(deleteLocationInventory(move.itemId, sourceBranchId));
      } else {
        ops.push(
          upsertLocationInventory({
            product_id: move.itemId,
            branch_id: sourceBranchId,
            stock: branchItem.stock,
          })
        );
      }

      if (mainItem) {
        ops.push(
          upsertLocationInventory({
            product_id: move.itemId,
            branch_id: null,
            stock: mainItem.stock,
          })
        );
      }

      await Promise.all(ops);
    })
  );
}

/**
 * Handles the location_inventory upsert with proper NULL branch_id handling.
 * PostgreSQL unique indexes don't match NULLs by default, so we manually
 * check-then-insert/update for the NULL branch case.
 */
async function upsertLocationInventory(
  loc: {
    product_id: string;
    branch_id: string | null;
    stock: number;
  },
  existingLocationInventoryId?: string | null
) {
  let rowId = existingLocationInventoryId;

  if (rowId === undefined) {
    let query = supabase.from('location_inventory').select('id').eq('product_id', loc.product_id);

    if (loc.branch_id) {
      query = query.eq('branch_id', loc.branch_id);
    } else {
      query = query.is('branch_id', null);
    }

    const { data: existing } = await query.maybeSingle();
    rowId = existing?.id ?? null;
  }

  if (rowId) {
    const { error } = await supabase
      .from('location_inventory')
      .update({ stock: loc.stock, updated_at: new Date().toISOString() })
      .eq('id', rowId);

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

/** Delete a location_inventory row when branch stock reaches 0. */
async function deleteLocationInventory(productId: string, branchId: string): Promise<void> {
  const { error } = await supabase
    .from('location_inventory')
    .delete()
    .eq('product_id', productId)
    .eq('branch_id', branchId);

  if (error) {
    throw new Error(`Failed to delete location inventory: ${error.message}`);
  }
}
