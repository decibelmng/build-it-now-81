
-- 1. VALUATIONS TABLE
CREATE TABLE public.property_valuations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  valuation_type TEXT NOT NULL DEFAULT 'estimate',
  valuation_date DATE NOT NULL,
  value NUMERIC(12,2) NOT NULL,
  source TEXT,
  notes TEXT,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_valuations_property ON public.property_valuations(property_id);
CREATE INDEX idx_valuations_date ON public.property_valuations(property_id, valuation_date);

ALTER TABLE public.property_valuations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own valuations"
  ON public.property_valuations FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own valuations"
  ON public.property_valuations FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own valuations"
  ON public.property_valuations FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own valuations"
  ON public.property_valuations FOR DELETE
  USING (auth.uid() = user_id);

-- 2. MORTGAGE + VALUE FIELDS ON PROPERTIES
ALTER TABLE public.properties
  ADD COLUMN current_estimated_value NUMERIC(12,2),
  ADD COLUMN value_last_updated DATE,
  ADD COLUMN mortgage_balance NUMERIC(12,2),
  ADD COLUMN mortgage_last_updated DATE,
  ADD COLUMN mortgage_rate NUMERIC(5,3),
  ADD COLUMN mortgage_payment NUMERIC(10,2),
  ADD COLUMN original_loan_amount NUMERIC(12,2),
  ADD COLUMN loan_term_months INTEGER,
  ADD COLUMN mortgage_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL;

-- 3. EQUITY SUMMARY VIEW
CREATE OR REPLACE VIEW public.property_equity_summary WITH (security_invoker = on) AS
SELECT
  p.id AS property_id, p.user_id, p.name, p.address,
  p.purchase_price, p.purchase_date,
  p.current_estimated_value, p.value_last_updated,
  p.mortgage_balance, p.mortgage_last_updated,
  p.mortgage_rate, p.mortgage_payment,
  p.original_loan_amount, p.loan_term_months,
  CASE WHEN p.current_estimated_value IS NOT NULL AND p.purchase_price IS NOT NULL
    THEN p.current_estimated_value - p.purchase_price
    ELSE NULL END AS appreciation,
  CASE WHEN p.current_estimated_value IS NOT NULL AND p.purchase_price IS NOT NULL AND p.purchase_price > 0
    THEN ROUND(((p.current_estimated_value - p.purchase_price) / p.purchase_price * 100)::numeric, 1)
    ELSE NULL END AS appreciation_pct,
  CASE WHEN p.current_estimated_value IS NOT NULL AND p.mortgage_balance IS NOT NULL
    THEN p.current_estimated_value - p.mortgage_balance
    ELSE NULL END AS estimated_equity,
  CASE WHEN p.current_estimated_value IS NOT NULL AND p.mortgage_balance IS NOT NULL AND p.current_estimated_value > 0
    THEN ROUND(((p.current_estimated_value - p.mortgage_balance) / p.current_estimated_value * 100)::numeric, 1)
    ELSE NULL END AS equity_pct,
  (SELECT value FROM public.property_valuations pv WHERE pv.property_id = p.id ORDER BY pv.valuation_date DESC LIMIT 1) AS latest_appraisal_value,
  (SELECT valuation_date FROM public.property_valuations pv WHERE pv.property_id = p.id ORDER BY pv.valuation_date DESC LIMIT 1) AS latest_appraisal_date,
  (SELECT COUNT(*) FROM public.property_valuations pv WHERE pv.property_id = p.id) AS valuation_count
FROM public.properties p;

-- 4. UPDATE delete_user_account TO INCLUDE VALUATIONS
CREATE OR REPLACE FUNCTION public.delete_user_account()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.maintenance_log_components WHERE log_id IN (SELECT id FROM public.maintenance_logs WHERE user_id = v_user_id);
  DELETE FROM public.home_item_attachments WHERE user_id = v_user_id;
  DELETE FROM public.contractor_submissions WHERE access_link_id IN (SELECT id FROM public.contractor_access_links WHERE user_id = v_user_id);
  DELETE FROM public.property_shares WHERE owner_id = v_user_id;
  DELETE FROM public.property_transfers WHERE from_user_id = v_user_id;
  DELETE FROM public.recurring_templates WHERE user_id = v_user_id;
  DELETE FROM public.home_contacts WHERE user_id = v_user_id;
  DELETE FROM public.property_utilities WHERE user_id = v_user_id;
  DELETE FROM public.home_quick_refs WHERE user_id = v_user_id;
  DELETE FROM public.documents WHERE user_id = v_user_id;
  DELETE FROM public.maintenance_logs WHERE user_id = v_user_id;
  DELETE FROM public.home_items WHERE user_id = v_user_id;
  DELETE FROM public.property_valuations WHERE user_id = v_user_id;
  DELETE FROM public.contractor_access_links WHERE user_id = v_user_id;
  DELETE FROM public.properties WHERE user_id = v_user_id;
  DELETE FROM public.profiles WHERE user_id = v_user_id;
END;
$function$;
