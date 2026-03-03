-- Storage RLS policies for products bucket
-- Run in Supabase Dashboard → SQL Editor, or: supabase db push

-- If uploads happen without login, change TO authenticated → TO public
CREATE POLICY "Allow authenticated uploads to products"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'products');

-- Allow public read (for public image URLs)
CREATE POLICY "Allow public read of products"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'products');
