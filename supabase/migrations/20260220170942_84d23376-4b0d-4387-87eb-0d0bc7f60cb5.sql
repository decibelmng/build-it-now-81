
-- Add reference_code column
ALTER TABLE public.maintenance_logs ADD COLUMN reference_code text UNIQUE;

-- Trade code mapping function
CREATE OR REPLACE FUNCTION public.trade_code(category text)
RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE category
    WHEN 'plumbing' THEN 'PLB'
    WHEN 'electrical' THEN 'ELC'
    WHEN 'hvac' THEN 'HVC'
    WHEN 'roofing' THEN 'ROF'
    WHEN 'landscaping' THEN 'LND'
    WHEN 'appliance' THEN 'APL'
    WHEN 'general' THEN 'GEN'
    ELSE 'OTH'
  END;
$$;

-- Extract house number from address (first numeric sequence)
CREATE OR REPLACE FUNCTION public.extract_house_number(addr text)
RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT m[1] FROM regexp_matches(addr, '(\d+)') AS m LIMIT 1),
    '0'
  );
$$;

-- Generate unique reference code for a maintenance log
CREATE OR REPLACE FUNCTION public.generate_maintenance_reference()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_zip text;
  v_addr text;
  v_house text;
  v_trade text;
  v_suffix text;
  v_code text;
  v_exists boolean;
BEGIN
  -- Look up property details
  SELECT COALESCE(p.zip, '00000'), COALESCE(p.address, '0')
  INTO v_zip, v_addr
  FROM public.properties p WHERE p.id = NEW.property_id;

  v_house := public.extract_house_number(v_addr);
  v_trade := public.trade_code(NEW.category);

  -- Generate a 5-char alphanumeric suffix, retry on collision
  LOOP
    v_suffix := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 5));
    v_code := v_zip || '-' || v_house || '-' || v_trade || '-' || v_suffix;
    SELECT EXISTS(SELECT 1 FROM public.maintenance_logs WHERE reference_code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;

  NEW.reference_code := v_code;
  RETURN NEW;
END;
$$;

-- Trigger on insert (only generate if not already set)
CREATE TRIGGER trg_generate_maintenance_reference
BEFORE INSERT ON public.maintenance_logs
FOR EACH ROW
WHEN (NEW.reference_code IS NULL)
EXECUTE FUNCTION public.generate_maintenance_reference();

-- Backfill existing rows
DO $$
DECLARE
  r RECORD;
  v_zip text;
  v_addr text;
  v_house text;
  v_trade text;
  v_suffix text;
  v_code text;
  v_exists boolean;
BEGIN
  FOR r IN SELECT ml.id, ml.property_id, ml.category FROM public.maintenance_logs ml WHERE ml.reference_code IS NULL
  LOOP
    SELECT COALESCE(p.zip, '00000'), COALESCE(p.address, '0')
    INTO v_zip, v_addr
    FROM public.properties p WHERE p.id = r.property_id;

    v_house := public.extract_house_number(v_addr);
    v_trade := public.trade_code(r.category);

    LOOP
      v_suffix := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 5));
      v_code := v_zip || '-' || v_house || '-' || v_trade || '-' || v_suffix;
      SELECT EXISTS(SELECT 1 FROM public.maintenance_logs WHERE reference_code = v_code) INTO v_exists;
      EXIT WHEN NOT v_exists;
    END LOOP;

    UPDATE public.maintenance_logs SET reference_code = v_code WHERE id = r.id;
  END LOOP;
END;
$$;
