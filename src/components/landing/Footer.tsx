import { Home } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-primary py-16">
      <div className="container mx-auto px-6">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-accent" />
            <span className="font-display text-lg font-bold text-primary-foreground">
              HomeLog
            </span>
          </div>
          <p className="max-w-md font-body text-sm text-primary-foreground/50">
            HomeLog helps homeowners track investments, organize documentation,
            and save on taxes when they sell.
          </p>
          <div className="flex gap-8 font-body text-sm text-primary-foreground/40">
            <Link to="/privacy" className="transition-colors hover:text-primary-foreground/70">Privacy</Link>
            <Link to="/terms" className="transition-colors hover:text-primary-foreground/70">Terms</Link>
            <Link to="/contact" className="transition-colors hover:text-primary-foreground/70">Contact</Link>
          </div>
          <p className="font-body text-xs text-primary-foreground/30">
            © {new Date().getFullYear()} HomeLog. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
