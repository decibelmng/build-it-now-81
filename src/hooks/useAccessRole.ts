import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export type AccessRole = "owner" | "editor" | "viewer" | null;

/**
 * Single-property role hook.
 */
export function useAccessRole(propertyId: string | null | undefined) {
  const { rolesByProperty, isLoading } = usePropertyRoles();
  const role: AccessRole = propertyId ? rolesByProperty[propertyId] ?? null : null;
  return {
    role,
    isOwner: role === "owner",
    isEditor: role === "editor",
    isViewer: role === "viewer",
    canEdit: role === "owner" || role === "editor",
    canManageOwnerOnly: role === "owner",
    isLoading,
  };
}

/**
 * Bulk hook: returns a map of propertyId -> role for the current user.
 * Cached across the app so per-row calls are cheap.
 */
export function usePropertyRoles() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["property_roles", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const out: Record<string, AccessRole> = {};
      if (!user) return out;

      const [{ data: owned }, { data: shares }] = await Promise.all([
        supabase.from("properties").select("id").eq("user_id", user.id),
        supabase
          .from("property_shares")
          .select("property_id,permission,status")
          .eq("shared_with_user_id", user.id)
          .eq("status", "accepted"),
      ]);
      (owned ?? []).forEach((p) => { out[p.id] = "owner"; });
      (shares ?? []).forEach((s: any) => {
        if (out[s.property_id] === "owner") return;
        out[s.property_id] = s.permission === "editor" ? "editor" : "viewer";
      });
      return out;
    },
  });

  return {
    rolesByProperty: query.data ?? {},
    isLoading: query.isLoading,
  };
}

/**
 * True if the current user can edit AT LEAST ONE property (owner or editor).
 * Use to gate global "Add" buttons in sections that span multiple properties.
 */
export function useCanEditAnyProperty(): boolean {
  const { rolesByProperty } = usePropertyRoles();
  return Object.values(rolesByProperty).some((r) => r === "owner" || r === "editor");
}
