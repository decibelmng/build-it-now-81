import { Shield, Lock, UserCheck, FileCheck, Server, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const cards = [
  {
    icon: Shield,
    title: "Bank-Level Encryption",
    body: "All data is encrypted in transit with TLS 1.3 and at rest with AES-256 encryption. Your home details, documents, and financial information are never stored in plain text.",
  },
  {
    icon: Lock,
    title: "Row-Level Access Control",
    body: "Every database query is filtered by your identity. Even if someone accessed our database directly, they could only see their own data. Your neighbor can't see your records, period.",
  },
  {
    icon: UserCheck,
    title: "You Control Who Sees What",
    body: "Share your home with household members or contractors with granular roles: Viewer, Editor, or Admin. Revoke access anytime. Contractors can submit service records without ever creating an account or seeing your data.",
  },
  {
    icon: FileCheck,
    title: "Smart Transfer Privacy",
    body: "When you sell your home, you decide exactly what transfers to the buyer. Maintenance history and manuals transfer automatically. Your mortgage docs, insurance policies, and tax records stay with you. You review everything before it's sent.",
  },
  {
    icon: Server,
    title: "SOC 2 Certified Infrastructure",
    body: "HomeLog is built on a SOC 2 Type 2 certified platform with continuous security monitoring, third-party audits, and an active vulnerability disclosure program.",
  },
  {
    icon: Eye,
    title: "No Data Selling. Ever.",
    body: "We will never sell, share, or monetize your personal home data. Your information exists to serve you, not advertisers. Our business model is subscriptions, not your data.",
  },
];

const badges = [
  "256-bit SSL",
  "SOC 2 Type 2",
  "GDPR Ready",
  "99.9% Uptime",
];

const SecuritySection = () => {
  return (
    <section className="bg-muted/50 py-20 md:py-24">
      <div className="container mx-auto px-6">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <h2 className="mb-4 font-display text-3xl font-bold text-foreground md:text-4xl lg:text-5xl">
            Your Home Data, Locked Down
          </h2>
          <p className="font-body text-base leading-relaxed text-muted-foreground md:text-lg">
            HomeLog was built from the ground up to protect your most sensitive
            information. Here's how we keep your data safe.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <Card
              key={card.title}
              className="border-border bg-card transition-shadow hover:shadow-md"
            >
              <CardContent className="p-6">
                <card.icon className="mb-4 h-8 w-8 text-primary" />
                <h3 className="mb-2 font-display text-lg font-semibold text-foreground">
                  {card.title}
                </h3>
                <p className="font-body text-sm leading-relaxed text-muted-foreground">
                  {card.body}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mx-auto mt-12 flex flex-wrap items-center justify-center gap-6">
          {badges.map((badge) => (
            <span
              key={badge}
              className="font-body text-xs font-medium text-muted-foreground"
            >
              {badge}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SecuritySection;
