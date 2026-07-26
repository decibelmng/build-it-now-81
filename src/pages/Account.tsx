import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const ProfileSettings = lazy(() => import("@/components/dashboard/ProfileSettings"));

const Account = () => (
  <div className="min-h-screen bg-background">
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/portfolio"><ArrowLeft className="mr-2 h-4 w-4" /> Back to portfolio</Link>
        </Button>
      </div>
      <Suspense fallback={<div className="h-64 rounded-lg bg-muted animate-pulse" />}>
        <ProfileSettings />
      </Suspense>
    </div>
  </div>
);

export default Account;
