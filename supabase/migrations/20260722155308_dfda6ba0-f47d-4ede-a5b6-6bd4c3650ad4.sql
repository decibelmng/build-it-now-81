
CREATE TABLE IF NOT EXISTS public.beta_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  max_uses INTEGER NOT NULL DEFAULT 25,
  times_used INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT ALL ON public.beta_codes TO service_role;
-- no anon/authenticated grants: all access through security definer RPCs

ALTER TABLE public.beta_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view beta codes" ON public.beta_codes
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert beta codes" ON public.beta_codes
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update beta codes" ON public.beta_codes
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete beta codes" ON public.beta_codes
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Redemptions table
CREATE TABLE IF NOT EXISTS public.beta_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id UUID NOT NULL REFERENCES public.beta_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

GRANT SELECT ON public.beta_redemptions TO authenticated;
GRANT ALL ON public.beta_redemptions TO service_role;

ALTER TABLE public.beta_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own redemption" ON public.beta_redemptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins read all redemptions" ON public.beta_redemptions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Redeem RPC
CREATE OR REPLACE FUNCTION public.redeem_beta_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_code RECORD;
  v_normalized TEXT;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated');
  END IF;

  v_normalized := upper(btrim(COALESCE(p_code, '')));
  IF v_normalized = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid');
  END IF;

  -- Already redeemed by this user?
  IF EXISTS (SELECT 1 FROM public.beta_redemptions WHERE user_id = v_user) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_redeemed');
  END IF;

  -- Lock the code row for atomic increment
  SELECT * INTO v_code
    FROM public.beta_codes
   WHERE upper(code) = v_normalized
   FOR UPDATE;

  IF NOT FOUND OR NOT v_code.active THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid');
  END IF;

  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < NOW() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;

  IF v_code.times_used >= v_code.max_uses THEN
    RETURN jsonb_build_object('ok', false, 'error', 'exhausted');
  END IF;

  INSERT INTO public.beta_redemptions (code_id, user_id)
  VALUES (v_code.id, v_user);

  UPDATE public.beta_codes
     SET times_used = times_used + 1
   WHERE id = v_code.id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_beta_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_beta_code(TEXT) TO authenticated;

-- Helper to check if a user has beta access (used by check-subscription)
CREATE OR REPLACE FUNCTION public.has_beta_access(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.beta_redemptions WHERE user_id = _user_id);
$$;

GRANT EXECUTE ON FUNCTION public.has_beta_access(UUID) TO authenticated, service_role;
