-- Add contact_id to recurring_templates so a contractor can be assigned
ALTER TABLE public.recurring_templates
ADD COLUMN contact_id UUID REFERENCES public.home_contacts(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_recurring_templates_contact_id ON public.recurring_templates(contact_id);
