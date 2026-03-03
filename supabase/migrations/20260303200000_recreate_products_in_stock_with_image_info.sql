-- Recreate products_in_stock_with_image_info (dropped during notes column removal)
-- Full product columns including catalog_price, brand_id, is_active; only products with stock > 0

CREATE VIEW public.products_in_stock_with_image_info AS
SELECT
    p.id,
    p.name,
    p.sku,
    p.description,
    p.category,
    p.weight_lbs,
    p.cost_pre_shipping,
    p.cost_post_shipping,
    p.min_price,
    p.max_price,
    p.min_revenue,
    p.max_revenue,
    p.images,
    p.primary_image_url,
    p.brand_id,
    p.catalog_price,
    p.is_active,
    COALESCE(sum(li.stock), 0::bigint) AS total_stock,
    (SELECT COALESCE(sum(sl.quantity), 0::bigint)
     FROM sale_lines sl
     WHERE sl.product_id = p.id) AS total_sales,
    max(li.updated_at) AS last_inventory_update,
    p.created_at,
    p.updated_at,
    jsonb_array_length(COALESCE(p.images, '[]'::jsonb)) AS image_count,
    (SELECT x.url
     FROM jsonb_to_recordset(p.images) AS x(url text, "isPrimary" boolean)
     WHERE x."isPrimary" = true
     LIMIT 1) AS primary_url
FROM
    products AS p
LEFT JOIN
    location_inventory AS li ON li.product_id = p.id
GROUP BY
    p.id, p.name, p.sku, p.description, p.category, p.weight_lbs,
    p.cost_pre_shipping, p.cost_post_shipping, p.min_price, p.max_price,
    p.min_revenue, p.max_revenue, p.images, p.primary_image_url,
    p.brand_id, p.catalog_price, p.is_active, p.created_at, p.updated_at
HAVING
    COALESCE(sum(li.stock), 0::bigint) > 0;
