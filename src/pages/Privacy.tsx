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
          Last updated: March 7, 2026
        </p>

        <div className="mt-10 space-y-10 font-body text-sm leading-relaxed text-foreground/80">
          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              What Data We Collect
            </h2>
            <p className="mt-3">
              When you create an account, we collect your email address and optional display name. As you use HomeLog, we store information you provide about your properties, maintenance logs, home inventory items, documents, contacts, and financial data such as purchase prices and improvement costs. We also store files you upload, including receipts, photos, and documents.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              How We Store Your Data
            </h2>
            <p className="mt-3">
              All data is stored securely using industry-standard encryption. Data at rest is encrypted using AES-256 encryption, and all data in transit is protected with TLS 1.2+. Your uploaded files are stored in secure, access-controlled cloud storage with row-level security ensuring only you can access your data.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Third-Party Services
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                <strong>Stripe</strong> — Processes payments for Pro subscriptions. We never store your credit card information directly.
              </li>
              <li>
                <strong>Cloud Infrastructure</strong> — Hosts our database, authentication, and file storage with enterprise-grade security.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Data Retention
            </h2>
            <p className="mt-3">
              We retain your data for as long as your account is active. If you delete your account, all associated data — including properties, logs, documents, and uploaded files — will be permanently deleted within 30 days.
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
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Cookies
            </h2>
            <p className="mt-3">
              HomeLog does not use third-party tracking cookies. We use only essential session cookies required for authentication and keeping you logged in.
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
