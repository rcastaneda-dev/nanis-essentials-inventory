-- Add color column to products
alter table public.products
  add column if not exists color varchar null;

comment on column public.products.color is 'Product color, shade, or variant identifier (e.g. 110, Red, Natural)';

-- Enable RLS on brands (table already exists but RLS was never activated)
alter table public.brands enable row level security;

-- Anon read policy already exists ("Allow anon to read brands") but was inert
-- because RLS was disabled. Now it takes effect. Re-create to be safe.
drop policy if exists "Allow anon to read brands" on public.brands;

create policy "Allow anon to read brands"
  on public.brands
  for select
  using (true);

-- Authenticated users: full read, admin-level write
create policy "Authenticated users can access brands"
  on public.brands
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Recreate the products_in_stock view to include color
drop view if exists public.products_in_stock_with_image_info;

create view public.products_in_stock_with_image_info as
select
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
    p.color,
    p.catalog_price,
    p.is_active,
    coalesce(sum(li.stock), 0::bigint) as total_stock,
    (select coalesce(sum(sl.quantity), 0::bigint)
     from sale_lines as sl
     where sl.product_id = p.id) as total_sales,
    max(li.updated_at) as last_inventory_update,
    p.created_at,
    p.updated_at,
    jsonb_array_length(coalesce(p.images, '[]'::jsonb)) as image_count,
    (select x.url
     from jsonb_to_recordset(p.images) as x(url text, "isPrimary" boolean)
     where x."isPrimary" = true
     limit 1) as primary_url
from
    products as p
left join
    location_inventory as li on li.product_id = p.id
group by
    p.id, p.name, p.sku, p.description, p.category, p.weight_lbs,
    p.cost_pre_shipping, p.cost_post_shipping, p.min_price, p.max_price,
    p.min_revenue, p.max_revenue, p.images, p.primary_image_url,
    p.brand_id, p.color, p.catalog_price, p.is_active, p.created_at, p.updated_at
having
    coalesce(sum(li.stock), 0::bigint) > 0;
