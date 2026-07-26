import { lazy, Suspense } from "react";
import { Link2, ClipboardList } from "lucide-react";

const ContractorLinks = lazy(() => import("@/components/dashboard/ContractorLinks"));
const ContractorSubmissions = lazy(() => import("@/components/dashboard/ContractorSubmissions"));

const Fallback = () => <div className="h-32 rounded-lg bg-muted animate-pulse" />;

const ActivityContractors = () => (
  <div className="space-y-10">
    <section>
      <div className="mb-4 flex items-center gap-2">
        <Link2 className="h-5 w-5 text-accent" />
        <h2 className="font-display text-xl font-semibold">Contractor share links</h2>
      </div>
      <Suspense fallback={<Fallback />}>
        <ContractorLinks />
      </Suspense>
    </section>

    <section>
      <div className="mb-4 flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-accent" />
        <h2 className="font-display text-xl font-semibold">Submissions to review</h2>
      </div>
      <Suspense fallback={<Fallback />}>
        <ContractorSubmissions />
      </Suspense>
    </section>
  </div>
);

export default ActivityContractors;
