import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useReachableProperties } from "@/hooks/useCurrentProperty";
import { LAST_SLUG_KEY } from "@/lib/propertyRoutes";

/**
 * Root redirect used both at "/" (when signed in) and by LegacyRedirect.
 * - stored last slug (if it validates)
 * - else if user reaches exactly one property, that property
 * - else /portfolio
 * - if user reaches zero properties, /portfolio (which surfaces the add-a-home flow)
 */
const RootRedirect = ({ subpath }: { subpath?: string }) => {
  const { user, loading } = useAuth();
  const { data: properties, isLoading } = useReachableProperties();

  if (loading || (!!user && isLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-accent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const list = properties ?? [];
  let stored: string | null = null;
  try { stored = localStorage.getItem(LAST_SLUG_KEY); } catch {}
  const storedProperty = stored ? list.find((p) => p.slug === stored) : null;

  if (!storedProperty && stored) {
    try { localStorage.removeItem(LAST_SLUG_KEY); } catch {}
  }

  if (list.length === 0) return <Navigate to="/p/new" replace />;

  const target = storedProperty ?? (list.length === 1 ? list[0] : null);

  if (target?.slug) {
    const sub = subpath ? `/${subpath.replace(/^\/+/, "")}` : "";
    return <Navigate to={`/p/${target.slug}${sub}`} replace />;
  }

  return <Navigate to="/portfolio" replace />;
};

export default RootRedirect;
