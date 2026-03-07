import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { User, Phone, Lock, Save, ArrowRightLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Property = Tables<"properties">;

const ProfileSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferStep, setTransferStep] = useState<"email" | "confirm">("email");
  const [transferPropertyId, setTransferPropertyId] = useState("");
  const [transferEmail, setTransferEmail] = useState("");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile_settings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, phone, persona, avatar_url")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: userProperties = [] } = useQuery({
    queryKey: ["properties_transfer", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, name, address, property_code")
        .order("name");
      if (error) throw error;
      return data as (Pick<Property, "id" | "name" | "address"> & { property_code: string | null })[];
    },
    enabled: !!user,
  });

  // Query item counts for transfer summary
  const { data: transferItemCounts } = useQuery({
    queryKey: ["transfer_item_counts", transferPropertyId],
    queryFn: async () => {
      const [{ count: homeCount }, { count: personalCount }, { count: maintenanceCount }] = await Promise.all([
        supabase.from("home_items").select("*", { count: "exact", head: true }).eq("property_id", transferPropertyId).eq("item_type", "home_component"),
        supabase.from("home_items").select("*", { count: "exact", head: true }).eq("property_id", transferPropertyId).eq("item_type", "personal_item"),
        supabase.from("maintenance_logs").select("*", { count: "exact", head: true }).eq("property_id", transferPropertyId),
      ]);
      return { homeComponents: homeCount ?? 0, personalItems: personalCount ?? 0, maintenanceLogs: maintenanceCount ?? 0 };
    },
    enabled: !!transferPropertyId,
  });

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName, phone: phone || null })
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile_settings"] });
      toast({ title: "Profile updated!" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const initiateTransfer = useMutation({
    mutationFn: async () => {
      if (!transferPropertyId || !transferEmail) return;
      const { data: recipientProfile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("display_name", transferEmail)
        .maybeSingle();

      const { error } = await supabase.from("property_transfers").insert({
        property_id: transferPropertyId,
        from_user_id: user!.id,
        to_email: transferEmail,
        to_user_id: recipientProfile?.user_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      setTransferOpen(false);
      setTransferEmail("");
      setTransferPropertyId("");
      setTransferStep("email");
      toast({ title: "Transfer initiated", description: "The recipient will need to accept the transfer." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const changePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated!" });
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i} className="animate-pulse border-border/50">
            <CardContent className="p-6"><div className="h-32 rounded-lg bg-muted" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold">Profile Settings</h2>
        <p className="font-body text-sm text-muted-foreground">Manage your account information</p>
      </div>

      <div className="space-y-6 max-w-lg">
        {/* Profile Info */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base font-semibold flex items-center gap-2">
              <User className="h-4 w-4" /> Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="font-body">Display Name</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="font-body"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Email</Label>
              <Input value={user?.email ?? ""} disabled className="font-body bg-muted" />
            </div>
            <div className="space-y-2">
              <Label className="font-body flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> Phone
              </Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="font-body"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Role</Label>
              <Input value={profile?.persona ? profile.persona.charAt(0).toUpperCase() + profile.persona.slice(1) : "Not set"} disabled className="font-body bg-muted capitalize" />
            </div>
            <Button
              onClick={() => updateProfile.mutate()}
              disabled={updateProfile.isPending}
              className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold"
            >
              <Save className="mr-2 h-4 w-4" />
              {updateProfile.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base font-semibold flex items-center gap-2">
              <Lock className="h-4 w-4" /> Change Password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="font-body">New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                className="font-body"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Confirm Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="font-body"
              />
            </div>
            <Button
              onClick={changePassword}
              disabled={!newPassword}
              variant="outline"
              className="rounded-full font-body font-semibold"
            >
              Update Password
            </Button>
          </CardContent>
        </Card>

        {/* Transfer Property */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base font-semibold flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4" /> Transfer Property Ownership
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="font-body text-sm text-muted-foreground">
              Transfer full ownership of a property and all its associated data to another user. This is permanent and cannot be undone.
            </p>
            <Button
              variant="outline"
              className="rounded-full font-body font-semibold"
              onClick={() => setTransferOpen(true)}
              disabled={userProperties.length === 0}
            >
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Initiate Transfer
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Transfer dialog — two-step */}
      <Dialog open={transferOpen} onOpenChange={(v) => { setTransferOpen(v); if (!v) { setTransferStep("email"); setTransferEmail(""); setTransferPropertyId(""); } }}>
        <DialogContent className="max-w-sm">
          {transferStep === "email" ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">Transfer Property</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); setTransferStep("confirm"); }} className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-body">Select Property *</Label>
                  <Select value={transferPropertyId} onValueChange={setTransferPropertyId} required>
                    <SelectTrigger className="font-body"><SelectValue placeholder="Choose a property" /></SelectTrigger>
                    <SelectContent>
                      {userProperties.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="font-body">
                          {p.name} — {p.address}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-body">Recipient Email *</Label>
                  <Input
                    type="email"
                    placeholder="newowner@example.com"
                    value={transferEmail}
                    onChange={(e) => setTransferEmail(e.target.value)}
                    required
                    className="font-body"
                  />
                  <p className="font-body text-xs text-muted-foreground">
                    The recipient must have an account. They'll need to accept the transfer.
                  </p>
                </div>
                <Button type="submit" disabled={!transferPropertyId || !transferEmail} className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold">
                  Continue
                </Button>
              </form>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-destructive">⚠ Confirm Transfer</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-2">
                  <p className="font-body text-sm font-semibold text-destructive">This action cannot be undone.</p>
                  <p className="font-body text-sm text-muted-foreground">
                    You are about to permanently transfer ownership of <strong className="text-foreground">{userProperties.find((p) => p.id === transferPropertyId)?.name}</strong> and all associated data — maintenance logs, documents, contacts, and recurring templates — to <strong className="text-foreground">{transferEmail}</strong>.
                  </p>
                  <p className="font-body text-sm text-muted-foreground">
                    Once the recipient accepts, you will no longer have access to this property or its records.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-full font-body"
                    onClick={() => setTransferStep("email")}
                  >
                    Go Back
                  </Button>
                  <Button
                    className="flex-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 font-body font-semibold"
                    onClick={() => initiateTransfer.mutate()}
                    disabled={initiateTransfer.isPending}
                  >
                    {initiateTransfer.isPending ? "Sending..." : "Transfer Property"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfileSettings;
