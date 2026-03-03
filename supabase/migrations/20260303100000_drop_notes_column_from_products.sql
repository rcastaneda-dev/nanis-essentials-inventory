-- Drop notes column from products (no longer used on frontend)
-- Drop dependent views first, then update products_with_image_info

DROP VIEW IF EXISTS public.products_in_stock_with_image_info;
DROP VIEW IF EXISTS public.products_with_image_info;

ALTER TABLE public.products
  DROP COLUMN IF EXISTS notes;

CREATE VIEW public.products_with_image_info AS
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
    COALESCE(sum(li.stock), 0::bigint) AS total_stock,
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
    p.created_at, p.updated_at;
