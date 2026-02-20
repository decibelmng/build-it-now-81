
-- Property shares table for collaborator access
CREATE TABLE public.property_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  shared_with_email text NOT NULL,
  shared_with_user_id uuid,
  permission text NOT NULL DEFAULT 'collaborator',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(property_id, shared_with_email)
);

ALTER TABLE public.property_shares ENABLE ROW LEVEL SECURITY;

-- Owner can manage their shares
CREATE POLICY "Owners can manage shares"
ON public.property_shares FOR ALL
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Shared users can view shares they're part of
CREATE POLICY "Shared users can view their shares"
ON public.property_shares FOR SELECT
USING (auth.uid() = shared_with_user_id);

CREATE TRIGGER update_property_shares_updated_at
BEFORE UPDATE ON public.property_shares
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Security definer function to check if user has shared access to a property
CREATE OR REPLACE FUNCTION public.has_property_access(p_user_id uuid, p_property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.properties WHERE id = p_property_id AND user_id = p_user_id
    UNION ALL
    SELECT 1 FROM public.property_shares 
    WHERE property_id = p_property_id 
      AND shared_with_user_id = p_user_id 
      AND status = 'accepted'
  )
$$;

-- Update properties RLS to allow shared access (read)
CREATE POLICY "Shared users can view shared properties"
ON public.properties FOR SELECT
USING (public.has_property_access(auth.uid(), id));

-- Update maintenance_logs RLS for shared access
CREATE POLICY "Shared users can view shared maintenance logs"
ON public.maintenance_logs FOR SELECT
USING (public.has_property_access(auth.uid(), property_id));

CREATE POLICY "Shared users can insert maintenance logs"
ON public.maintenance_logs FOR INSERT
WITH CHECK (public.has_property_access(auth.uid(), property_id) AND auth.uid() = user_id);

-- Update documents RLS for shared access
CREATE POLICY "Shared users can view shared documents"
ON public.documents FOR SELECT
USING (public.has_property_access(auth.uid(), property_id));

CREATE POLICY "Shared users can insert shared documents"
ON public.documents FOR INSERT
WITH CHECK (public.has_property_access(auth.uid(), property_id) AND auth.uid() = user_id);

-- Update home_contacts RLS for shared access
CREATE POLICY "Shared users can view shared contacts"
ON public.home_contacts FOR SELECT
USING (public.has_property_access(auth.uid(), property_id));

CREATE POLICY "Shared users can insert shared contacts"
ON public.home_contacts FOR INSERT
WITH CHECK (public.has_property_access(auth.uid(), property_id) AND auth.uid() = user_id);
