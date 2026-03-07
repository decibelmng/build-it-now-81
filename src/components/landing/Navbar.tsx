import { Home } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const useScrollToSection = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (id: string) => {
    if (location.pathname !== "/") {
      navigate("/#" + id);
    } else {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };
};

const Navbar = () => {
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-primary-foreground/10 bg-primary/80 backdrop-blur-md">
      <div className="container mx-auto flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <Home className="h-6 w-6 text-accent" />
          <span className="font-display text-xl font-bold text-primary-foreground">
            HomeLog
          </span>
        </div>

        <div className="hidden items-center gap-8 font-body text-sm text-primary-foreground/70 md:flex">
          <button onClick={() => scrollTo("features")} className="transition-colors hover:text-primary-foreground">
            Features
          </button>
          <button onClick={() => scrollTo("how-it-works")} className="transition-colors hover:text-primary-foreground">
            How It Works
          </button>
          <button onClick={() => scrollTo("pricing")} className="transition-colors hover:text-primary-foreground">
            Pricing
          </button>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/auth?mode=login"
            className="font-body text-sm font-medium text-primary-foreground/80 transition-colors hover:text-primary-foreground"
          >
            Log In
          </Link>
          <Link
            to="/auth?mode=signup"
            className="rounded-full bg-accent px-5 py-2 font-body text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
          >
            Get Started Free
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
