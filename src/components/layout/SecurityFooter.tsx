import { Shield, Lock } from "lucide-react";

const SecurityFooter = () => {
  return (
    <div className="border-t border-border bg-muted/30 px-6 py-3">
      {/* Desktop */}
      <div className="hidden md:flex items-center justify-center gap-6">
        <div className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Your data is encrypted with AES-256 and protected by row-level security
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5 text-green-600" />
          <span className="text-xs text-muted-foreground">Secure connection</span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">SOC 2 Type 2 certified infrastructure</span>
        </div>
      </div>
      {/* Mobile */}
      <div className="flex flex-col items-center gap-1.5 md:hidden">
        <div className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Data encrypted &amp; protected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5 text-green-600" />
          <span className="text-xs text-muted-foreground">Secure connection</span>
        </div>
      </div>
    </div>
  );
};

export default SecurityFooter;
