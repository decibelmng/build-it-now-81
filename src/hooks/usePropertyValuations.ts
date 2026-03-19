import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export interface PropertyValuation {
  id: string;
  property_id: string;
  user_id: string;
  valuation_type: string;
  valuation_date: string;
  value: number;
  source: string | null;
  notes: string | null;
  document_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export function usePropertyValuations(propertyId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["property_valuations", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_valuations")
        .select("*")
        .eq("property_id", propertyId!)
        .order("valuation_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PropertyValuation[];
    },
    enabled: !!user && !!propertyId,
  });
}

export function useAddValuation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (vals: {
      property_id: string;
      valuation_type: string;
      valuation_date: string;
      value: number;
      source?: string | null;
      notes?: string | null;
      document_id?: string | null;
    }) => {
      const { error } = await supabase.from("property_valuations").insert({
        ...vals,
        user_id: user!.id,
        source: vals.source || null,
        notes: vals.notes || null,
        document_id: vals.document_id || null,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["property_valuations", vars.property_id] });
      queryClient.invalidateQueries({ queryKey: ["property_equity_summary"] });
      toast({ title: "Valuation added" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function useUpdateValuation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, propertyId, ...updates }: {
      id: string;
      propertyId: string;
      valuation_type?: string;
      valuation_date?: string;
      value?: number;
      source?: string | null;
      notes?: string | null;
      document_id?: string | null;
    }) => {
      const { error } = await supabase
        .from("property_valuations")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
      return propertyId;
    },
    onSuccess: (propertyId) => {
      queryClient.invalidateQueries({ queryKey: ["property_valuations", propertyId] });
      queryClient.invalidateQueries({ queryKey: ["property_equity_summary"] });
      toast({ title: "Valuation updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function useDeleteValuation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, propertyId }: { id: string; propertyId: string }) => {
      const { error } = await supabase
        .from("property_valuations")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return propertyId;
    },
    onSuccess: (propertyId) => {
      queryClient.invalidateQueries({ queryKey: ["property_valuations", propertyId] });
      queryClient.invalidateQueries({ queryKey: ["property_equity_summary"] });
      toast({ title: "Valuation deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}
