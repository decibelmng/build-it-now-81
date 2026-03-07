import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Home, CheckCircle2, AlertCircle, Loader2, Upload, X, FileText, Image as ImageIcon } from "lucide-react";
import { UNIVERSAL_FILE_ACCEPT, isImageFile, fileTypeLabel } from "@/lib/fileUploadConstants";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface LinkInfo {
  link_id: string;
  property_id: string;
  property_address: string;
  label: string | null;
  categories: string[];
}

const ContractorServiceLog = () => {
  const { token } = useParams<{ token: string }>();
  const [linkInfo, setLinkInfo] = useState<LinkInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    contractor_company_name: "",
    contractor_contact_name: "",
    contractor_email: "",
    contractor_phone: "",
    service_date: new Date().toISOString().split("T")[0],
    service_category: "",
    service_description: "",
    cost: "",
    warranty_info: "",
    notes: "",
    add_to_contacts: false,
  });

  const [photos, setPhotos] = useState<File[]>([]);
  const [receipts, setReceipts] = useState<File[]>([]);

  useEffect(() => {
    if (!token) {
      setError("No token provided");
      setLoading(false);
      return;
    }

    fetch(`${SUPABASE_URL}/functions/v1/contractor-link-info?token=${encodeURIComponent(token)}`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setError(data.error || "Invalid link");
        } else {
          setLinkInfo(data);
        }
      })
      .catch(() => setError("Failed to validate link"))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("token", token);
      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
      photos.forEach((file) => formData.append("photos", file));
      receipts.forEach((file) => formData.append("receipts", file));

      const res = await fetch(`${SUPABASE_URL}/functions/v1/contractor-submit`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const removePhoto = (index: number) => setPhotos((prev) => prev.filter((_, i) => i !== index));
  const removeReceipt = (index: number) => setReceipts((prev) => prev.filter((_, i) => i !== index));

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (error && !linkInfo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 pt-8 pb-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <h2 className="text-xl font-semibold">Link Unavailable</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 pt-8 pb-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <h2 className="text-xl font-semibold">Service Log Submitted!</h2>
            <p className="text-muted-foreground">
              Your service log has been submitted. The homeowner will review and approve it.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-4">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <Home className="h-5 w-5 text-accent" />
          <span className="font-display text-lg font-bold">HomeLog</span>
          <Badge variant="secondary" className="ml-2 text-xs">Service Log</Badge>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* Property Address */}
        <div className="mb-6 rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Logging service for</p>
          <p className="font-semibold text-foreground">{linkInfo?.property_address}</p>
          {linkInfo?.label && <p className="text-sm text-muted-foreground mt-1">{linkInfo.label}</p>}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contractor Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Your Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="company">Company Name *</Label>
                  <Input id="company" required value={form.contractor_company_name}
                    onChange={(e) => setForm((f) => ({ ...f, contractor_company_name: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="name">Your Name *</Label>
                  <Input id="name" required value={form.contractor_contact_name}
                    onChange={(e) => setForm((f) => ({ ...f, contractor_contact_name: e.target.value }))} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={form.contractor_email}
                    onChange={(e) => setForm((f) => ({ ...f, contractor_email: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" type="tel" value={form.contractor_phone}
                    onChange={(e) => setForm((f) => ({ ...f, contractor_phone: e.target.value }))} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Service Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="date">Service Date *</Label>
                  <Input id="date" type="date" required value={form.service_date}
                    onChange={(e) => setForm((f) => ({ ...f, service_date: e.target.value }))} />
                </div>
                <div>
                  <Label>Service Category *</Label>
                  <Select required value={form.service_category}
                    onValueChange={(v) => setForm((f) => ({ ...f, service_category: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {(linkInfo?.categories || []).map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="desc">Description of Work Performed *</Label>
                <Textarea id="desc" required rows={4} value={form.service_description}
                  onChange={(e) => setForm((f) => ({ ...f, service_description: e.target.value }))} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="cost">Cost</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input id="cost" type="number" step="0.01" min="0" className="pl-7"
                      value={form.cost} onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div>
                <Label htmlFor="warranty">Warranty Information</Label>
                <Textarea id="warranty" rows={2} placeholder="e.g., Parts warranted for 1 year"
                  value={form.warranty_info} onChange={(e) => setForm((f) => ({ ...f, warranty_info: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea id="notes" rows={2} value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
            </CardContent>
          </Card>

          {/* File Uploads */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Photos & Receipts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Photos (max 10 files, 10MB each)</Label>
                <div className="mt-1">
                  <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:bg-secondary/50 transition-colors">
                    <Upload className="h-4 w-4" />
                    <span>Choose photos...</span>
                    <input type="file" accept={UNIVERSAL_FILE_ACCEPT} multiple className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []).slice(0, 10 - photos.length);
                        setPhotos((prev) => [...prev, ...files].slice(0, 10));
                        e.target.value = "";
                      }} />
                  </label>
                </div>
                {photos.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {photos.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs bg-muted/50 rounded-md px-2 py-1.5">
                        {isImageFile(f) ? (
                          <ImageIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        ) : (
                          <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        )}
                        <span className="truncate flex-1">{f.name}</span>
                        <span className="text-muted-foreground shrink-0">{fileTypeLabel(f)} · {(f.size / 1024).toFixed(0)} KB</span>
                        <button type="button" onClick={() => removePhoto(i)}><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label>Receipts / Invoices (max 5 files, 10MB each)</Label>
                <div className="mt-1">
                  <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:bg-secondary/50 transition-colors">
                    <Upload className="h-4 w-4" />
                    <span>Choose files...</span>
                    <input type="file" accept={UNIVERSAL_FILE_ACCEPT} multiple className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []).slice(0, 5 - receipts.length);
                        setReceipts((prev) => [...prev, ...files].slice(0, 5));
                        e.target.value = "";
                      }} />
                  </label>
                </div>
                {receipts.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {receipts.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs bg-muted/50 rounded-md px-2 py-1.5">
                        {isImageFile(f) ? (
                          <ImageIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        ) : (
                          <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        )}
                        <span className="truncate flex-1">{f.name}</span>
                        <span className="text-muted-foreground shrink-0">{fileTypeLabel(f)} · {(f.size / 1024).toFixed(0)} KB</span>
                        <button type="button" onClick={() => removeReceipt(i)}><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Contact opt-in */}
          <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
            <Checkbox id="addContact" checked={form.add_to_contacts}
              onCheckedChange={(checked) => setForm((f) => ({ ...f, add_to_contacts: !!checked }))} />
            <div>
              <Label htmlFor="addContact" className="cursor-pointer">Add me as a contact for this property</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your name, company, email, and phone will be suggested as a contact for the homeowner.
              </p>
            </div>
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={submitting || !form.service_category}>
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</> : "Submit Service Log"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Powered by <span className="font-semibold">HomeLog</span>
        </p>
      </div>
    </div>
  );
};

export default ContractorServiceLog;
