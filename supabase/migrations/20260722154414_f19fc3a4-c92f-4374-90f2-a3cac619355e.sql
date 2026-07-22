
-- 1. Migrate permission values
UPDATE public.property_shares SET permission = 'editor' WHERE permission = 'collaborator';
UPDATE public.property_shares SET permission = 'viewer' WHERE permission NOT IN ('viewer','editor');
ALTER TABLE public.property_shares ALTER COLUMN permission SET DEFAULT 'viewer';
ALTER TABLE public.property_shares DROP CONSTRAINT IF EXISTS property_shares_permission_check;
ALTER TABLE public.property_shares ADD CONSTRAINT property_shares_permission_check CHECK (permission IN ('viewer','editor'));

-- 2. Editor access function
CREATE OR REPLACE FUNCTION public.has_property_edit_access(p_user_id uuid, p_property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.properties WHERE id = p_property_id AND user_id = p_user_id
    UNION ALL
    SELECT 1 FROM public.property_shares
     WHERE property_id = p_property_id
       AND shared_with_user_id = p_user_id
       AND status = 'accepted'
       AND permission = 'editor'
  )
$$;

-- 3. Editor INSERT/UPDATE policies
-- maintenance_logs: INSERT policy for editors (owner insert policy already exists via "Shared users can insert maintenance logs" with has_property_access — replace with editor variant)
DROP POLICY IF EXISTS "Shared users can insert maintenance logs" ON public.maintenance_logs;
CREATE POLICY "Editors can insert maintenance logs" ON public.maintenance_logs
  FOR INSERT WITH CHECK (public.has_property_edit_access(auth.uid(), property_id) AND auth.uid() = user_id);
CREATE POLICY "Editors can update maintenance logs" ON public.maintenance_logs
  FOR UPDATE USING (public.has_property_edit_access(auth.uid(), property_id))
  WITH CHECK (public.has_property_edit_access(auth.uid(), property_id));

-- home_items
CREATE POLICY "Editors can insert home items" ON public.home_items
  FOR INSERT WITH CHECK (public.has_property_edit_access(auth.uid(), property_id) AND auth.uid() = user_id);
CREATE POLICY "Editors can update home items" ON public.home_items
  FOR UPDATE USING (public.has_property_edit_access(auth.uid(), property_id))
  WITH CHECK (public.has_property_edit_access(auth.uid(), property_id));

-- home_contacts
DROP POLICY IF EXISTS "Shared users can insert shared contacts" ON public.home_contacts;
CREATE POLICY "Editors can insert home contacts" ON public.home_contacts
  FOR INSERT WITH CHECK (public.has_property_edit_access(auth.uid(), property_id) AND auth.uid() = user_id);
CREATE POLICY "Editors can update home contacts" ON public.home_contacts
  FOR UPDATE USING (public.has_property_edit_access(auth.uid(), property_id))
  WITH CHECK (public.has_property_edit_access(auth.uid(), property_id));

-- documents
DROP POLICY IF EXISTS "Shared users can insert shared documents" ON public.documents;
CREATE POLICY "Editors can insert documents" ON public.documents
  FOR INSERT WITH CHECK (public.has_property_edit_access(auth.uid(), property_id) AND auth.uid() = user_id);
CREATE POLICY "Editors can update documents" ON public.documents
  FOR UPDATE USING (public.has_property_edit_access(auth.uid(), property_id))
  WITH CHECK (public.has_property_edit_access(auth.uid(), property_id));

-- utility_payments
CREATE POLICY "Editors can insert utility payments" ON public.utility_payments
  FOR INSERT WITH CHECK (public.has_property_edit_access(auth.uid(), property_id) AND auth.uid() = user_id);
CREATE POLICY "Editors can update utility payments" ON public.utility_payments
  FOR UPDATE USING (public.has_property_edit_access(auth.uid(), property_id))
  WITH CHECK (public.has_property_edit_access(auth.uid(), property_id));

-- property_utilities: editors can insert/update but credentials wiped by trigger
CREATE POLICY "Editors can insert utilities" ON public.property_utilities
  FOR INSERT WITH CHECK (public.has_property_edit_access(auth.uid(), property_id) AND auth.uid() = user_id);
CREATE POLICY "Editors can update utilities" ON public.property_utilities
  FOR UPDATE USING (public.has_property_edit_access(auth.uid(), property_id))
  WITH CHECK (public.has_property_edit_access(auth.uid(), property_id));
-- Also allow editors to read (view) directly-masked shared view already grants view; add direct-table select for editors so app queries work, but rely on shared view for masking. Actually we want editors to route through the shared view, so DO NOT add a direct SELECT policy; editors must query property_utilities_shared.

-- Trigger: null credential fields when the actor is not the row owner
CREATE OR REPLACE FUNCTION public.mask_utility_credentials_on_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> NEW.user_id THEN
    NEW.account_number := NULL;
    NEW.policy_number := NULL;
    NEW.username := NULL;
    NEW.email_on_account := NULL;
    NEW.password_hint := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mask_utility_credentials ON public.property_utilities;
CREATE TRIGGER trg_mask_utility_credentials
  BEFORE INSERT OR UPDATE ON public.property_utilities
  FOR EACH ROW EXECUTE FUNCTION public.mask_utility_credentials_on_write();

-- Ensure shared view remains accessible to authenticated
GRANT SELECT ON public.property_utilities_shared TO authenticated;
