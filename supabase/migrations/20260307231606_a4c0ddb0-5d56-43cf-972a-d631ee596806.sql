
-- Prompt 1: System-aware linking schema changes

-- 1. Add system_instance to home_items
ALTER TABLE public.home_items ADD COLUMN IF NOT EXISTS system_instance INTEGER DEFAULT NULL;

-- 2. Add system_key to maintenance_logs
ALTER TABLE public.maintenance_logs ADD COLUMN IF NOT EXISTS system_key TEXT DEFAULT NULL;

-- 3. Add system_key to documents
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS system_key TEXT DEFAULT NULL;

-- 4. Add system_key to contractor_submissions
ALTER TABLE public.contractor_submissions ADD COLUMN IF NOT EXISTS system_key TEXT DEFAULT NULL;

-- 5. Create junction table maintenance_log_components
CREATE TABLE IF NOT EXISTS public.maintenance_log_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id UUID NOT NULL REFERENCES public.maintenance_logs(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES public.home_items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(log_id, component_id)
);

CREATE INDEX IF NOT EXISTS idx_mlc_log_id ON public.maintenance_log_components(log_id);
CREATE INDEX IF NOT EXISTS idx_mlc_component_id ON public.maintenance_log_components(component_id);

-- Enable RLS on junction table
ALTER TABLE public.maintenance_log_components ENABLE ROW LEVEL SECURITY;

-- RLS: Users can manage junction rows for their own logs
CREATE POLICY "Users can view their log components"
  ON public.maintenance_log_components FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.maintenance_logs ml WHERE ml.id = log_id AND ml.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their log components"
  ON public.maintenance_log_components FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.maintenance_logs ml WHERE ml.id = log_id AND ml.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their log components"
  ON public.maintenance_log_components FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.maintenance_logs ml WHERE ml.id = log_id AND ml.user_id = auth.uid()
  ));

-- 7. Trigger to auto-populate system_key on maintenance_logs when component_id is set
CREATE OR REPLACE FUNCTION public.sync_log_system_key()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.component_id IS NOT NULL THEN
    SELECT system_key INTO NEW.system_key
    FROM public.home_items WHERE id = NEW.component_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_sync_log_system_key
  BEFORE INSERT OR UPDATE OF component_id ON public.maintenance_logs
  FOR EACH ROW EXECUTE FUNCTION public.sync_log_system_key();

-- Trigger to auto-populate system_key on documents when home_item_id is set
CREATE OR REPLACE FUNCTION public.sync_doc_system_key()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.home_item_id IS NOT NULL THEN
    SELECT system_key INTO NEW.system_key
    FROM public.home_items WHERE id = NEW.home_item_id;
  ELSIF NEW.maintenance_log_id IS NOT NULL THEN
    SELECT system_key INTO NEW.system_key
    FROM public.maintenance_logs WHERE id = NEW.maintenance_log_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_sync_doc_system_key
  BEFORE INSERT OR UPDATE OF home_item_id, maintenance_log_id ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.sync_doc_system_key();
