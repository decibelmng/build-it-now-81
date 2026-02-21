
-- Storage bucket for home item attachments (photos, receipts, PDFs)
INSERT INTO storage.buckets (id, name, public) VALUES ('home-item-attachments', 'home-item-attachments', true);

-- Storage policies
CREATE POLICY "Users can upload their own item attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'home-item-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own item attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'home-item-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own item attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'home-item-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Attachments table linking files to home items
CREATE TABLE public.home_item_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  home_item_id UUID NOT NULL REFERENCES public.home_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.home_item_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own item attachments" ON public.home_item_attachments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own item attachments" ON public.home_item_attachments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own item attachments" ON public.home_item_attachments FOR DELETE USING (auth.uid() = user_id);
