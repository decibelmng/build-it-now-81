
-- 1. EXTEND property_utilities
ALTER TABLE public.property_utilities
  ADD COLUMN IF NOT EXISTS account_group TEXT NOT NULL DEFAULT 'utilities',
  ADD COLUMN IF NOT EXISTS budget_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS is_income BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS paid_via TEXT DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS status_date DATE,
  ADD COLUMN IF NOT EXISTS status_note TEXT,
  ADD COLUMN IF NOT EXISTS login_url TEXT,
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS email_on_account TEXT,
  ADD COLUMN IF NOT EXISTS password_hint TEXT,
  ADD COLUMN IF NOT EXISTS policy_number TEXT,
  ADD COLUMN IF NOT EXISTS current_balance NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS balance_as_of DATE,
  ADD COLUMN IF NOT EXISTS contract_end_date DATE,
  ADD COLUMN IF NOT EXISTS due_day_of_month INTEGER CHECK (due_day_of_month BETWEEN 1 AND 31),
  ADD COLUMN IF NOT EXISTS is_autopay BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS include_in_transfer BOOLEAN DEFAULT true;

-- 2. service_type CHECK
ALTER TABLE public.property_utilities DROP CONSTRAINT IF EXISTS property_utilities_service_type_check;
ALTER TABLE public.property_utilities ADD CONSTRAINT property_utilities_service_type_check
  CHECK (service_type IN (
    'electric','gas','propane','water','sewer','trash',
    'internet','cable_tv','phone','streaming',
    'mortgage','heloc','property_tax','rent_lease',
    'homeowners_insurance','renters_insurance','flood_insurance','umbrella_policy','home_warranty',
    'security_monitoring','fire_monitoring',
    'hoa','condo_association',
    'lawn_care','pest_control','pool_service','tree_service','snow_removal','cleaning_service','hvac_service_plan','holiday_lighting',
    'solar_lease','ev_charging',
    'rent_received',
    'other'
  ));

-- status + paid_via CHECKs
ALTER TABLE public.property_utilities DROP CONSTRAINT IF EXISTS property_utilities_status_check;
ALTER TABLE public.property_utilities ADD CONSTRAINT property_utilities_status_check
  CHECK (status IN ('active','stop_requested','transferred','cancelled','paid_off'));

ALTER TABLE public.property_utilities DROP CONSTRAINT IF EXISTS property_utilities_paid_via_check;
ALTER TABLE public.property_utilities ADD CONSTRAINT property_utilities_paid_via_check
  CHECK (paid_via IN ('direct','escrow','included_in_rent','hoa_covered','landlord_paid'));

-- Trigger for account_group / is_income
CREATE OR REPLACE FUNCTION public.set_utility_account_group()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.account_group := CASE NEW.service_type
    WHEN 'electric' THEN 'utilities'
    WHEN 'gas' THEN 'utilities'
    WHEN 'propane' THEN 'utilities'
    WHEN 'water' THEN 'utilities'
    WHEN 'sewer' THEN 'utilities'
    WHEN 'trash' THEN 'utilities'
    WHEN 'internet' THEN 'connectivity'
    WHEN 'cable_tv' THEN 'connectivity'
    WHEN 'phone' THEN 'connectivity'
    WHEN 'streaming' THEN 'connectivity'
    WHEN 'mortgage' THEN 'financial'
    WHEN 'heloc' THEN 'financial'
    WHEN 'property_tax' THEN 'financial'
    WHEN 'rent_lease' THEN 'financial'
    WHEN 'homeowners_insurance' THEN 'insurance'
    WHEN 'renters_insurance' THEN 'insurance'
    WHEN 'flood_insurance' THEN 'insurance'
    WHEN 'umbrella_policy' THEN 'insurance'
    WHEN 'home_warranty' THEN 'insurance'
    WHEN 'security_monitoring' THEN 'security'
    WHEN 'fire_monitoring' THEN 'security'
    WHEN 'hoa' THEN 'community'
    WHEN 'condo_association' THEN 'community'
    WHEN 'lawn_care' THEN 'services'
    WHEN 'pest_control' THEN 'services'
    WHEN 'pool_service' THEN 'services'
    WHEN 'tree_service' THEN 'services'
    WHEN 'snow_removal' THEN 'services'
    WHEN 'cleaning_service' THEN 'services'
    WHEN 'hvac_service_plan' THEN 'services'
    WHEN 'holiday_lighting' THEN 'services'
    WHEN 'solar_lease' THEN 'energy'
    WHEN 'ev_charging' THEN 'energy'
    WHEN 'rent_received' THEN 'income'
    ELSE 'other'
  END;
  IF NEW.service_type = 'rent_received' THEN
    NEW.is_income := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_utility_account_group ON public.property_utilities;
CREATE TRIGGER trg_set_utility_account_group
  BEFORE INSERT OR UPDATE OF service_type ON public.property_utilities
  FOR EACH ROW EXECUTE FUNCTION public.set_utility_account_group();

-- Backfill account_group for existing rows
UPDATE public.property_utilities SET service_type = service_type;

-- 4. utility_payments table
CREATE TABLE IF NOT EXISTS public.utility_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  utility_id UUID NOT NULL REFERENCES public.property_utilities(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  payment_month DATE NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (utility_id, payment_month)
);
CREATE INDEX IF NOT EXISTS idx_utility_payments_property_month
  ON public.utility_payments(property_id, payment_month);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.utility_payments TO authenticated;
GRANT ALL ON public.utility_payments TO service_role;

ALTER TABLE public.utility_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage utility payments" ON public.utility_payments;
CREATE POLICY "Owners select utility payments" ON public.utility_payments
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owners insert utility payments" ON public.utility_payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update utility payments" ON public.utility_payments
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners delete utility payments" ON public.utility_payments
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Shared viewers select utility payments" ON public.utility_payments
  FOR SELECT USING (public.has_property_access(auth.uid(), property_id));

-- 5. Drop shared SELECT policy on base; create masked view
DROP POLICY IF EXISTS "Shared users can view shared utilities" ON public.property_utilities;

DROP VIEW IF EXISTS public.property_utilities_shared;
CREATE VIEW public.property_utilities_shared
WITH (security_invoker = true) AS
SELECT
  id, user_id, property_id, service_type, provider_name,
  monthly_cost, vendor_url, contact_name, contact_phone, contact_email, notes,
  created_at, updated_at,
  account_group, budget_amount, is_income, paid_via, status, status_date, status_note,
  login_url, policy_number IS NOT NULL AS has_policy_number,
  current_balance, balance_as_of, contract_end_date, due_day_of_month, is_autopay, include_in_transfer,
  CASE
    WHEN account_number IS NULL THEN NULL
    WHEN length(account_number) <= 4 THEN '••••'
    ELSE '•••• ' || right(account_number, 4)
  END AS account_number_masked
FROM public.property_utilities
WHERE public.has_property_access(auth.uid(), property_id);

GRANT SELECT ON public.property_utilities_shared TO authenticated;

-- 6. Savings field on properties
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS monthly_deposit NUMERIC(10,2);

-- 7. Update accept_property_transfer
CREATE OR REPLACE FUNCTION public.accept_property_transfer(p_transfer_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_transfer RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_transfer FROM public.property_transfers
    WHERE id = p_transfer_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer not found or already processed';
  END IF;

  IF v_transfer.to_user_id IS NULL THEN
    RAISE EXCEPTION 'Transfer recipient not set';
  END IF;

  IF v_transfer.to_user_id != auth.uid() THEN
    RAISE EXCEPTION 'You are not the recipient of this transfer';
  END IF;

  UPDATE public.home_items
    SET property_id = NULL, updated_at = now()
    WHERE property_id = v_transfer.property_id
      AND item_type = 'personal_item';

  UPDATE public.properties SET user_id = v_transfer.to_user_id, updated_at = now()
    WHERE id = v_transfer.property_id;

  UPDATE public.home_items SET user_id = v_transfer.to_user_id
    WHERE property_id = v_transfer.property_id
      AND item_type = 'home_component';

  UPDATE public.maintenance_logs SET user_id = v_transfer.to_user_id WHERE property_id = v_transfer.property_id;
  UPDATE public.home_contacts SET user_id = v_transfer.to_user_id WHERE property_id = v_transfer.property_id;
  UPDATE public.documents SET user_id = v_transfer.to_user_id WHERE property_id = v_transfer.property_id;
  UPDATE public.recurring_templates SET user_id = v_transfer.to_user_id WHERE property_id = v_transfer.property_id;

  -- Utilities: wipe credentials & reassign for included; drop excluded
  UPDATE public.property_utilities SET
    user_id = v_transfer.to_user_id,
    account_number = NULL,
    policy_number = NULL,
    username = NULL,
    email_on_account = NULL,
    password_hint = NULL,
    is_autopay = false
  WHERE property_id = v_transfer.property_id
    AND include_in_transfer = true;

  DELETE FROM public.property_utilities
  WHERE property_id = v_transfer.property_id
    AND include_in_transfer = false;

  -- Payment history stays with seller
  DELETE FROM public.utility_payments
  WHERE property_id = v_transfer.property_id;

  UPDATE public.property_transfers SET status = 'accepted', updated_at = now()
    WHERE id = p_transfer_id;
END;
$function$;
