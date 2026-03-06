-- Remove has_sub_items and sub_items_qty from purchase_lines (unused)
-- Dropping columns automatically drops chk_purchase_lines_sub_items constraint

ALTER TABLE public.purchase_lines
  DROP COLUMN IF EXISTS has_sub_items,
  DROP COLUMN IF EXISTS sub_items_qty;
