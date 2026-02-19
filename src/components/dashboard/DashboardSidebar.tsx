import { Home, Wrench, FileText, Settings, LogOut, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Section = "properties" | "maintenance" | "documents";

interface DashboardSidebarProps {
  activeSection: Section;
  onSectionChange: (section: Section) => void;
  onSignOut: () => void;
  displayName: string | null;
}

const navItems: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "properties", label: "Properties", icon: Home },
  { id: "maintenance", label: "Maintenance", icon: Wrench },
  { id: "documents", label: "Documents", icon: FileText },
];

const DashboardSidebar = ({ activeSection, onSectionChange, onSignOut, displayName }: DashboardSidebarProps) => {
  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-6 py-5">
        <Home className="h-6 w-6 text-accent" />
        <span className="font-display text-xl font-bold">HomeLog</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onSectionChange(item.id)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 font-body text-sm font-medium transition-colors",
              activeSection === item.id
                ? "bg-accent/10 text-accent"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="border-t border-border px-3 py-4">
        <div className="mb-3 px-3">
          <p className="font-body text-sm font-medium text-foreground truncate">{displayName}</p>
          <p className="font-body text-xs text-muted-foreground">Homeowner</p>
        </div>
        <button
          onClick={onSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 font-body text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
