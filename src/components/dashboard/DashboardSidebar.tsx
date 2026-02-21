import { Home, Wrench, FileText, TrendingUp, Users, LogOut, Menu, Clock, Settings, Search, LayoutDashboard, RefreshCw, Share2, Download, BarChart3, Map } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useState } from "react";

type Section = "overview" | "properties" | "map" | "maintenance" | "documents" | "savings" | "contacts" | "timeline" | "recurring" | "sharing" | "export" | "analytics" | "settings" | "search";

interface DashboardSidebarProps {
  activeSection: Section;
  onSectionChange: (section: Section) => void;
  onSignOut: () => void;
  displayName: string | null;
}

const navItems: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "properties", label: "Properties", icon: Home },
  { id: "map", label: "Map", icon: Map },
  { id: "maintenance", label: "Maintenance", icon: Wrench },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "savings", label: "Savings", icon: TrendingUp },
  { id: "contacts", label: "Contacts", icon: Users },
  { id: "timeline", label: "Timeline", icon: Clock },
  { id: "recurring", label: "Recurring", icon: RefreshCw },
  { id: "sharing", label: "Sharing", icon: Share2 },
  { id: "export", label: "Export", icon: Download },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "search", label: "Search", icon: Search },
];

const SidebarContent = ({
  activeSection,
  onSectionChange,
  onSignOut,
  displayName,
}: DashboardSidebarProps) => (
  <div className="flex h-full flex-col">
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
      <button
        onClick={() => onSectionChange("settings")}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 font-body text-sm font-medium transition-colors mb-2",
          activeSection === "settings"
            ? "bg-accent/10 text-accent"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        )}
      >
        <Settings className="h-4 w-4" />
        Settings
      </button>
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
  </div>
);

const DashboardSidebar = (props: DashboardSidebarProps) => {
  const [open, setOpen] = useState(false);

  const handleSectionChange = (section: Section) => {
    props.onSectionChange(section);
    setOpen(false);
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden h-full w-64 flex-col border-r border-border bg-card md:flex">
        <SidebarContent {...props} />
      </aside>

      {/* Mobile header bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-border bg-card px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <Home className="h-5 w-5 text-accent" />
          <span className="font-display text-lg font-bold">HomeLog</span>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SidebarContent {...props} onSectionChange={handleSectionChange} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
};

export default DashboardSidebar;
