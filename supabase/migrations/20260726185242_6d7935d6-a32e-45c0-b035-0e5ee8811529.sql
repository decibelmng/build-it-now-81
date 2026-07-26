
CREATE OR REPLACE FUNCTION public.slugify_property_text(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT NULLIF(
    substring(
      trim(BOTH '-' FROM
        regexp_replace(lower(COALESCE(p_text, '')), '[^a-z0-9]+', '-', 'g')
      ),
      1, 80
    ),
    ''
  );
$$;

ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS slug text;

CREATE OR REPLACE FUNCTION public.generate_property_slug(p_property_id uuid, p_address text, p_city text)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_base text;
  v_candidate text;
  v_city text;
  v_i int;
  v_try text;
BEGIN
  v_base := public.slugify_property_text(p_address);

  IF v_base IS NULL OR v_base = '' THEN
    RETURN 'property-' || substring(replace(p_property_id::text, '-', ''), 1, 8);
  END IF;

  v_candidate := v_base;
  IF NOT EXISTS (SELECT 1 FROM public.properties WHERE slug = v_candidate) THEN
    RETURN substring(v_candidate, 1, 80);
  END IF;

  v_city := public.slugify_property_text(p_city);
  IF v_city IS NOT NULL AND v_city <> '' THEN
    v_candidate := substring(v_base || '-' || v_city, 1, 80);
    IF NOT EXISTS (SELECT 1 FROM public.properties WHERE slug = v_candidate) THEN
      RETURN v_candidate;
    END IF;
  END IF;

  FOR v_i IN 2..9999 LOOP
    v_try := substring(v_candidate || '-' || v_i::text, 1, 80);
    IF NOT EXISTS (SELECT 1 FROM public.properties WHERE slug = v_try) THEN
      RETURN v_try;
    END IF;
  END LOOP;

  RETURN 'property-' || substring(replace(p_property_id::text, '-', ''), 1, 8);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_property_slug_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.generate_property_slug(NEW.id, NEW.address, NEW.city);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_property_slug_insert ON public.properties;
CREATE TRIGGER trg_property_slug_insert
BEFORE INSERT ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.set_property_slug_on_insert();

CREATE OR REPLACE FUNCTION public.protect_property_slug_on_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.slug IS NOT NULL AND NEW.slug IS DISTINCT FROM OLD.slug THEN
    RAISE EXCEPTION 'property.slug is immutable and cannot be changed once assigned';
  END IF;
  IF OLD.slug IS NULL AND (NEW.slug IS NULL OR NEW.slug = '') THEN
    NEW.slug := public.generate_property_slug(NEW.id, NEW.address, NEW.city);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_property_slug_update ON public.properties;
CREATE TRIGGER trg_property_slug_update
BEFORE UPDATE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.protect_property_slug_on_update();

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id, address, city FROM public.properties WHERE slug IS NULL LOOP
    UPDATE public.properties
       SET slug = public.generate_property_slug(r.id, r.address, r.city)
     WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.properties ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS properties_slug_unique_idx ON public.properties(slug);
