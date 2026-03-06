
-- Create contractor_access_links table
CREATE TABLE public.contractor_access_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL DEFAULT replace(gen_random_uuid()::text || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8), '-', ''),
  label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create contractor_submissions table
CREATE TABLE public.contractor_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_link_id UUID NOT NULL REFERENCES public.contractor_access_links(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  contractor_company_name TEXT NOT NULL,
  contractor_contact_name TEXT NOT NULL,
  contractor_email TEXT,
  contractor_phone TEXT,
  service_date DATE NOT NULL,
  service_category TEXT NOT NULL,
  service_description TEXT NOT NULL,
  cost NUMERIC(10,2),
  warranty_info TEXT,
  notes TEXT,
  photos TEXT[] DEFAULT '{}',
  receipt_files TEXT[] DEFAULT '{}',
  add_to_contacts BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

-- RLS for contractor_access_links
ALTER TABLE public.contractor_access_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own links"
  ON public.contractor_access_links FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create links for their properties"
  ON public.contractor_access_links FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.properties WHERE id = property_id AND user_id = auth.uid()));

CREATE POLICY "Users can update their own links"
  ON public.contractor_access_links FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own links"
  ON public.contractor_access_links FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS for contractor_submissions
ALTER TABLE public.contractor_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Homeowners can view submissions for their properties"
  ON public.contractor_submissions FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.contractor_access_links cal
    WHERE cal.id = access_link_id AND cal.user_id = auth.uid()
  ));

CREATE POLICY "Homeowners can update submission status"
  ON public.contractor_submissions FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.contractor_access_links cal
    WHERE cal.id = access_link_id AND cal.user_id = auth.uid()
  ));

-- Anonymous insert is handled via edge function with service role key
-- but we add anon policy for the edge function using service_role
CREATE POLICY "Service role can insert submissions"
  ON public.contractor_submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Create contractor-uploads storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('contractor-uploads', 'contractor-uploads', false);

-- Storage policy: allow anonymous uploads
CREATE POLICY "Anyone can upload contractor files"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'contractor-uploads');

-- Storage policy: authenticated users can view files in their properties
CREATE POLICY "Authenticated users can view contractor uploads"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'contractor-uploads');
