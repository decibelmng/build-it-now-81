
-- Make property_id nullable on home_items to support archived personal items
ALTER TABLE public.home_items ALTER COLUMN property_id DROP NOT NULL;
