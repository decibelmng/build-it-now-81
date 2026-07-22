
ALTER TABLE public.home_items
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS replaced_by_item_id UUID REFERENCES public.home_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS retired_at DATE,
  ADD COLUMN IF NOT EXISTS retirement_log_id UUID REFERENCES public.maintenance_logs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS home_items_active_system_key_idx
  ON public.home_items(property_id, system_key)
  WHERE status = 'active';
