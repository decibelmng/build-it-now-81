CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  DELETE FROM public.contractor_access_links WHERE user_id = v_user_id;
  DELETE FROM public.properties WHERE user_id = v_user_id;
  DELETE FROM public.profiles WHERE user_id = v_user_id;
END;
$$;