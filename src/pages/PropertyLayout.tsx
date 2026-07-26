import { lazy, Suspense, useMemo } from "react";
import { Outlet, useParams, Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PropertyFilterProvider, useReachableProperties, type PropertyLite } from "@/hooks/usePropertyFilter";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import SecurityFooter from "@/components/layout/SecurityFooter";
import { Home, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { pathToSection, sectionToPath } from "@/lib/propertyRoutes";
import { useLocation } from "react-router-dom";

const SearchCommandPalette = lazy(() => import("@/components/dashboard/SearchCommandPalette"));

type Resolution =
  | { state: "resolving" }
  | { state: "ok"; property: PropertyLite; properties: PropertyLite[] }
  | { state: "not_found" }
  | { state: "no_access" };

function useResolvedProperty(slug: string | undefined): Resolution {
  const { user } = useAuth();
  const { data: properties, isLoading: listLoading } = useReachableProperties();

  const { data: exists, isLoading: existsLoading } = useQuery({
    queryKey: ["property_slug_exists", slug],
    enabled: !!slug && !!user,
    queryFn: async () => {
      // Bypasses RLS scope? No — this is still RLS-gated. So a non-null result here
      // means the row is reachable to this user. To distinguish not_found vs no_access,
      // we consult the reachable list first; if slug isn't in reachable, we assume no_access
      // rather than not_found unless we can prove otherwise. We deliberately do NOT probe
      // beyond the user's own scope for privacy.
      return null;
    },
  });

  if (!slug) return { state: "not_found" };
  if (listLoading || existsLoading) return { state: "resolving" };

  const list = properties ?? [];
  const match = list.find((p) => p.slug === slug);
  if (match) return { state: "ok", property: match, properties: list };

  // Slug not in reachable set. We treat this as "no_access" — the safe default per spec.
  // If the slug truly doesn't exist anywhere, no_access still gives the correct user experience.
  return { state: "no_access" };
}

const PropertyLayout = () => {
  const { slug } = useParams<{ slug: string }>();
  const resolution = useResolvedProperty(slug);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showWarning, resetTimer } = useSessionTimeout();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const [profile, setProfile] = useState<{ display_name: string | null } | null>(null);
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name").eq("user_id", user.id).single()
      .then(({ data }) => setProfile(data as any));
  }, [user?.id]);

  const activeSection = useMemo(() => pathToSection(location.pathname), [location.pathname]);

  const handleSignOut = useCallback(async () => { await signOut(); navigate("/"); }, [signOut, navigate]);

  const handleSectionChange = useCallback(
    (section: string) => {
      if (resolution.state !== "ok") return;
      navigate(sectionToPath(section, resolution.property.slug!));
    },
    [navigate, resolution]
  );

  if (resolution.state === "resolving") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-accent" />
      </div>
    );
  }

  if (resolution.state === "no_access") {
    return <Navigate to={`/no-access/${slug}`} replace />;
  }

  if (resolution.state === "not_found") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md text-center space-y-4">
          <Home className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="font-display text-2xl font-semibold">We couldn't find that home</h1>
          <p className="text-muted-foreground text-sm">The link may have been changed or removed.</p>
          <Button asChild><Link to="/portfolio">Back to your portfolio <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
        </div>
      </div>
    );
  }

  const { property, properties } = resolution;

  return (
    <PropertyFilterProvider property={property} properties={properties}>
      <div className="flex h-screen bg-background">
        <DashboardSidebar
          activeSection={activeSection as any}
          onSectionChange={handleSectionChange as any}
          onSignOut={handleSignOut}
          displayName={profile?.display_name ?? null}
          onOpenSearch={() => setSearchOpen(true)}
          onQuickAdd={() => handleSectionChange("maintenance")}
        />

        <main className="flex-1 overflow-y-auto pt-24 md:pt-0">
          {/* Sanctioned remount on property switch: forces a clean subtree so no
              stale local component state can leak from the previous property. */}
          <div key={property.id} className="mx-auto max-w-5xl px-3 py-4 sm:px-8 sm:py-8">
            <Suspense fallback={<div className="p-8"><div className="h-8 w-48 rounded bg-muted animate-pulse mb-4" /><div className="h-64 rounded bg-muted animate-pulse" /></div>}>
              <Outlet />
            </Suspense>
          </div>
          <SecurityFooter />
        </main>

        <Suspense fallback={null}>
          <SearchCommandPalette
            open={searchOpen}
            onOpenChange={setSearchOpen}
            onNavigate={(section: string) => { setSearchOpen(false); handleSectionChange(section); }}
          />
        </Suspense>

        <Dialog open={showWarning} onOpenChange={(open) => { if (!open) resetTimer(); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Session expiring soon</DialogTitle>
              <DialogDescription>
                You've been inactive for 25 minutes. Your session will expire in 5 minutes for security.
              </DialogDescription>
            </DialogHeader>
            <Button className="w-full" onClick={resetTimer}>Continue session</Button>
          </DialogContent>
        </Dialog>
      </div>
    </PropertyFilterProvider>
  );
};

export default PropertyLayout;
