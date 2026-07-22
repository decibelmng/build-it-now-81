import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, ArrowRight, Lock, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { friendlyPasswordError } from "@/lib/authErrors";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check for recovery token in URL hash
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  if (!isRecovery && !success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-section-sage px-4">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-center gap-2">
            <Home className="h-8 w-8 text-accent" />
            <span className="font-display text-2xl font-bold text-foreground">HomeLog</span>
          </div>
          <Card className="border-border/50 shadow-premium">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <p className="font-body text-sm text-muted-foreground text-center">
                Invalid or expired reset link. Please request a new password reset.
              </p>
              <Button onClick={() => navigate("/auth")} variant="outline" className="mt-4 rounded-full font-body">
                Back to Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-section-sage px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2">
          <Home className="h-8 w-8 text-accent" />
          <span className="font-display text-2xl font-bold text-foreground">HomeLog</span>
        </div>

        <Card className="border-border/50 shadow-premium">
          {success ? (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sage/10">
                  <CheckCircle2 className="h-7 w-7 text-sage" />
                </div>
                <CardTitle className="font-display text-2xl">Password Updated</CardTitle>
                <CardDescription className="font-body">
                  Your password has been successfully reset.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button
                  onClick={() => navigate("/dashboard")}
                  className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold"
                >
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </>
          ) : (
            <>
              <CardHeader className="text-center">
                <CardTitle className="font-display text-2xl">Set New Password</CardTitle>
                <CardDescription className="font-body">
                  Enter your new password below
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="font-body">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 font-body"
                        minLength={6}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm" className="font-body">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirm"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10 font-body"
                        minLength={6}
                        required
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    type="submit"
                    className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold"
                    disabled={loading}
                  >
                    {loading ? "Updating..." : "Update Password"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
