import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export type AccessRole = "owner" | "editor" | "viewer" | null;

/**
 * Returns the current user's access role for a specific property:
 *  - 'owner'  → they own it
 *  - 'editor' → accepted share with permission='editor'
 *  - 'viewer' → accepted share with permission='viewer'
 *  - null     → no access / not loaded
 */
export function useAccessRole(propertyId: string | null | undefined) {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["access_role", user?.id, propertyId],
    enabled: !!user && !!propertyId,
    queryFn: async (): Promise<AccessRole> => {
      if (!user || !propertyId) return null;

      const { data: owned } = await supabase
        .from("properties")
        .select("id")
        .eq("id", propertyId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (owned) return "owner";

      const { data: share } = await supabase
        .from("property_shares")
        .select("permission,status")
        .eq("property_id", propertyId)
        .eq("shared_with_user_id", user.id)
        .eq("status", "accepted")
        .maybeSingle();

      if (!share) return null;
      return share.permission === "editor" ? "editor" : "viewer";
    },
  });

  const role: AccessRole = query.data ?? null;
  return {
    role,
    isOwner: role === "owner",
    isEditor: role === "editor",
    isViewer: role === "viewer",
    canEdit: role === "owner" || role === "editor",
    canManageOwnerOnly: role === "owner",
    isLoading: query.isLoading,
  };
}
