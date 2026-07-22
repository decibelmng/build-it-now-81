import { Home, Wrench, FileText, TrendingUp, Users, LogOut, Menu, Clock, Settings, Search, LayoutDashboard, RefreshCw, BarChart3, Zap, Lock, Link2, ClipboardList, Receipt, Plus, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";
import { useSubscription, isProFeature } from "@/hooks/useSubscription";

type Section = "overview" | "properties" | "home-inventory" | "maintenance" | "documents" | "savings" | "tax-investment" | "contacts" | "utilities" | "timeline" | "recurring" | "sharing" | "export" | "analytics" | "settings" | "search" | "contractor-links" | "contractor-submissions";

interface DashboardSidebarProps {
  activeSection: Section;
  onSectionChange: (section: Section) => void;
  onSignOut: () => void;
  displayName: string | null;
  onOpenSearch?: () => void;
  onQuickAdd?: () => void;
}

const navGroups = [
  {
    label: "Dashboard",
    items: [
      { id: "overview" as Section, label: "Overview", icon: LayoutDashboard },
    ],
  },
  {
    label: "Property",
    items: [
      { id: "properties" as Section, label: "My Home", icon: Home },
      { id: "home-inventory" as Section, label: "Home Inventory", icon: ClipboardList },
      { id: "maintenance" as Section, label: "Maintenance", icon: Wrench },
      { id: "documents" as Section, label: "Documents", icon: FileText },
      { id: "timeline" as Section, label: "Timeline", icon: Clock },
    ],
  },
  {
    label: "Financial",
    items: [
      { id: "savings" as Section, label: "Savings Forecast", icon: Shield },
      { id: "tax-investment" as Section, label: "Tax & Investment", icon: Receipt },
      { id: "utilities" as Section, label: "Accounts & Utilities", icon: Zap },
    ],
  },
  {
    label: "People",
    items: [
      { id: "contacts" as Section, label: "Contacts", icon: Users },
      { id: "contractor-links" as Section, label: "Contractors", icon: Link2 },
    ],
  },
  {
    label: "Tools",
    items: [
      { id: "recurring" as Section, label: "Recurring", icon: RefreshCw },
      { id: "analytics" as Section, label: "Analytics", icon: BarChart3 },
    ],
  },
];

const sectionLabels: Record<string, string> = {
  overview: "Overview",
  properties: "My Home",
  "home-inventory": "Home Inventory",
  maintenance: "Maintenance",
  documents: "Documents",
  savings: "Savings Forecast",
  "tax-investment": "Tax & Investment",
  contacts: "Contacts",
  utilities: "Accounts & Utilities",
  timeline: "Timeline",
  recurring: "Recurring",
  sharing: "Sharing",
  export: "Export",
  analytics: "Analytics",
  settings: "Settings",
  search: "Search",
  "contractor-links": "Contractors",
  "contractor-submissions": "Contractor Reviews",
};

const SidebarNav = ({
  activeSection,
  onSectionChange,
  onSignOut,
  displayName,
  onOpenSearch,
}: DashboardSidebarProps) => {
  const { tier } = useSubscription();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-6 py-5">
        <Home className="h-6 w-6 text-accent" />
        <span className="font-display text-xl font-bold">HomeLog</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-3">
            <p className="mb-1 px-3 font-body text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">
              {group.label}
            </p>
            {group.items.map((item) => {
              const locked = tier === "free" && isProFeature(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => onSectionChange(item.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 font-body text-sm font-medium transition-colors",
                    activeSection === item.id
                      ? "bg-accent/10 text-accent"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                  {locked && <Lock className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-border px-3 py-3">
        {/* Search shortcut */}
        <button
          onClick={onOpenSearch}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 font-body text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground mb-1"
        >
          <Search className="h-4 w-4" />
          <span>Search</span>
          <kbd className="ml-auto hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
            ⌘K
          </kbd>
        </button>

        <button
          onClick={() => onSectionChange("settings")}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 font-body text-sm font-medium transition-colors mb-2",
            activeSection === "settings"
              ? "bg-accent/10 text-accent"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </button>
        <div className="mb-2 px-3">
          <p className="font-body text-sm font-medium text-foreground truncate">{displayName}</p>
          <p className="font-body text-xs text-muted-foreground">Homeowner</p>
        </div>
        <button
          onClick={onSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 font-body text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
};

const DashboardSidebar = (props: DashboardSidebarProps) => {
  const [open, setOpen] = useState(false);

  const handleSectionChange = (section: Section) => {
    props.onSectionChange(section);
    setOpen(false);
  };

  const sectionTitle = sectionLabels[props.activeSection] || "Dashboard";

  // Show FAB on overview, maintenance, timeline
  const showFab = ["overview", "maintenance", "timeline"].includes(props.activeSection);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-border bg-card md:flex">
        <SidebarNav {...props} />
      </aside>

      {/* Mobile header bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-border bg-card px-4 py-3 md:hidden">
        <div className="flex items-center gap-2 min-w-0">
          <Home className="h-5 w-5 text-accent shrink-0" />
          <span className="font-display text-lg font-bold shrink-0">HomeLog</span>
          <span className="text-muted-foreground mx-1 shrink-0">›</span>
          <span className="font-body text-sm text-muted-foreground truncate">{sectionTitle}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={props.onOpenSearch}>
            <Search className="h-4 w-4" />
          </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SidebarNav {...props} onSectionChange={handleSectionChange} />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Mobile FAB - Quick Add Maintenance */}
      {showFab && (
        <button
          onClick={props.onQuickAdd}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg hover:bg-accent/90 transition-colors md:hidden"
          aria-label="Add maintenance log"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}
    </>
  );
};

export { sectionLabels };
export default DashboardSidebar;
