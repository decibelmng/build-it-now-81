import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePropertyFilter } from "@/hooks/usePropertyFilter";
import HomeSystemsSettings from "@/components/dashboard/HomeSystemsSettings";

/**
 * Route wrapper: pulls the current property from context and its systems registry
 * from the database, then hands them to the existing HomeSystemsSettings component.
 */
const HomeSystemsRoute = () => {
  const { activeProperty } = usePropertyFilter();
  const propertyId = activeProperty?.id ?? "";

  const { data, isLoading } = useQuery({
    queryKey: ["property_systems_settings", propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, property_type, home_systems, registry_completed, bathrooms, residency_type")
        .eq("id", propertyId)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  if (!propertyId || isLoading || !data) {
    return <div className="h-64 rounded-lg bg-muted animate-pulse" />;
  }

  return (
    <HomeSystemsSettings
      propertyId={data.id}
      propertyType={data.property_type ?? "single_family"}
      homeSystems={data.home_systems ?? null}
      registryCompleted={!!data.registry_completed}
      bathroomCount={data.bathrooms ?? 2}
      residencyType={data.residency_type ?? undefined}
    />
  );
};

export default HomeSystemsRoute;
