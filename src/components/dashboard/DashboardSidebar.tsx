import { Home, Wrench, FileText, Users, LogOut, Settings, Search, LayoutDashboard, ClipboardList, Receipt, Shield, Lock, Link2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSubscription, isProFeature } from "@/hooks/useSubscription";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import PropertySwitcher from "@/components/property/PropertySwitcher";

type Section =
  | "overview" | "properties" | "home-inventory" | "home-systems" | "contacts"
  | "maintenance" | "timeline" | "contractor-links"
  | "savings" | "equity" | "basis" | "tax-investment" | "bills"
  | "documents" | "sharing" | "settings" | "search";

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
    label: "Home",
    items: [
      { id: "properties" as Section, label: "Details", icon: Home },
      { id: "home-systems" as Section, label: "Systems", icon: Wrench },
      { id: "home-inventory" as Section, label: "Inventory", icon: ClipboardList },
      { id: "contacts" as Section, label: "Contacts", icon: Users },
    ],
  },
  {
    label: "Activity",
    items: [
      { id: "maintenance" as Section, label: "Log", icon: Wrench },
      { id: "timeline" as Section, label: "Timeline", icon: FileText },
      { id: "contractor-links" as Section, label: "Contractors", icon: Link2 },
    ],
  },
  {
    label: "Money",
    items: [
      { id: "savings" as Section, label: "Forecast", icon: Shield },
      { id: "equity" as Section, label: "Equity", icon: Receipt },
      { id: "basis" as Section, label: "Cost Basis", icon: Receipt },
      { id: "tax-investment" as Section, label: "Tax", icon: Receipt },
      { id: "bills" as Section, label: "Bills", icon: Receipt },
    ],
  },
  {
    label: "More",
    items: [
      { id: "documents" as Section, label: "Documents", icon: FileText },
      { id: "sharing" as Section, label: "Sharing", icon: Users },
    ],
  },
];

const sectionLabels: Record<string, string> = {
  overview: "Overview",
  properties: "Details",
  "home-inventory": "Inventory",
  "home-systems": "Systems",
  contacts: "Contacts",
  maintenance: "Activity log",
  timeline: "Timeline",
  "contractor-links": "Contractors",
  savings: "Savings Forecast",
  equity: "Home Value & Equity",
  basis: "Cost Basis",
  "tax-investment": "Tax Package",
  bills: "Bills",
  documents: "Documents",
  sharing: "Sharing",
  settings: "Account",
  search: "Search",
};


const SidebarNav = ({
  activeSection,
  onSectionChange,
  onSignOut,
  displayName,
  onOpenSearch,
}: DashboardSidebarProps) => {
  const { tier } = useSubscription();
  const { data: isAdmin } = useAdminCheck();
  const navigate = useNavigate();


  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-3 border-b border-border px-4 py-4">
        <div className="flex items-center gap-2">
          <Home className="h-6 w-6 text-accent" />
          <span className="font-display text-xl font-bold">HomeLog</span>
        </div>
        <PropertySwitcher className="w-full" />
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
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 font-body text-sm font-medium transition-colors mb-1",
            activeSection === "settings"
              ? "bg-accent/10 text-accent"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </button>
        {isAdmin && (
          <button
            onClick={() => navigate("/admin")}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 font-body text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground mb-2"
          >
            <ShieldCheck className="h-4 w-4 text-accent" />
            Admin
          </button>
        )}
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
      <div className="fixed inset-x-0 top-0 z-40 flex flex-col gap-2 border-b border-border bg-card px-4 py-2 md:hidden">
        <div className="flex items-center justify-between">
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
        <PropertySwitcher className="w-full" />
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
