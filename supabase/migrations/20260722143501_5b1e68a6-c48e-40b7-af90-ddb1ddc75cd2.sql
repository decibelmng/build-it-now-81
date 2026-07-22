
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS share_contacts_to_directory BOOLEAN NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.set_directory_sharing(p_enabled BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_ids UUID[];
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE public.profiles
     SET share_contacts_to_directory = p_enabled,
         updated_at = now()
   WHERE user_id = v_user_id;

  IF p_enabled = false THEN
    -- Collect the user's contact ids first
    SELECT array_agg(id) INTO v_ids
      FROM public.home_contacts
     WHERE user_id = v_user_id;

    -- Flip the flag on all their contacts (skips the sync insert path)
    UPDATE public.home_contacts
       SET share_to_directory = false,
           updated_at = now()
     WHERE user_id = v_user_id;

    IF v_ids IS NOT NULL THEN
      -- Decrement counts and drop the user's ids from directory entries
      UPDATE public.service_provider_directory d
         SET source_contact_ids = (
               SELECT COALESCE(array_agg(x), '{}')
                 FROM unnest(d.source_contact_ids) x
                WHERE NOT (x = ANY(v_ids))
             ),
             times_saved = GREATEST(
               d.times_saved - cardinality(ARRAY(
                 SELECT x FROM unnest(d.source_contact_ids) x WHERE x = ANY(v_ids)
               )), 0),
             last_seen_at = now()
       WHERE d.source_contact_ids && v_ids;

      -- Remove entries with no remaining sources
      DELETE FROM public.service_provider_directory
       WHERE cardinality(source_contact_ids) = 0;
    END IF;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_directory_sharing(BOOLEAN) TO authenticated;
