import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useDefaultContractorLink = (propertyId: string | undefined) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: defaultLink, isLoading } = useQuery({
    queryKey: ["default_contractor_link", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_access_links")
        .select("*")
        .eq("property_id", propertyId!)
        .eq("is_default", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!propertyId,
  });

  const createDefault = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("contractor_access_links")
        .insert({
          property_id: propertyId!,
          user_id: user!.id,
          is_default: true,
          is_active: true,
          expires_at: null,
          label: null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["default_contractor_link", propertyId] });
    },
  });

  // Auto-create if missing
  const shouldCreate = !isLoading && !defaultLink && !!propertyId && !!user && !createDefault.isPending;

  return {
    defaultLink,
    isLoading,
    ensureDefault: () => {
      if (shouldCreate) createDefault.mutate();
    },
    linkUrl: defaultLink ? `${window.location.origin}/service-log/${defaultLink.token}` : null,
  };
};
