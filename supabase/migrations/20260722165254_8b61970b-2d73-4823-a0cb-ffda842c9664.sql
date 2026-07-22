
-- Drop blanket admin SELECT policies on user data tables
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all properties" ON public.properties;
DROP POLICY IF EXISTS "Admins can view all maintenance_logs" ON public.maintenance_logs;
DROP POLICY IF EXISTS "Admins can view all property_shares" ON public.property_shares;
DROP POLICY IF EXISTS "Admins can view all transfers" ON public.property_transfers;

-- Admin RPCs
CREATE OR REPLACE FUNCTION public.admin_get_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_users bigint;
  v_props bigint;
  v_logs bigint;
  v_shares bigint;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT count(*) INTO v_users FROM public.profiles;
  SELECT count(*) INTO v_props FROM public.properties;
  SELECT count(*) INTO v_logs FROM public.maintenance_logs;
  SELECT count(*) INTO v_shares FROM public.property_shares;
  RETURN jsonb_build_object(
    'users', v_users,
    'properties', v_props,
    'maintenanceLogs', v_logs,
    'shares', v_shares
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_users(p_search text DEFAULT NULL)
RETURNS TABLE(id uuid, user_id uuid, email text, display_name text, persona text, property_count bigint, created_at timestamptz)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT p.id, p.user_id, u.email::text, p.display_name, p.persona,
         (SELECT count(*) FROM public.properties pr WHERE pr.user_id = p.user_id) AS property_count,
         p.created_at
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.user_id
  WHERE p_search IS NULL
     OR p.display_name ILIKE '%'||p_search||'%'
     OR u.email::text ILIKE '%'||p_search||'%'
  ORDER BY p.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_properties(p_search text DEFAULT NULL)
RETURNS TABLE(id uuid, name text, property_type text, city text, state text, owner_email text, created_at timestamptz)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT pr.id, pr.name, pr.property_type, pr.city, pr.state,
         u.email::text AS owner_email, pr.created_at
  FROM public.properties pr
  LEFT JOIN auth.users u ON u.id = pr.user_id
  WHERE p_search IS NULL
     OR pr.name ILIKE '%'||p_search||'%'
     OR pr.city ILIKE '%'||p_search||'%'
     OR pr.state ILIKE '%'||p_search||'%'
     OR u.email::text ILIKE '%'||p_search||'%'
  ORDER BY pr.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_shares()
RETURNS TABLE(id uuid, property_id uuid, property_name text, shared_with_email text, permission text, status text, created_at timestamptz)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT s.id, s.property_id, pr.name AS property_name,
         s.shared_with_email, s.permission::text, s.status::text, s.created_at
  FROM public.property_shares s
  LEFT JOIN public.properties pr ON pr.id = s.property_id
  ORDER BY s.created_at DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_get_stats() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_users(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_properties(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_shares() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_properties(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_shares() TO authenticated;
