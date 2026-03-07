import { useState } from "react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Send } from "lucide-react";

const Contact = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`HomeLog Contact: ${name}`);
    const body = encodeURIComponent(`From: ${name} (${email})\n\n${message}`);
    window.location.href = `mailto:support@homelogapp.com?subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto max-w-xl px-6 pb-20 pt-28">
        <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">
          Contact Us
        </h1>
        <p className="mt-3 font-body text-muted-foreground">
          Have a question, suggestion, or need help? We'd love to hear from you.
        </p>

        <div className="mt-8 flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <Mail className="h-5 w-5 text-accent" />
          <div>
            <p className="font-body text-sm font-medium text-foreground">Email us directly</p>
            <a
              href="mailto:support@homelogapp.com"
              className="font-body text-sm text-accent underline underline-offset-2"
            >
              support@homelogapp.com
            </a>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name" className="font-body text-sm">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="font-body text-sm">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message" className="font-body text-sm">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="How can we help?"
              rows={5}
              required
            />
          </div>
          <Button type="submit" className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90">
            <Send className="mr-2 h-4 w-4" />
            Send Message
          </Button>
        </form>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
