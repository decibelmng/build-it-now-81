import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { Home, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReachableProperties } from "@/hooks/usePropertyFilter";
import { getPropertyDisplayName } from "@/lib/propertyDisplay";

const PortfolioRollup = lazy(() => import("@/components/dashboard/PortfolioRollup"));

const Portfolio = () => {
  const { data: properties = [], isLoading } = useReachableProperties();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-3xl font-semibold">Your portfolio</h1>
            <p className="text-muted-foreground font-body text-sm mt-1">
              A read-only view across every home you can reach.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/p/new"><Plus className="mr-2 h-4 w-4" /> Add a home</Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="h-24 rounded-lg bg-muted animate-pulse" />
        ) : properties.length === 0 ? (
          <div className="rounded-lg border border-border p-8 text-center">
            <Home className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
            <p className="font-body text-sm text-muted-foreground">You haven't added a home yet.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 mb-8 sm:grid-cols-2 lg:grid-cols-3">
              {properties.map((p) => (
                <Link
                  key={p.id}
                  to={`/p/${p.slug}`}
                  className="rounded-lg border border-border bg-card px-4 py-3 hover:border-accent transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-accent shrink-0" />
                    <span className="font-body font-medium truncate">{getPropertyDisplayName(p)}</span>
                  </div>
                </Link>
              ))}
            </div>
            <Suspense fallback={<div className="h-64 rounded-lg bg-muted animate-pulse" />}>
              <PortfolioRollup />
            </Suspense>
          </>
        )}
      </div>
    </div>
  );
};

export default Portfolio;
