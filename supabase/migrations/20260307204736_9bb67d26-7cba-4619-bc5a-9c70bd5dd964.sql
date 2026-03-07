
-- Add component_id FK, component_updated, component_update_skipped columns
ALTER TABLE public.maintenance_logs
  ADD COLUMN component_id uuid REFERENCES public.home_items(id) ON DELETE SET NULL,
  ADD COLUMN component_updated boolean NOT NULL DEFAULT false,
  ADD COLUMN component_update_skipped boolean NOT NULL DEFAULT false;

-- Partial index for backfill query finding unlinked log entries
CREATE INDEX idx_maintenance_logs_unlinked_components
  ON public.maintenance_logs(property_id)
  WHERE component_id IS NULL AND component_update_skipped = FALSE;
