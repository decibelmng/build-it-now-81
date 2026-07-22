
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS residency_type TEXT NOT NULL DEFAULT 'owned'
  CHECK (residency_type IN ('owned','renting','renting_out','second_home'));
