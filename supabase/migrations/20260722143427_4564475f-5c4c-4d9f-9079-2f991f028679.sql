
-- 1. Directory table
CREATE TABLE IF NOT EXISTS public.service_provider_directory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  phone_normalized TEXT,
  role TEXT,
  city TEXT,
  state TEXT,
  times_saved INTEGER NOT NULL DEFAULT 1,
  source_contact_ids UUID[] NOT NULL DEFAULT '{}',
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_dir_dedupe
  ON public.service_provider_directory (normalized_name, COALESCE(phone_normalized, ''));

CREATE INDEX IF NOT EXISTS idx_dir_geo
  ON public.service_provider_directory (state, city, role)
  WHERE is_hidden = false;

CREATE INDEX IF NOT EXISTS idx_dir_source_contacts
  ON public.service_provider_directory USING GIN (source_contact_ids);

GRANT SELECT ON public.service_provider_directory TO authenticated;
GRANT ALL ON public.service_provider_directory TO service_role;

ALTER TABLE public.service_provider_directory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read visible directory entries"
  ON public.service_provider_directory
  FOR SELECT
  TO authenticated
  USING (is_hidden = false);

-- 2. Normalization helpers
CREATE OR REPLACE FUNCTION public.normalize_company_name(p_name TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT NULLIF(
    regexp_replace(
      lower(trim(COALESCE(p_name, ''))),
      '[[:space:],\.]*\y(llc|l\.l\.c\.|inc|inc\.|incorporated|co|co\.|company|corp|corp\.|corporation|ltd|ltd\.|limited)\y[[:space:]\.]*$',
      '',
      'i'
    ),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION public.normalize_phone(p_phone TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT NULLIF(regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g'), '');
$$;

-- 3. Sync trigger
CREATE OR REPLACE FUNCTION public.sync_contact_to_directory()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_norm_name  TEXT;
  v_norm_phone TEXT;
  v_city       TEXT;
  v_state      TEXT;
  v_existing_ids UUID[];
BEGIN
  -- Skip if not shareable
  IF NEW.role IN ('personal', 'landlord')
     OR COALESCE(NEW.share_to_directory, false) = false
     OR NEW.company IS NULL
     OR btrim(NEW.company) = ''
  THEN
    RETURN NEW;
  END IF;

  v_norm_name := public.normalize_company_name(NEW.company);
  IF v_norm_name IS NULL THEN
    RETURN NEW;
  END IF;

  v_norm_phone := public.normalize_phone(NEW.phone);

  SELECT p.city, p.state INTO v_city, v_state
  FROM public.properties p
  WHERE p.id = NEW.property_id;

  -- Upsert; only bump times_saved / append when NEW.id is not already tracked
  INSERT INTO public.service_provider_directory
    (display_name, normalized_name, phone_normalized, role, city, state,
     times_saved, source_contact_ids, first_seen_at, last_seen_at)
  VALUES
    (btrim(NEW.company), v_norm_name, v_norm_phone, NEW.role, v_city, v_state,
     1, ARRAY[NEW.id], now(), now())
  ON CONFLICT (normalized_name, COALESCE(phone_normalized, '')) DO UPDATE
  SET
    display_name = CASE
      WHEN NEW.id = ANY(public.service_provider_directory.source_contact_ids)
        THEN public.service_provider_directory.display_name
      ELSE btrim(NEW.company)
    END,
    role  = COALESCE(EXCLUDED.role,  public.service_provider_directory.role),
    city  = COALESCE(EXCLUDED.city,  public.service_provider_directory.city),
    state = COALESCE(EXCLUDED.state, public.service_provider_directory.state),
    times_saved = public.service_provider_directory.times_saved
      + CASE WHEN NEW.id = ANY(public.service_provider_directory.source_contact_ids) THEN 0 ELSE 1 END,
    source_contact_ids = CASE
      WHEN NEW.id = ANY(public.service_provider_directory.source_contact_ids)
        THEN public.service_provider_directory.source_contact_ids
      ELSE array_append(public.service_provider_directory.source_contact_ids, NEW.id)
    END,
    last_seen_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_contact_directory ON public.home_contacts;
CREATE TRIGGER trg_sync_contact_directory
  AFTER INSERT OR UPDATE ON public.home_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_contact_to_directory();

-- 4. Cleanup trigger: decrement / remove on delete
CREATE OR REPLACE FUNCTION public.remove_contact_from_directory()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.service_provider_directory
  SET source_contact_ids = array_remove(source_contact_ids, OLD.id),
      times_saved = GREATEST(times_saved - 1, 0),
      last_seen_at = now()
  WHERE OLD.id = ANY(source_contact_ids);

  DELETE FROM public.service_provider_directory
  WHERE cardinality(source_contact_ids) = 0;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_remove_contact_directory ON public.home_contacts;
CREATE TRIGGER trg_remove_contact_directory
  AFTER DELETE ON public.home_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.remove_contact_from_directory();

-- 5. Suggest function
CREATE OR REPLACE FUNCTION public.suggest_providers(
  p_role  TEXT DEFAULT NULL,
  p_city  TEXT DEFAULT NULL,
  p_state TEXT DEFAULT NULL,
  p_limit INT  DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  display_name TEXT,
  role TEXT,
  city TEXT,
  state TEXT,
  phone_normalized TEXT,
  times_saved INT,
  match_rank INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    d.id,
    d.display_name,
    d.role,
    d.city,
    d.state,
    d.phone_normalized,
    d.times_saved,
    CASE
      WHEN p_city  IS NOT NULL AND p_state IS NOT NULL
           AND lower(d.city)  = lower(p_city)
           AND lower(d.state) = lower(p_state) THEN 1
      WHEN p_state IS NOT NULL AND lower(d.state) = lower(p_state) THEN 2
      ELSE 3
    END AS match_rank
  FROM public.service_provider_directory d
  WHERE d.is_hidden = false
    AND (p_role IS NULL OR d.role = p_role)
  ORDER BY match_rank ASC, d.times_saved DESC, d.last_seen_at DESC
  LIMIT GREATEST(COALESCE(p_limit, 5), 1);
$$;

GRANT EXECUTE ON FUNCTION public.suggest_providers(TEXT, TEXT, TEXT, INT) TO authenticated;

-- 6. Backfill directory from existing shareable contacts
INSERT INTO public.service_provider_directory
  (display_name, normalized_name, phone_normalized, role, city, state, times_saved, source_contact_ids, first_seen_at, last_seen_at)
SELECT
  btrim(c.company),
  public.normalize_company_name(c.company),
  public.normalize_phone(c.phone),
  c.role,
  p.city,
  p.state,
  count(*)::int,
  array_agg(c.id),
  min(c.created_at),
  max(c.updated_at)
FROM public.home_contacts c
LEFT JOIN public.properties p ON p.id = c.property_id
WHERE COALESCE(c.share_to_directory, false) = true
  AND c.company IS NOT NULL
  AND btrim(c.company) <> ''
  AND (c.role IS NULL OR c.role NOT IN ('personal', 'landlord'))
  AND public.normalize_company_name(c.company) IS NOT NULL
GROUP BY 1,2,3,4,5,6
ON CONFLICT (normalized_name, COALESCE(phone_normalized, '')) DO NOTHING;
