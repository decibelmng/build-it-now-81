
-- Add item_type column with default 'home_component'
ALTER TABLE public.home_items ADD COLUMN item_type TEXT NOT NULL DEFAULT 'home_component';

-- Add estimated_value column for personal items (insurance purposes)
ALTER TABLE public.home_items ADD COLUMN estimated_value NUMERIC DEFAULT NULL;
