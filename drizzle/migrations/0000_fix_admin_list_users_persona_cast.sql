CREATE OR REPLACE FUNCTION public.admin_list_users(p_search text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, user_id uuid, email text, display_name text, persona text, property_count bigint, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT p.id, p.user_id, u.email::text, p.display_name, p.persona::text,
         (SELECT count(*) FROM public.properties pr WHERE pr.user_id = p.user_id) AS property_count,
         p.created_at
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.user_id
  WHERE p_search IS NULL
     OR p.display_name ILIKE '%'||p_search||'%'
     OR u.email::text ILIKE '%'||p_search||'%'
  ORDER BY p.created_at DESC;
END;
$function$;