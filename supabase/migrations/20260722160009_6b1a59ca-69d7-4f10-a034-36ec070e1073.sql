
-- Revoke EXECUTE from PUBLIC / anon on all SECURITY DEFINER functions in public.
-- Trigger-only functions: revoke from authenticated too (invoked internally by triggers).
-- User-facing RPCs and RLS helpers: keep authenticated EXECUTE.

-- Trigger helpers (used only via triggers): fully locked down
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mask_utility_credentials_on_write()     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_contact_to_directory()             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.remove_contact_from_directory()         FROM PUBLIC, anon, authenticated;

-- RPCs and RLS helpers: revoke anon, keep authenticated
REVOKE EXECUTE ON FUNCTION public.accept_property_transfer(uuid)          FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_user_account()                   FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.redeem_beta_code(text)                  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_directory_sharing(boolean)          FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.suggest_providers(text, text, text, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_beta_access(uuid)                   FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_property_access(uuid, uuid)         FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_property_edit_access(uuid, uuid)    FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)         FROM PUBLIC, anon;

-- Contractor uploads: drop the wide-open INSERT policy.
-- The contractor-submit edge function uses the service role key and bypasses
-- storage RLS, so legitimate contractor uploads continue to work.
DROP POLICY IF EXISTS "Anyone can upload contractor files" ON storage.objects;
