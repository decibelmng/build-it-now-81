import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const ProfileSettings = lazy(() => import("@/components/dashboard/ProfileSettings"));
const ExportReports = lazy(() => import("@/components/dashboard/ExportReports"));

const Fallback = () => <div className="h-64 rounded-lg bg-muted animate-pulse" />;

const Account = () => (
  <div className="min-h-screen bg-background">
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8 space-y-10">
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/portfolio"><ArrowLeft className="mr-2 h-4 w-4" /> Back to portfolio</Link>
        </Button>
      </div>

      <section>
        <Suspense fallback={<Fallback />}>
          <ProfileSettings />
        </Suspense>
      </section>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <Download className="h-5 w-5 text-accent" />
          <h2 className="font-display text-xl font-semibold">Data export</h2>
        </div>
        <Suspense fallback={<Fallback />}>
          <ExportReports />
        </Suspense>
      </section>
    </div>
  </div>
);

export default Account;
