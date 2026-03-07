-- Add missing foreign key constraints for user_id -> auth.users
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'properties_user_id_fkey') THEN
    ALTER TABLE public.properties
      ADD CONSTRAINT properties_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'maintenance_logs_user_id_fkey') THEN
    ALTER TABLE public.maintenance_logs
      ADD CONSTRAINT maintenance_logs_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'home_items_user_id_fkey') THEN
    ALTER TABLE public.home_items
      ADD CONSTRAINT home_items_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'documents_user_id_fkey') THEN
    ALTER TABLE public.documents
      ADD CONSTRAINT documents_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'home_contacts_user_id_fkey') THEN
    ALTER TABLE public.home_contacts
      ADD CONSTRAINT home_contacts_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'recurring_templates_user_id_fkey') THEN
    ALTER TABLE public.recurring_templates
      ADD CONSTRAINT recurring_templates_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'property_utilities_user_id_fkey') THEN
    ALTER TABLE public.property_utilities
      ADD CONSTRAINT property_utilities_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'home_quick_refs_user_id_fkey') THEN
    ALTER TABLE public.home_quick_refs
      ADD CONSTRAINT home_quick_refs_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'home_item_attachments_user_id_fkey') THEN
    ALTER TABLE public.home_item_attachments
      ADD CONSTRAINT home_item_attachments_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Fix contractor-uploads SELECT policy: restrict to property owner only
DROP POLICY IF EXISTS "Authenticated users can view contractor uploads" ON storage.objects;

CREATE POLICY "Owners can view contractor uploads"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'contractor-uploads'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.contractor_submissions cs
      JOIN public.contractor_access_links cal ON cal.id = cs.access_link_id
      WHERE cal.user_id = auth.uid()
        AND (
          cs.receipt_files @> ARRAY[name]
          OR cs.photos @> ARRAY[name]
        )
    )
  );