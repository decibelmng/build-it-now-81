import { lazy, Suspense } from "react";
import { Zap, RefreshCw } from "lucide-react";

const PropertyUtilities = lazy(() => import("@/components/dashboard/PropertyUtilities"));
const RecurringTemplates = lazy(() => import("@/components/dashboard/RecurringTemplates"));

const Fallback = () => <div className="h-32 rounded-lg bg-muted animate-pulse" />;

const MoneyBills = () => (
  <div className="space-y-10">
    <section>
      <div className="mb-4 flex items-center gap-2">
        <Zap className="h-5 w-5 text-accent" />
        <h2 className="font-display text-xl font-semibold">Accounts &amp; Utilities</h2>
      </div>
      <Suspense fallback={<Fallback />}>
        <PropertyUtilities />
      </Suspense>
    </section>

    <section>
      <div className="mb-4 flex items-center gap-2">
        <RefreshCw className="h-5 w-5 text-accent" />
        <h2 className="font-display text-xl font-semibold">Recurring bills &amp; tasks</h2>
      </div>
      <Suspense fallback={<Fallback />}>
        <RecurringTemplates />
      </Suspense>
    </section>
  </div>
);

export default MoneyBills;
