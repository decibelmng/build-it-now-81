import { useState } from "react";
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
import { Users, Home, Wrench, Share2, ArrowLeft, BarChart3, Shield } from "lucide-react";

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: isAdmin, isLoading: adminLoading } = useAdminCheck();

  // Platform stats
  const { data: stats } = useQuery({
    queryKey: ["admin_stats"],
    queryFn: async () => {
      const [profiles, properties, logs, shares] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("properties").select("id", { count: "exact", head: true }),
        supabase.from("maintenance_logs").select("id", { count: "exact", head: true }),
        supabase.from("property_shares").select("id", { count: "exact", head: true }),
      ]);
      return {
        users: profiles.count ?? 0,
        properties: properties.count ?? 0,
        maintenanceLogs: logs.count ?? 0,
        shares: shares.count ?? 0,
      };
    },
    enabled: isAdmin === true,
  });

  // All users
  const { data: allUsers = [] } = useQuery({
    queryKey: ["admin_users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin === true,
  });

  // All properties
  const { data: allProperties = [] } = useQuery({
    queryKey: ["admin_properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin === true,
  });

  // All shares
  const { data: allShares = [] } = useQuery({
    queryKey: ["admin_shares"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_shares")
        .select("*, properties(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin === true,
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
        {/* Stats */}
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
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Registered Users</CardTitle>
                <CardDescription>{allUsers.length} users on the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Persona</TableHead>
                      <TableHead className="hidden md:table-cell">Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allUsers.map((u) => (
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Type</TableHead>
                      <TableHead className="hidden md:table-cell">Address</TableHead>
                      <TableHead className="hidden lg:table-cell">Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allProperties.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="secondary">{p.property_type}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">{p.address}</TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {new Date(p.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
