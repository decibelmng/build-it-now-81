
-- Storage bucket for maintenance log photos
INSERT INTO storage.buckets (id, name, public) VALUES ('maintenance-photos', 'maintenance-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for maintenance photos
CREATE POLICY "Users can view maintenance photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'maintenance-photos');

CREATE POLICY "Users can upload maintenance photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'maintenance-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their maintenance photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'maintenance-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add image_url column to maintenance_logs for photo attachments
ALTER TABLE public.maintenance_logs ADD COLUMN IF NOT EXISTS image_url text;

-- Add is_recurring and recurrence_interval columns
ALTER TABLE public.maintenance_logs ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false;
ALTER TABLE public.maintenance_logs ADD COLUMN IF NOT EXISTS recurrence_interval text;

-- Create recurring_templates table
CREATE TABLE IF NOT EXISTS public.recurring_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  estimated_cost numeric,
  interval_months integer NOT NULL DEFAULT 12,
  next_due_date date NOT NULL,
  last_created_at timestamp with time zone,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.recurring_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own templates"
ON public.recurring_templates FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own templates"
ON public.recurring_templates FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
ON public.recurring_templates FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
ON public.recurring_templates FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_recurring_templates_updated_at
BEFORE UPDATE ON public.recurring_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
