import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto max-w-3xl px-6 pb-20 pt-28">
        <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 font-body text-sm text-muted-foreground">
          Last updated: March 2026
        </p>

        <div className="mt-10 space-y-10 font-body text-sm leading-relaxed text-foreground/80">
          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              What Information We Collect
            </h2>
            <p className="mt-3">
              When you create an account, we collect your email address and optional display name. As you use HomeLog, we store information you provide including:
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5">
              <li>Home address and property details (systems, components, ages)</li>
              <li>Maintenance records and service history</li>
              <li>Uploaded documents and photos (receipts, manuals, permits)</li>
              <li>Financial data (purchase price, improvement costs)</li>
              <li>Contractor contact information</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              How We Store Your Data
            </h2>
            <p className="mt-3">
              All data is stored in PostgreSQL databases with AES-256 encryption at rest. All data in transit is protected with TLS encryption. Row-level security policies ensure complete data isolation between users — your data is only accessible to you and anyone you explicitly share it with.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Third-Party Services
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                <strong>Cloud Infrastructure (Supabase)</strong> — Hosts our database, authentication, and file storage with SOC 2 Type 2 certified security.
              </li>
              <li>
                <strong>Stripe</strong> — Processes payments for Pro subscriptions. We never store your credit card numbers.
              </li>
              <li>
                <strong>Hosting</strong> — Our application is hosted on secure, modern hosting infrastructure.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Data Sharing
            </h2>
            <p className="mt-3">
              We never sell or share your personal data with advertisers or data brokers. Your data is only shared when you explicitly choose to:
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5">
              <li>Share your home with household members via granular role-based access (Viewer, Editor, or Admin)</li>
              <li>Transfer your home to a buyer, which you review and approve before it happens</li>
              <li>Invite a contractor to submit service records via a secure link</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Home Transfers
            </h2>
            <p className="mt-3">
              When you sell your home, you control exactly what transfers to the buyer. Maintenance history, service records, appliance manuals, warranties, and home component inventory transfer automatically. Your mortgage documents, insurance policies, tax records, utility bills with account numbers, and personal inventory items stay with you. You review and approve all transfers before they happen.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Data Retention
            </h2>
            <p className="mt-3">
              We retain your data for as long as your account is active. If you delete your account, all associated data — including properties, logs, documents, and uploaded files — will be permanently removed within 30 days.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Your Rights
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li><strong>Data Export</strong> — You can export all your data at any time from the dashboard.</li>
              <li><strong>Account Deletion</strong> — You may request full account and data deletion by contacting us.</li>
              <li><strong>Access & Correction</strong> — You can view and update all your personal information through your profile settings.</li>
              <li><strong>Information Request</strong> — You can request information about what data we hold about you.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Cookies
            </h2>
            <p className="mt-3">
              HomeLog uses essential cookies for authentication only. We do not use tracking cookies or analytics cookies. No third-party tracking is present on our platform.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Contact
            </h2>
            <p className="mt-3">
              If you have questions about this privacy policy or your data, contact us at{" "}
              <a href="mailto:support@homelogapp.com" className="font-medium text-accent underline underline-offset-2">
                support@homelogapp.com
              </a>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;
