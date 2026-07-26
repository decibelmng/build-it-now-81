import { Link, useParams } from "react-router-dom";
import { Home, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const NoAccess = () => {
  const { slug } = useParams<{ slug: string }>();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md text-center space-y-4">
        <Home className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="font-display text-2xl font-semibold">You don't have access to this home</h1>
        <p className="text-muted-foreground font-body text-sm">
          The link{slug ? ` for "${slug}"` : ""} either doesn't exist for your account, or the owner
          hasn't shared it with you. Ask them to invite you from their sharing settings.
        </p>
        <Button asChild>
          <Link to="/portfolio">Back to your portfolio <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </div>
    </div>
  );
};

export default NoAccess;
