import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto max-w-3xl px-6 pb-20 pt-28">
        <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">
          Terms of Service
        </h1>
        <p className="mt-2 font-body text-sm text-muted-foreground">
          Last updated: March 7, 2026
        </p>

        <div className="mt-10 space-y-10 font-body text-sm leading-relaxed text-foreground/80">
          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Service Description
            </h2>
            <p className="mt-3">
              HomeLog is a digital home management platform that helps homeowners track property improvements, organize documentation, manage maintenance schedules, and generate tax-related reports. The service is available in free and paid tiers.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              User Accounts
            </h2>
            <p className="mt-3">
              You must create an account to use HomeLog. You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account. You must provide accurate, current information and promptly update it if it changes.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Acceptable Use
            </h2>
            <p className="mt-3">
              You agree to use HomeLog only for lawful purposes related to home management. You may not: upload malicious files, attempt to access other users' data, reverse-engineer the platform, or use the service for any purpose other than managing your own property information.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Intellectual Property
            </h2>
            <p className="mt-3">
              You retain ownership of all data and files you upload to HomeLog. By using the service, you grant HomeLog a limited license to store, process, and display your content solely for the purpose of providing the service. HomeLog's branding, design, and code are the intellectual property of HomeLog and may not be copied or reused without permission.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Limitation of Liability
            </h2>
            <p className="mt-3">
              HomeLog is provided "as is" without warranty of any kind. HomeLog is not a licensed financial advisor, tax professional, or legal counsel. Tax reports and savings forecasts are informational tools and should not be considered professional advice. Always consult a qualified tax professional before making financial decisions. HomeLog shall not be liable for any indirect, incidental, or consequential damages arising from your use of the service.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Termination
            </h2>
            <p className="mt-3">
              You may terminate your account at any time by contacting support. HomeLog reserves the right to suspend or terminate accounts that violate these terms. Upon termination, your data will be deleted in accordance with our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Governing Law
            </h2>
            <p className="mt-3">
              These terms are governed by and construed in accordance with the laws of the United States. Any disputes shall be resolved in the courts of the state in which HomeLog is incorporated.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Contact
            </h2>
            <p className="mt-3">
              Questions about these terms? Contact us at{" "}
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

export default Terms;
