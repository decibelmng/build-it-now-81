
-- Drop the overly permissive anon insert policy
DROP POLICY "Service role can insert submissions" ON public.contractor_submissions;

-- The edge function will use the service_role key to bypass RLS for inserts.
-- No anon insert policy needed on contractor_submissions.
