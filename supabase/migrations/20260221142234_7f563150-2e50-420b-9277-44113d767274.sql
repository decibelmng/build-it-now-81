
-- Home items: the "digital twin" inventory for every item in a home
CREATE TABLE public.home_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  install_date DATE,
  last_maintained DATE,
  expected_replacement DATE,
  warranty_expiry DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.home_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own home items" ON public.home_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own home items" ON public.home_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own home items" ON public.home_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own home items" ON public.home_items FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Shared users can view shared home items" ON public.home_items FOR SELECT USING (has_property_access(auth.uid(), property_id));

CREATE TRIGGER update_home_items_updated_at BEFORE UPDATE ON public.home_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Quick reference items: filter sizes, quantities, common specs
CREATE TABLE public.home_quick_refs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.home_quick_refs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quick refs" ON public.home_quick_refs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own quick refs" ON public.home_quick_refs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own quick refs" ON public.home_quick_refs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own quick refs" ON public.home_quick_refs FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Shared users can view shared quick refs" ON public.home_quick_refs FOR SELECT USING (has_property_access(auth.uid(), property_id));

CREATE TRIGGER update_home_quick_refs_updated_at BEFORE UPDATE ON public.home_quick_refs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
