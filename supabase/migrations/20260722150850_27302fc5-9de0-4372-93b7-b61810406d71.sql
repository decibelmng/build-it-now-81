ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS home_office_sqft INTEGER;

CREATE TABLE IF NOT EXISTS public.property_tax_year (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  tax_year INTEGER NOT NULL,
  mortgage_interest NUMERIC(12,2),
  real_estate_taxes NUMERIC(12,2),
  homeowners_insurance NUMERIC(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (property_id, tax_year)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_tax_year TO authenticated;
GRANT ALL ON public.property_tax_year TO service_role;

ALTER TABLE public.property_tax_year ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their tax year records"
  ON public.property_tax_year FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_property_tax_year_updated_at
  BEFORE UPDATE ON public.property_tax_year
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();