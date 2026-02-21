
-- Create utilities table for tracking utility accounts per property
CREATE TABLE public.property_utilities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL DEFAULT 'other',
  provider_name TEXT NOT NULL,
  account_number TEXT,
  monthly_cost NUMERIC,
  vendor_url TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.property_utilities ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own utilities"
  ON public.property_utilities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own utilities"
  ON public.property_utilities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own utilities"
  ON public.property_utilities FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own utilities"
  ON public.property_utilities FOR DELETE
  USING (auth.uid() = user_id);

-- Shared property access
CREATE POLICY "Shared users can view shared utilities"
  ON public.property_utilities FOR SELECT
  USING (has_property_access(auth.uid(), property_id));

-- Updated_at trigger
CREATE TRIGGER update_property_utilities_updated_at
  BEFORE UPDATE ON public.property_utilities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
