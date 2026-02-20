import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Home, Wrench, DollarSign, Clock, CheckCircle2, AlertTriangle, FileText, Users } from "lucide-react";
import { format, parseISO } from "date-fns";

const DashboardOverview = () => {
  const { user } = useAuth();

  const { data: properties = [] } = useQuery({
    queryKey: ["properties", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["maintenance_logs_overview", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_logs")
        .select("id, title, status, cost, category, created_at, completed_date, properties(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["documents_count", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("id");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts_count", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("home_contacts").select("id");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const totalSpent = logs.reduce((sum, l) => sum + (Number(l.cost) || 0), 0);
  const pendingCount = logs.filter((l) => l.status === "pending").length;
  const inProgressCount = logs.filter((l) => l.status === "in_progress").length;
  const completedCount = logs.filter((l) => l.status === "completed").length;
  const recentLogs = logs.slice(0, 5);

  const statCards = [
    { label: "Properties", value: properties.length.toString(), icon: Home, color: "text-accent" },
    { label: "Total Spent", value: `$${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, icon: DollarSign, color: "text-accent" },
    { label: "Pending Tasks", value: (pendingCount + inProgressCount).toString(), icon: Clock, color: "text-destructive" },
    { label: "Completed", value: completedCount.toString(), icon: CheckCircle2, color: "text-sage" },
    { label: "Documents", value: documents.length.toString(), icon: FileText, color: "text-muted-foreground" },
    { label: "Contacts", value: contacts.length.toString(), icon: Users, color: "text-muted-foreground" },
  ];

  const statusIcon: Record<string, React.ElementType> = {
    pending: Clock,
    in_progress: AlertTriangle,
    completed: CheckCircle2,
  };

  const statusColor: Record<string, string> = {
    pending: "text-muted-foreground",
    in_progress: "text-amber-500",
    completed: "text-sage",
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold">Dashboard</h2>
        <p className="font-body text-sm text-muted-foreground">Your home management at a glance</p>
      </div>

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.label} className="border-border/50">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="font-body text-xs text-muted-foreground">{stat.label}</p>
                <p className="font-display text-lg font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card className="border-border/50">
        <CardContent className="p-5">
          <h3 className="mb-4 font-display text-base font-semibold">Recent Activity</h3>
          {recentLogs.length === 0 ? (
            <p className="font-body text-sm text-muted-foreground py-8 text-center">
              No activity yet. Add a property and start logging maintenance.
            </p>
          ) : (
            <div className="space-y-3">
              {recentLogs.map((log: any) => {
                const StatusIcon = statusIcon[log.status] ?? Clock;
                const sColor = statusColor[log.status] ?? "text-muted-foreground";
                return (
                  <div key={log.id} className="flex items-center gap-3 rounded-lg border border-border/50 p-3">
                    <StatusIcon className={`h-4 w-4 shrink-0 ${sColor}`} />
                    <div className="min-w-0 flex-1">
                      <p className="font-body text-sm font-medium truncate">{log.title}</p>
                      <p className="font-body text-xs text-muted-foreground">
                        {log.properties?.name && <span>{log.properties.name} · </span>}
                        {format(parseISO(log.created_at), "MMM d, yyyy")}
                        {log.cost ? ` · $${Number(log.cost).toLocaleString()}` : ""}
                      </p>
                    </div>
                    <span className={`font-body text-xs font-medium capitalize ${sColor}`}>
                      {log.status?.replace("_", " ")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardOverview;
