import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMFA } from "@/hooks/useMFA";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ShieldCheck, Copy, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const MFASecurityCard = () => {
  const { isEnrolled, factorId, loading, refresh } = useMFA();
  const { toast } = useToast();

  // Enroll dialog state
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [step, setStep] = useState<"qr" | "verify" | "success">("qr");
  const [enrollData, setEnrollData] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const codeRef = useRef<HTMLInputElement>(null);

  // Unenroll confirm
  const [unenrollOpen, setUnenrollOpen] = useState(false);
  const [unenrolling, setUnenrolling] = useState(false);

  const startEnroll = async () => {
    setEnrollLoading(true);
    setStep("qr");
    setCode("");
    setVerifyError("");
    setEnrollData(null);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (error) throw error;
      setEnrollData({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
      setEnrollOpen(true);
    } catch (err: any) {
      toast({ title: "Failed to start enrollment", description: err.message, variant: "destructive" });
    } finally {
      setEnrollLoading(false);
    }
  };

  const verifyCode = async (inputCode: string) => {
    if (inputCode.length !== 6 || !enrollData) return;
    setVerifying(true);
    setVerifyError("");
    try {
      const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({
        factorId: enrollData.id,
      });
      if (challengeErr) throw challengeErr;

      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId: enrollData.id,
        challengeId: challengeData.id,
        code: inputCode,
      });
      if (verifyErr) throw verifyErr;

      setStep("success");
      await refresh();
      setTimeout(() => {
        setEnrollOpen(false);
      }, 2000);
    } catch (err: any) {
      setVerifyError("Invalid code, please try again");
      setCode("");
      codeRef.current?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const handleCodeChange = (val: string) => {
    const cleaned = val.replace(/\D/g, "").slice(0, 6);
    setCode(cleaned);
    setVerifyError("");
    if (cleaned.length === 6) {
      verifyCode(cleaned);
    }
  };

  const handleDisable = async () => {
    if (!factorId) return;
    setUnenrolling(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      await refresh();
      toast({ title: "Two-factor authentication disabled" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setUnenrolling(false);
      setUnenrollOpen(false);
    }
  };

  const copySecret = () => {
    if (enrollData?.secret) {
      navigator.clipboard.writeText(enrollData.secret);
      toast({ title: "Secret key copied!" });
    }
  };

  if (loading) return null;

  return (
    <>
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base font-semibold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Two-factor authentication
            {isEnrolled && (
              <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 ml-1">
                Enabled
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isEnrolled ? (
            <>
              <p className="font-body text-sm text-muted-foreground">
                Your account is protected with two-factor authentication.
              </p>
              <Button
                variant="outline"
                className="rounded-full font-body font-semibold text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setUnenrollOpen(true)}
              >
                Disable two-factor authentication
              </Button>
            </>
          ) : (
            <>
              <p className="font-body text-sm text-muted-foreground">
                Add an extra layer of security. When enabled, you'll need your password plus a code from an authenticator app (like Google Authenticator or Authy) to sign in.
              </p>
              <Button
                className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold"
                onClick={startEnroll}
                disabled={enrollLoading}
              >
                {enrollLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enable two-factor authentication
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Enrollment Dialog */}
      <Dialog open={enrollOpen} onOpenChange={(v) => { if (!v) setEnrollOpen(false); }}>
        <DialogContent className="max-w-sm">
          {step === "qr" && enrollData && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">Set up authenticator</DialogTitle>
                <DialogDescription className="font-body">
                  Scan this QR code with your authenticator app
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4">
                <img src={enrollData.qr} alt="QR Code" className="w-48 h-48 rounded-lg border border-border" />
                <p className="font-body text-xs text-muted-foreground text-center">
                  Or enter this secret key manually:
                </p>
                <div className="flex items-center gap-2 w-full">
                  <code className="flex-1 rounded-md bg-muted px-3 py-2 font-mono text-xs break-all">
                    {enrollData.secret}
                  </code>
                  <Button variant="outline" size="icon" onClick={copySecret} className="shrink-0">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold"
                  onClick={() => { setStep("verify"); setTimeout(() => codeRef.current?.focus(), 100); }}
                >
                  Next
                </Button>
              </div>
            </>
          )}

          {step === "verify" && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">Verify code</DialogTitle>
                <DialogDescription className="font-body">
                  Enter the 6-digit code from your authenticator app
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4">
                <Input
                  ref={codeRef}
                  value={code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="text-center text-2xl tracking-[0.5em] font-mono h-14"
                  disabled={verifying}
                />
                {verifyError && (
                  <p className="font-body text-sm text-destructive">{verifyError}</p>
                )}
                {verifying && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="font-body text-sm">Verifying...</span>
                  </div>
                )}
              </div>
            </>
          )}

          {step === "success" && (
            <div className="flex flex-col items-center gap-4 py-6">
              <CheckCircle className="h-12 w-12 text-green-600" />
              <p className="font-display text-lg font-semibold">Two-factor authentication enabled!</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Disable Confirm */}
      <AlertDialog open={unenrollOpen} onOpenChange={setUnenrollOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Disable two-factor authentication?</AlertDialogTitle>
            <AlertDialogDescription className="font-body">
              Are you sure? This makes your account less secure.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full font-body">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 font-body"
              onClick={handleDisable}
              disabled={unenrolling}
            >
              {unenrolling ? "Disabling..." : "Disable"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MFASecurityCard;
