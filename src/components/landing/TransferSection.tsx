import { CheckCircle, Lock, Eye } from "lucide-react";

const transfers = [
  "Maintenance history & service records",
  "Home inspection reports",
  "Appliance & system manuals",
  "Warranties & permits",
  "Contractor invoices & improvement receipts",
  "Home component inventory",
];

const stays = [
  "Mortgage & closing documents",
  "Insurance policies & claims",
  "Tax records & property tax bills",
  "Utility bills with account numbers",
  "Personal inventory items (furniture, etc.)",
];

const TransferSection = () => {
  return (
    <section className="py-20 md:py-24">
      <div className="container mx-auto px-6">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <h2 className="mb-4 font-display text-3xl font-bold text-foreground md:text-4xl lg:text-5xl">
            Sell Your Home with Confidence
          </h2>
          <p className="font-body text-base leading-relaxed text-muted-foreground md:text-lg">
            When you sell, HomeLog gives you complete control over what the buyer
            receives. Your personal financial data never transfers without your
            explicit approval.
          </p>
        </div>

        <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
          {/* Transfers */}
          <div className="rounded-2xl border border-border bg-card p-8">
            <h3 className="mb-6 font-display text-lg font-semibold text-foreground">
              Transfers with Your Home
            </h3>
            <ul className="space-y-3">
              {transfers.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                  <span className="font-body text-sm leading-relaxed text-foreground">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-6 font-body text-xs text-muted-foreground">
              Everything a new owner needs to care for the home.
            </p>
          </div>

          {/* Stays */}
          <div className="rounded-2xl border border-border bg-card p-8">
            <h3 className="mb-6 font-display text-lg font-semibold text-foreground">
              Stays with You
            </h3>
            <ul className="space-y-3">
              {stays.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <Lock className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                  <span className="font-body text-sm leading-relaxed text-foreground">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-6 font-body text-xs text-muted-foreground">
              Your financial and personal documents never leave your account.
            </p>
          </div>
        </div>

        {/* Callout */}
        <div className="mx-auto mt-8 max-w-4xl rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <Eye className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="font-body text-sm leading-relaxed text-foreground">
              You review everything before it transfers. Documents in gray areas
              like deeds and appraisals? You decide on a case-by-case basis.
              Nothing leaves your account without your explicit approval.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TransferSection;
