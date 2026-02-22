
-- Fix 1: Make maintenance-photos bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'maintenance-photos';

-- Fix 2: Make home-item-attachments bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'home-item-attachments';

-- Fix 3: Drop overly permissive SELECT policy on maintenance-photos and replace with owner-scoped
DROP POLICY IF EXISTS "Users can view maintenance photos" ON storage.objects;

CREATE POLICY "Users can view their own maintenance photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'maintenance-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Fix 4: Drop overly permissive SELECT policy on home-item-attachments and replace
DROP POLICY IF EXISTS "Users can view home item attachments" ON storage.objects;

CREATE POLICY "Users can view their own home item attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'home-item-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Fix 5: Harden accept_property_transfer with explicit null checks
CREATE OR REPLACE FUNCTION public.accept_property_transfer(p_transfer_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_transfer RECORD;
BEGIN
  -- Explicit authentication check
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

  -- Transfer ownership
  UPDATE public.properties SET user_id = v_transfer.to_user_id, updated_at = now()
    WHERE id = v_transfer.property_id;

  -- Update related records ownership
  UPDATE public.maintenance_logs SET user_id = v_transfer.to_user_id WHERE property_id = v_transfer.property_id;
  UPDATE public.home_contacts SET user_id = v_transfer.to_user_id WHERE property_id = v_transfer.property_id;
  UPDATE public.documents SET user_id = v_transfer.to_user_id WHERE property_id = v_transfer.property_id;
  UPDATE public.recurring_templates SET user_id = v_transfer.to_user_id WHERE property_id = v_transfer.property_id;

  -- Mark transfer as accepted
  UPDATE public.property_transfers SET status = 'accepted', updated_at = now()
    WHERE id = p_transfer_id;
END;
$function$;
