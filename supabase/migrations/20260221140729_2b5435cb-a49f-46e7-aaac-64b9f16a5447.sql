
-- Add unique property code
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS property_code text UNIQUE;

-- Create property transfer requests table
CREATE TABLE public.property_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL,
  to_email text NOT NULL,
  to_user_id uuid,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.property_transfers ENABLE ROW LEVEL SECURITY;

-- Sender can manage their transfers
CREATE POLICY "Owners can manage their transfers"
  ON public.property_transfers FOR ALL
  USING (auth.uid() = from_user_id)
  WITH CHECK (auth.uid() = from_user_id);

-- Recipients can view transfers to them
CREATE POLICY "Recipients can view their transfers"
  ON public.property_transfers FOR SELECT
  USING (auth.uid() = to_user_id);

-- Recipients can update (accept/decline) their transfers
CREATE POLICY "Recipients can update their transfers"
  ON public.property_transfers FOR UPDATE
  USING (auth.uid() = to_user_id);

-- Admins can view all
CREATE POLICY "Admins can view all transfers"
  ON public.property_transfers FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_property_transfers_updated_at
  BEFORE UPDATE ON public.property_transfers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate unique property code: ZIP-HOUSENUM-HOME-XXXXX
CREATE OR REPLACE FUNCTION public.generate_property_code()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = 'public'
AS $$
DECLARE
  v_zip text;
  v_house text;
  v_suffix text;
  v_code text;
  v_exists boolean;
BEGIN
  IF NEW.property_code IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_zip := COALESCE(NEW.zip, '00000');
  v_house := public.extract_house_number(COALESCE(NEW.address, '0'));

  LOOP
    v_suffix := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 5));
    v_code := v_zip || '-' || v_house || '-HOME-' || v_suffix;
    SELECT EXISTS(SELECT 1 FROM public.properties WHERE property_code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;

  NEW.property_code := v_code;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_property_code
  BEFORE INSERT ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.generate_property_code();

-- Backfill existing properties
DO $$
DECLARE
  r RECORD;
  v_zip text;
  v_house text;
  v_suffix text;
  v_code text;
  v_exists boolean;
BEGIN
  FOR r IN SELECT id, address, zip FROM public.properties WHERE property_code IS NULL LOOP
    v_zip := COALESCE(r.zip, '00000');
    v_house := public.extract_house_number(COALESCE(r.address, '0'));
    LOOP
      v_suffix := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 5));
      v_code := v_zip || '-' || v_house || '-HOME-' || v_suffix;
      SELECT EXISTS(SELECT 1 FROM public.properties WHERE property_code = v_code) INTO v_exists;
      EXIT WHEN NOT v_exists;
    END LOOP;
    UPDATE public.properties SET property_code = v_code WHERE id = r.id;
  END LOOP;
END;
$$;

-- Security definer function to accept a transfer (changes property ownership)
CREATE OR REPLACE FUNCTION public.accept_property_transfer(p_transfer_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = 'public'
AS $$
DECLARE
  v_transfer RECORD;
BEGIN
  SELECT * INTO v_transfer FROM public.property_transfers
    WHERE id = p_transfer_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer not found or already processed';
  END IF;

  IF v_transfer.to_user_id IS NULL OR v_transfer.to_user_id != auth.uid() THEN
    RAISE EXCEPTION 'You are not the recipient of this transfer';
  END IF;

  -- Transfer ownership
  UPDATE public.properties SET user_id = v_transfer.to_user_id, updated_at = now()
    WHERE id = v_transfer.property_id;

  -- Update related records ownership
  UPDATE public.maintenance_logs SET user_id = v_transfer.to_user_id WHERE property_id = v_transfer.property_id;
  UPDATE public.home_contacts SET user_id = v_transfer.to_user_id WHERE property_id = v_transfer.property_id;
  UPDATE public.documents SET user_id = v_transfer.to_user_id WHERE property_id = v_transfer.property_id;
  UPDATE public.recurring_templates SET user_id = v_transfer.to_user_id WHERE property_id = v_transfer.property_id;

  -- Mark transfer as accepted
  UPDATE public.property_transfers SET status = 'accepted', updated_at = now()
    WHERE id = p_transfer_id;
END;
$$;
