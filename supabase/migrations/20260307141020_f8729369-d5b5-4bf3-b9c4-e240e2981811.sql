
-- Update accept_property_transfer to handle personal items:
-- Personal items get detached (property_id set to null) and stay with original owner
-- Only home_component items transfer to new owner
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

  -- Detach personal items from the property (keep with original owner)
  UPDATE public.home_items
    SET property_id = NULL, updated_at = now()
    WHERE property_id = v_transfer.property_id
      AND item_type = 'personal_item';

  -- Transfer ownership of property
  UPDATE public.properties SET user_id = v_transfer.to_user_id, updated_at = now()
    WHERE id = v_transfer.property_id;

  -- Transfer home_component items to new owner
  UPDATE public.home_items SET user_id = v_transfer.to_user_id
    WHERE property_id = v_transfer.property_id
      AND item_type = 'home_component';

  -- Transfer related records
  UPDATE public.maintenance_logs SET user_id = v_transfer.to_user_id WHERE property_id = v_transfer.property_id;
  UPDATE public.home_contacts SET user_id = v_transfer.to_user_id WHERE property_id = v_transfer.property_id;
  UPDATE public.documents SET user_id = v_transfer.to_user_id WHERE property_id = v_transfer.property_id;
  UPDATE public.recurring_templates SET user_id = v_transfer.to_user_id WHERE property_id = v_transfer.property_id;

  -- Mark transfer as accepted
  UPDATE public.property_transfers SET status = 'accepted', updated_at = now()
    WHERE id = p_transfer_id;
END;
$function$;
