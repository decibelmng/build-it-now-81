
-- 1) Make buckets private (tool required for storage.buckets)
-- Handled via storage_update_bucket tool calls; this migration only adjusts policies + views.

-- 2) Ensure owner-only SELECT policies exist (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Owners read own maintenance photos') THEN
    CREATE POLICY "Owners read own maintenance photos"
      ON storage.objects FOR SELECT
      USING (
        bucket_id = 'maintenance-photos'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Owners read own item attachments') THEN
    CREATE POLICY "Owners read own item attachments"
      ON storage.objects FOR SELECT
      USING (
        bucket_id = 'home-item-attachments'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END$$;

-- 3) Shared contacts view without the private notes column.
CREATE OR REPLACE VIEW public.home_contacts_shared
WITH (security_invoker = on) AS
SELECT
  id, user_id, property_id, name, role, company, phone, email,
  website_url, is_preferred, is_archived, share_to_directory,
  created_at, updated_at
FROM public.home_contacts;

GRANT SELECT ON public.home_contacts_shared TO authenticated;
