import { useAuth } from "@/hooks/useAuth";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Users, Home, Wrench, Share2, ArrowLeft, Shield, Sparkles, AlertTriangle, Lock } from "lucide-react";
import BetaCodesCard from "@/components/admin/BetaCodesCard";

const isForbidden = (err: any) => {
  const msg = (err?.message || "").toLowerCase();
  const code = (err?.code || "").toString();
  return (
    code === "42501" ||
    code === "PGRST301" ||
    msg.includes("forbidden") ||
    msg.includes("not authorized") ||
    msg.includes("permission denied") ||
    msg.includes("admin")
  );
};

const RpcError = ({ label, error }: { label: string; error: any }) => {
  const forbidden = isForbidden(error);
  return (
    <Alert variant="destructive" className="mb-4">
      {forbidden ? <Lock className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
      <AlertTitle>{forbidden ? `Forbidden — ${label}` : `Failed to load ${label}`}</AlertTitle>
      <AlertDescription className="break-words">
        {forbidden
          ? "Your account doesn't have admin privileges for this data."
          : error?.message || "Unknown error"}
        {error?.code ? <span className="ml-2 opacity-70">({error.code})</span> : null}
      </AlertDescription>
    </Alert>
  );
};

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: isAdmin, isLoading: adminLoading } = useAdminCheck();

  const statsQ = useQuery({
    queryKey: ["admin_stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_get_stats");
      if (error) {
        console.error("admin_get_stats failed:", error);
        throw error;
      }
      const s = (data ?? {}) as any;
      return {
        users: s.users ?? 0,
        properties: s.properties ?? 0,
        maintenanceLogs: s.maintenanceLogs ?? 0,
        shares: s.shares ?? 0,
      };
    },
    enabled: isAdmin === true,
    retry: false,
  });

  const usersQ = useQuery({
    queryKey: ["admin_users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users", { p_search: undefined });
      if (error) { console.error("admin_list_users failed:", error); throw error; }
      return data ?? [];
    },
    enabled: isAdmin === true,
    retry: false,
  });

  const propertiesQ = useQuery({
    queryKey: ["admin_properties"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_properties", { p_search: undefined });
      if (error) { console.error("admin_list_properties failed:", error); throw error; }
      return data ?? [];
    },
    enabled: isAdmin === true,
    retry: false,
  });

  const sharesQ = useQuery({
    queryKey: ["admin_shares"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_shares");
      if (error) { console.error("admin_list_shares failed:", error); throw error; }
      return data ?? [];
    },
    enabled: isAdmin === true,
    retry: false,
  });

  if (adminLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Checking permissions…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <Shield className="h-16 w-16 text-destructive" />
        <h1 className="font-display text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">You don't have permission to view this page.</p>
        <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
      </div>
    );
  }

  const stats = statsQ.data;
  const allUsers = usersQ.data ?? [];
  const allProperties = propertiesQ.data ?? [];
  const allShares = sharesQ.data ?? [];

  const statCards = [
    { label: "Total Users", value: stats?.users ?? 0, icon: Users, color: "text-accent" },
    { label: "Properties", value: stats?.properties ?? 0, icon: Home, color: "text-sage" },
    { label: "Maintenance Logs", value: stats?.maintenanceLogs ?? 0, icon: Wrench, color: "text-destructive" },
    { label: "Active Shares", value: stats?.shares ?? 0, icon: Share2, color: "text-accent" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="font-display text-xl font-bold sm:text-2xl">Admin Panel</h1>
              <p className="text-sm text-muted-foreground">Platform management & oversight</p>
            </div>
          </div>
          <Badge variant="outline" className="border-accent text-accent">
            <Shield className="mr-1 h-3 w-3" /> Admin
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8">
        {statsQ.error && <RpcError label="platform stats" error={statsQ.error} />}

        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {statCards.map((s) => (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-3 p-4 sm:p-6">
                <div className={`rounded-lg bg-secondary p-2.5 ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="users">
          <TabsList className="mb-4 w-full justify-start overflow-x-auto">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="shares">Shared Access</TabsTrigger>
            <TabsTrigger value="beta"><Sparkles className="mr-1 h-3 w-3" /> Beta Codes</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Registered Users</CardTitle>
                <CardDescription>{allUsers.length} users on the platform</CardDescription>
              </CardHeader>
              <CardContent>
                {usersQ.error ? (
                  <RpcError label="users" error={usersQ.error} />
                ) : usersQ.isLoading ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Loading users…</p>
                ) : allUsers.length <= 1 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    You're the only user so far — this list fills in as people sign up.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="hidden sm:table-cell">Persona</TableHead>
                        <TableHead className="hidden md:table-cell">Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allUsers.map((u: any) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.display_name || "—"}</TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant="secondary">{u.persona || "none"}</Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">
                            {new Date(u.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="properties">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">All Properties</CardTitle>
                <CardDescription>{allProperties.length} properties tracked</CardDescription>
              </CardHeader>
              <CardContent>
                {propertiesQ.error ? (
                  <RpcError label="properties" error={propertiesQ.error} />
                ) : propertiesQ.isLoading ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Loading properties…</p>
                ) : allProperties.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No properties have been created yet.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="hidden sm:table-cell">Type</TableHead>
                        <TableHead className="hidden md:table-cell">Location</TableHead>
                        <TableHead className="hidden lg:table-cell">Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allProperties.map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant="secondary">{p.property_type}</Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">{[p.city, p.state].filter(Boolean).join(", ")}</TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground">
                            {new Date(p.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shares">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Shared Access</CardTitle>
                <CardDescription>All property sharing across the platform</CardDescription>
              </CardHeader>
              <CardContent>
                {sharesQ.error ? (
                  <RpcError label="shares" error={sharesQ.error} />
                ) : sharesQ.isLoading ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Loading shares…</p>
                ) : allShares.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No shared access has been granted yet.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Property</TableHead>
                        <TableHead>Shared With</TableHead>
                        <TableHead className="hidden sm:table-cell">Permission</TableHead>
                        <TableHead className="hidden sm:table-cell">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allShares.map((s: any) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{(s as any).properties?.name || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{s.shared_with_email}</TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant="outline">{s.permission}</Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant={s.status === "accepted" ? "default" : "secondary"}>{s.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="beta">
            <BetaCodesCard />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
