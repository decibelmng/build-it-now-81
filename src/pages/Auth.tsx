import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Home, ArrowRight, Mail, Lock, User, ShieldCheck, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(searchParams.get("mode") !== "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { user, loading: authLoading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // MFA challenge state
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaVerifying, setMfaVerifying] = useState(false);
  const [mfaError, setMfaError] = useState("");
  const mfaCodeRef = useRef<HTMLInputElement>(null);

  // Handle OAuth callback - detect tokens in URL hash
  const [oauthProcessing, setOauthProcessing] = useState(false);
  
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && (hash.includes("access_token") || hash.includes("refresh_token"))) {
      setOauthProcessing(true);
    }

    // Surface OAuth / redirect errors so they aren't silent.
    // Providers put errors in either the hash (implicit flow) or query string.
    const parseErrorFrom = (src: string) => {
      const p = new URLSearchParams(src.startsWith("#") ? src.slice(1) : src);
      const code =
        p.get("error") ||
        p.get("error_code") ||
        p.get("auth_error") ||
        null;
      const desc =
        p.get("error_description") ||
        p.get("auth_error_description") ||
        null;
      return code || desc ? { code, desc } : null;
    };
    const err =
      parseErrorFrom(window.location.hash || "") ||
      parseErrorFrom(window.location.search || "");
    if (err) {
      const message = err.desc
        ? decodeURIComponent(err.desc.replace(/\+/g, " "))
        : err.code || "Sign-in failed";
      console.error("[Auth] OAuth/redirect error", err);
      toast({
        title: "Sign-in failed",
        description: message,
        variant: "destructive",
      });
      // Scrub the error from the URL so it doesn't re-fire on refresh
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);
    }
  }, [toast]);

  // If already logged in (and no MFA pending), redirect to dashboard
  useEffect(() => {
    if (!authLoading && user && !mfaRequired) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, authLoading, navigate, mfaRequired]);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const isCustomDomain =
        !window.location.hostname.includes("lovable.app") &&
        !window.location.hostname.includes("lovableproject.com") &&
        !window.location.hostname.includes("localhost");

      if (isCustomDomain) {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth`,
            skipBrowserRedirect: true,
            queryParams: { prompt: "select_account" },
          },
        });
        if (error) throw error;
        if (data?.url) {
          window.location.replace(data.url);
          return;
        }
      } else {
        const { error } = await lovable.auth.signInWithOAuth("google", {
          redirect_uri: `${window.location.origin}/auth`,
          extraParams: { prompt: "select_account" },
        });
        if (error) throw error;
      }
    } catch (error: any) {
      console.error("[Auth] Google sign-in failed", error);
      toast({
        title: "Google sign-in failed",
        description: error?.message || error?.error_description || "Unknown provider error",
        variant: "destructive",
      });
      setGoogleLoading(false);
    }
  };

  const checkAndHandleMFA = async () => {
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp?.find((f) => f.status === "verified");
      if (totpFactor) {
        setMfaFactorId(totpFactor.id);
        setMfaRequired(true);
        setMfaCode("");
        setMfaError("");
        setTimeout(() => mfaCodeRef.current?.focus(), 100);
        return true; // MFA required
      }
    } catch {
      // If listing factors fails, proceed without MFA
    }
    return false; // No MFA
  };

  const handleMfaVerify = async (inputCode: string) => {
    if (inputCode.length !== 6) return;
    setMfaVerifying(true);
    setMfaError("");
    try {
      const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({
        factorId: mfaFactorId,
      });
      if (challengeErr) throw challengeErr;

      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challengeData.id,
        code: inputCode,
      });
      if (verifyErr) throw verifyErr;

      setMfaRequired(false);
      navigate("/dashboard");
    } catch {
      setMfaError("Invalid code, please try again");
      setMfaCode("");
      mfaCodeRef.current?.focus();
    } finally {
      setMfaVerifying(false);
    }
  };

  const handleMfaCodeChange = (val: string) => {
    const cleaned = val.replace(/\D/g, "").slice(0, 6);
    setMfaCode(cleaned);
    setMfaError("");
    if (cleaned.length === 6) {
      handleMfaVerify(cleaned);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        toast({ title: "Login failed", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }
      // Check MFA after successful login
      const needsMfa = await checkAndHandleMFA();
      if (!needsMfa) {
        navigate("/dashboard");
      }
    } else {
      const { error } = await signUp(email, password, displayName);
      if (error) {
        toast({ title: "Sign up failed", description: friendlyPasswordError(error as any), variant: "destructive" });
      } else {
        navigate("/dashboard");
      }
    }
    setLoading(false);
  };

  // Show loading screen while OAuth processes
  if (oauthProcessing || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-section-sage px-4">
        <div className="text-center">
          <Home className="mx-auto h-8 w-8 text-accent animate-pulse" />
          <p className="mt-4 font-body text-sm text-muted-foreground">Signing you in...</p>
        </div>
      </div>
    );
  }

  // MFA Challenge Screen
  if (mfaRequired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-section-sage px-4">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-center gap-2">
            <Home className="h-8 w-8 text-accent" />
            <span className="font-display text-2xl font-bold text-foreground">HomeLog</span>
          </div>

          <Card className="border-border/50 shadow-premium">
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                <ShieldCheck className="h-6 w-6 text-accent" />
              </div>
              <CardTitle className="font-display text-2xl">Verification required</CardTitle>
              <CardDescription className="font-body">
                Enter the 6-digit code from your authenticator app
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <Input
                ref={mfaCodeRef}
                value={mfaCode}
                onChange={(e) => handleMfaCodeChange(e.target.value)}
                placeholder="000000"
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
                className="text-center text-2xl tracking-[0.5em] font-mono h-14 max-w-[200px]"
                disabled={mfaVerifying}
                autoFocus
              />
              {mfaError && (
                <p className="font-body text-sm text-destructive">{mfaError}</p>
              )}
              {mfaVerifying && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="font-body text-sm">Verifying...</span>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <p className="text-center font-body text-xs text-muted-foreground">
                Lost your device?{" "}
                <a href="mailto:support@homelogapp.com" className="font-medium text-accent hover:underline">
                  Contact support@homelogapp.com
                </a>{" "}
                to reset your two-factor authentication.
              </p>
            </CardFooter>
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
          <CardHeader className="text-center">
            <CardTitle className="font-display text-2xl">
              {isLogin ? "Welcome Back" : "Create Your Account"}
            </CardTitle>
            <CardDescription className="font-body">
              {isLogin
                ? "Sign in to manage your home's digital passport"
                : "Start your home management journey today"}
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="font-body">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="pl-10 font-body"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="font-body">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 font-body"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="font-body">Password</Label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!email) {
                          toast({ title: "Enter your email first", variant: "destructive" });
                          return;
                        }
                        setLoading(true);
                        const { error } = await supabase.auth.resetPasswordForEmail(email, {
                          redirectTo: `${window.location.origin}/reset-password`,
                        });
                        if (error) {
                          toast({ title: "Error", description: error.message, variant: "destructive" });
                        } else {
                          toast({ title: "Check your email", description: "We sent you a password reset link." });
                        }
                        setLoading(false);
                      }}
                      className="font-body text-xs font-medium text-accent hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
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
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <Button
                type="submit"
                className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold"
                disabled={loading}
              >
                {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <div className="flex w-full items-center gap-3">
                <Separator className="flex-1" />
                <span className="font-body text-xs text-muted-foreground">or</span>
                <Separator className="flex-1" />
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full rounded-full font-body font-medium"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {googleLoading ? "Connecting..." : "Continue with Google"}
              </Button>

              {!isLogin && (
                <p className="text-center font-body text-xs text-muted-foreground">
                  By signing up, you agree to our{" "}
                  <a href="/terms" className="font-medium text-accent underline underline-offset-2">Terms of Service</a>
                  {" "}and{" "}
                  <a href="/privacy" className="font-medium text-accent underline underline-offset-2">Privacy Policy</a>.
                </p>
              )}

              <p className="text-center font-body text-sm text-muted-foreground">
                {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="font-semibold text-accent hover:underline"
                >
                  {isLogin ? "Sign Up" : "Sign In"}
                </button>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
