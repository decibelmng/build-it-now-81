import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Copy } from "lucide-react";

const randomCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
};

const BetaCodesCard = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [maxUses, setMaxUses] = useState(25);
  const [note, setNote] = useState("");

  const { data: codes = [], isLoading } = useQuery({
    queryKey: ["beta_codes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beta_codes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const finalCode = (code.trim() || randomCode()).toUpperCase();
      const { error } = await supabase.from("beta_codes").insert({
        code: finalCode,
        max_uses: Number(maxUses) || 25,
        note: note.trim() || null,
      });
      if (error) throw error;
      return finalCode;
    },
    onSuccess: (finalCode) => {
      qc.invalidateQueries({ queryKey: ["beta_codes"] });
      setCode("");
      setNote("");
      toast({ title: "Code created", description: finalCode });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("beta_codes").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["beta_codes"] }),
  });

  const copy = (c: string) => {
    navigator.clipboard.writeText(c);
    toast({ title: "Copied", description: c });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" /> Beta Codes
        </CardTitle>
        <CardDescription>Grant full access without Stripe checkout</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Code (blank = random)</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="AUTO"
              className="uppercase tracking-wider"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Max uses</Label>
            <Input type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(parseInt(e.target.value) || 1)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Note</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <Button onClick={() => create.mutate()} disabled={create.isPending}>
          {create.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Create Code
        </Button>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Uses</TableHead>
                <TableHead className="hidden sm:table-cell">Note</TableHead>
                <TableHead>Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono">
                    <button className="inline-flex items-center gap-1 hover:underline" onClick={() => copy(c.code)}>
                      {c.code} <Copy className="h-3 w-3" />
                    </button>
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.times_used >= c.max_uses ? "destructive" : "secondary"}>
                      {c.times_used} / {c.max_uses}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">{c.note || "—"}</TableCell>
                  <TableCell>
                    <Switch
                      checked={c.active}
                      onCheckedChange={(v) => toggleActive.mutate({ id: c.id, active: v })}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {codes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">
                    No codes yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default BetaCodesCard;
