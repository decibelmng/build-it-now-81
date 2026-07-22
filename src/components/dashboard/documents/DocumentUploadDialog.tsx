import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Upload, X, FileText, Image as ImageIcon, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CATEGORY_GROUPS, CATEGORY_LABELS } from "./constants";
import { UNIVERSAL_FILE_ACCEPT, isImageFile, fileTypeLabel } from "@/lib/fileUploadConstants";
import FilePicker from "@/components/ui/file-picker";
import { SYSTEMS_CATALOG } from "@/lib/homeSystemsRegistry";
import {
import { getPropertyDisplayName } from "@/lib/propertyDisplay";
  documentSchema, validateForm, validateFiles,
  appraisalSchema, mortgageUpdateSchema, taxAssessmentSchema,
} from "@/lib/schemas";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  properties: { id: string; name: string }[];
  onComplete: () => void;
  defaultLinkKey?: "maintenance_log_id" | "home_item_id";
  defaultLinkValue?: string;
  defaultCategory?: string;
}

type Step = "upload" | "appraisal" | "mortgage" | "tax_assessment";

const CurrencyInput = ({ value, onChange, id, placeholder }: { value: string; onChange: (v: string) => void; id?: string; placeholder?: string }) => (
  <div className="relative">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
    <Input
      id={id}
      type="number"
      step="0.01"
      min="0"
      className="pl-7 font-body"
      placeholder={placeholder || "0.00"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

const DocumentUploadDialog = ({ open, onOpenChange, properties, onComplete, defaultLinkKey, defaultLinkValue, defaultCategory }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<File[]>([]);
  const [step, setStep] = useState<Step>("upload");
  const [uploadedDocId, setUploadedDocId] = useState("");
  const [form, setForm] = useState({
    property_id: properties.length === 1 ? properties[0]?.id || "" : "",
    category: defaultCategory || "other",
    title: "",
    description: "",
    document_date: "",
    tags: "",
    maintenance_log_id: defaultLinkKey === "maintenance_log_id" ? (defaultLinkValue || "") : "",
    home_item_id: defaultLinkKey === "home_item_id" ? (defaultLinkValue || "") : "",
    contact_id: "",
    system_key: "",
  });
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Fetch current property for pre-populating mortgage fields
  const { data: currentProperty } = useQuery({
    queryKey: ["property_for_upload", form.property_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", form.property_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!form.property_id && step !== "upload",
  });

  // Reset step when dialog closes
  useEffect(() => {
    if (!open) {
      setStep("upload");
      setUploadedDocId("");
    }
  }, [open]);

  // Maintenance logs for linking
  const { data: maintenanceLogs = [] } = useQuery({
    queryKey: ["maintenance_for_upload", user?.id, form.property_id],
    queryFn: async () => {
      let q = supabase
        .from("maintenance_logs")
        .select("id, title, scheduled_date")
        .order("created_at", { ascending: false })
        .limit(50);
      if (form.property_id) q = q.eq("property_id", form.property_id);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!form.property_id,
  });

  // Inventory items for linking
  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["inventory_for_upload", user?.id, form.property_id],
    queryFn: async () => {
      let q = supabase
        .from("home_items")
        .select("id, name")
        .order("name")
        .limit(100);
      if (form.property_id) q = q.eq("property_id", form.property_id);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!form.property_id,
  });

  // Contacts for linking
  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts_for_upload", user?.id, form.property_id],
    queryFn: async () => {
      let q = supabase
        .from("home_contacts")
        .select("id, name, company")
        .order("name")
        .limit(100);
      if (form.property_id) q = q.eq("property_id", form.property_id);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!form.property_id,
  });

  // Auto-populate system_key when home_item or maintenance_log is selected
  const selectedItem = inventoryItems.find((i: any) => i.id === form.home_item_id);
  const selectedLog = maintenanceLogs.find((l: any) => l.id === form.maintenance_log_id);

  useEffect(() => {
    if (form.home_item_id && selectedItem && (selectedItem as any).system_key) {
      setForm(prev => ({ ...prev, system_key: (selectedItem as any).system_key?.split(":")[0] || "" }));
    } else if (form.maintenance_log_id && selectedLog && (selectedLog as any).system_key) {
      setForm(prev => ({ ...prev, system_key: (selectedLog as any).system_key || "" }));
    }
  }, [form.home_item_id, form.maintenance_log_id]);

  const closeDialog = () => {
    onOpenChange(false);
    setFiles([]);
    setForm({
      property_id: properties.length === 1 ? properties[0]?.id || "" : "",
      category: "other",
      title: "",
      description: "",
      document_date: "",
      tags: "",
      maintenance_log_id: "",
      home_item_id: "",
      contact_id: "",
      system_key: "",
    });
    setStep("upload");
    setUploadedDocId("");
  };

  const handleUpload = async () => {
    if (!user || files.length === 0 || !form.property_id) return;

    const validation = validateForm(documentSchema, form);
    if (!validation.success) {
      toast({ title: validation.error, variant: "destructive" });
      return;
    }

    const fileError = validateFiles(files);
    if (fileError) {
      toast({ title: fileError, variant: "destructive" });
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      let lastDocId = "";
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const filePath = `${user.id}/${form.property_id}/${Date.now()}_${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from("property-documents")
          .upload(filePath, file);
        if (uploadError) throw uploadError;

        const title = form.title || file.name.replace(/\.[^/.]+$/, "");
        const tags = form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : null;

        const { data: insertData, error: insertError } = await supabase.from("documents").insert({
          user_id: user.id,
          property_id: form.property_id,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          name: title,
          title,
          description: form.description || null,
          category: form.category,
          display_type: isImageFile(file) ? "photo" : file.type === "application/pdf" ? "receipt" : "other",
          document_date: form.document_date || null,
          tags,
          maintenance_log_id: form.maintenance_log_id || null,
          home_item_id: form.home_item_id || null,
          contact_id: form.contact_id || null,
          system_key: form.system_key || null,
        }).select("id").single();
        if (insertError) throw insertError;
        lastDocId = insertData?.id || "";

        setProgress(((i + 1) / files.length) * 100);
      }

      toast({ title: `${files.length} document${files.length > 1 ? "s" : ""} uploaded!` });
      onComplete();

      // Check if we should show a post-upload step
      if (files.length === 1 && lastDocId) {
        setUploadedDocId(lastDocId);
        if (form.category === "appraisal") {
          setStep("appraisal");
          return;
        } else if (form.category === "mortgage_statement") {
          setStep("mortgage");
          return;
        } else if (form.category === "tax_records") {
          setStep("tax_assessment");
          return;
        }
      }

      closeDialog();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  // ── APPRAISAL STEP ──
  const AppraisalStep = () => {
    const [appValue, setAppValue] = useState("");
    const [appDate, setAppDate] = useState(form.document_date || new Date().toISOString().split("T")[0]);
    const [appType, setAppType] = useState("professional_appraisal");
    const [appSource, setAppSource] = useState("");
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
      const val = parseFloat(appValue);
      const v = appraisalSchema.safeParse({
        value: val, valuation_date: appDate, valuation_type: appType, source: appSource || undefined,
      });
      if (!v.success) {
        toast({ title: v.error.errors[0]?.message || "Validation failed", variant: "destructive" });
        return;
      }
      setSaving(true);
      try {
        const { error } = await supabase.from("property_valuations" as any).insert({
          property_id: form.property_id,
          user_id: user!.id,
          valuation_type: appType,
          valuation_date: appDate,
          value: val,
          source: appSource || null,
          document_id: uploadedDocId || null,
        });
        if (error) throw error;

        // Update property estimated value if this is newer
        if (currentProperty) {
          const shouldUpdate = !currentProperty.value_last_updated || appDate >= currentProperty.value_last_updated;
          if (shouldUpdate) {
            await supabase.from("properties").update({
              current_estimated_value: val,
              value_last_updated: appDate,
            }).eq("id", form.property_id);
          }
        }

        queryClient.invalidateQueries({ queryKey: ["properties"] });
        queryClient.invalidateQueries({ queryKey: ["property_for_upload"] });
        toast({ title: "Appraisal value recorded" });
        closeDialog();
      } catch (err: any) {
        toast({ title: "Error saving appraisal", description: err.message, variant: "destructive" });
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="space-y-4">
        <DialogHeader>
          <DialogTitle className="font-display">Add appraisal details</DialogTitle>
          <DialogDescription className="font-body">
            We noticed this is an appraisal. Record the appraised value to track your home's worth over time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="font-body">Appraised value *</Label>
            <CurrencyInput value={appValue} onChange={setAppValue} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="font-body">Appraisal date *</Label>
              <Input type="date" value={appDate} onChange={(e) => setAppDate(e.target.value)} className="font-body" />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Appraisal type</Label>
              <Select value={appType} onValueChange={setAppType}>
                <SelectTrigger className="font-body"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional_appraisal" className="font-body">Professional Appraisal</SelectItem>
                  <SelectItem value="refinance_appraisal" className="font-body">Refinance Appraisal</SelectItem>
                  <SelectItem value="comparative_market_analysis" className="font-body">Comparative Market Analysis</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-body">Appraiser / source</Label>
            <Input value={appSource} onChange={(e) => setAppSource(e.target.value)} placeholder="e.g., Bank of America" className="font-body" />
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold">
              {saving ? "Saving..." : "Save to value history"}
            </Button>
            <Button variant="outline" onClick={closeDialog} className="rounded-full font-body">Skip for now</Button>
          </div>
        </div>
      </div>
    );
  };

  // ── MORTGAGE STEP ──
  const MortgageStep = () => {
    const prop = currentProperty;
    const [balance, setBalance] = useState(prop?.mortgage_balance != null ? String(prop.mortgage_balance) : "");
    const [origAmount, setOrigAmount] = useState(prop?.original_loan_amount != null ? String(prop.original_loan_amount) : "");
    const [rate, setRate] = useState(prop?.mortgage_rate != null ? String(prop.mortgage_rate) : "");
    const [payment, setPayment] = useState(prop?.mortgage_payment != null ? String(prop.mortgage_payment) : "");
    const [stmtDate, setStmtDate] = useState(form.document_date || new Date().toISOString().split("T")[0]);
    const [loanTerm, setLoanTerm] = useState(prop?.loan_term_months != null ? String(prop.loan_term_months) : "");
    const [customTerm, setCustomTerm] = useState("");
    const [saving, setSaving] = useState(false);

    const showOrigAmount = prop?.original_loan_amount == null;
    const showLoanTerm = prop?.loan_term_months == null;

    const handleSave = async () => {
      const updates: Record<string, any> = {
        mortgage_last_updated: stmtDate,
        mortgage_document_id: uploadedDocId || null,
      };

      if (balance) updates.mortgage_balance = parseFloat(balance);
      if (rate) updates.mortgage_rate = parseFloat(rate);
      if (payment) updates.mortgage_payment = parseFloat(payment);
      if (showOrigAmount && origAmount) updates.original_loan_amount = parseFloat(origAmount);
      
      const termValue = loanTerm === "other" ? (customTerm ? parseInt(customTerm) : undefined) : (loanTerm ? parseInt(loanTerm) : undefined);
      if (showLoanTerm && termValue) updates.loan_term_months = termValue;

      // Validate numeric fields
      const v = mortgageUpdateSchema.safeParse({
        mortgage_balance: updates.mortgage_balance,
        original_loan_amount: updates.original_loan_amount,
        mortgage_rate: updates.mortgage_rate,
        mortgage_payment: updates.mortgage_payment,
        loan_term_months: updates.loan_term_months,
      });
      if (!v.success) {
        toast({ title: v.error.errors[0]?.message || "Validation failed", variant: "destructive" });
        return;
      }

      setSaving(true);
      try {
        const { error } = await supabase.from("properties").update(updates).eq("id", form.property_id);
        if (error) throw error;

        queryClient.invalidateQueries({ queryKey: ["properties"] });
        queryClient.invalidateQueries({ queryKey: ["property_for_upload"] });
        toast({ title: "Mortgage details updated" });
        closeDialog();
      } catch (err: any) {
        toast({ title: "Error saving mortgage details", description: err.message, variant: "destructive" });
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="space-y-4">
        <DialogHeader>
          <DialogTitle className="font-display">Update your mortgage details</DialogTitle>
          <DialogDescription className="font-body">
            We noticed this is a mortgage statement. Pull a few numbers from it to keep your equity calculation up to date.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-accent/5 border border-accent/20 p-3 flex items-start gap-2.5">
          <Info className="h-4 w-4 text-accent shrink-0 mt-0.5" />
          <p className="font-body text-xs text-muted-foreground">
            These numbers are usually on the first page of your statement. Look for "Principal Balance" or "Remaining Balance", "Interest Rate", and "Monthly Payment Due."
          </p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="font-body">Remaining balance</Label>
              <CurrencyInput value={balance} onChange={setBalance} />
              <p className="font-body text-[11px] text-muted-foreground">The principal balance on your statement</p>
            </div>

            {showOrigAmount ? (
              <div className="space-y-2">
                <Label className="font-body">Original loan amount</Label>
                <CurrencyInput value={origAmount} onChange={setOrigAmount} />
                <p className="font-body text-[11px] text-muted-foreground">The total amount borrowed at closing</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="font-body text-muted-foreground">Original loan amount</Label>
                <p className="font-body text-sm">${Number(prop?.original_loan_amount).toLocaleString()}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label className="font-body">Interest rate</Label>
              <div className="relative">
                <Input
                  type="number" step="0.001" min="0" max="30"
                  className="pr-7 font-body" placeholder="6.250"
                  value={rate} onChange={(e) => setRate(e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
              </div>
              <p className="font-body text-[11px] text-muted-foreground">Your current annual rate</p>
            </div>

            <div className="space-y-2">
              <Label className="font-body">Monthly payment</Label>
              <CurrencyInput value={payment} onChange={setPayment} />
              <p className="font-body text-[11px] text-muted-foreground">Principal + interest (before escrow)</p>
            </div>
          </div>

          <div className={`grid gap-3 ${showLoanTerm ? "grid-cols-1 sm:grid-cols-2" : ""}`}>
            <div className="space-y-2">
              <Label className="font-body">Statement date</Label>
              <Input type="date" value={stmtDate} onChange={(e) => setStmtDate(e.target.value)} className="font-body" />
            </div>

            {showLoanTerm && (
              <div className="space-y-2">
                <Label className="font-body">Loan term</Label>
                <Select value={loanTerm} onValueChange={setLoanTerm}>
                  <SelectTrigger className="font-body"><SelectValue placeholder="Select term" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="360" className="font-body">30 years</SelectItem>
                    <SelectItem value="240" className="font-body">20 years</SelectItem>
                    <SelectItem value="180" className="font-body">15 years</SelectItem>
                    <SelectItem value="120" className="font-body">10 years</SelectItem>
                    <SelectItem value="other" className="font-body">Other</SelectItem>
                  </SelectContent>
                </Select>
                {loanTerm === "other" && (
                  <Input type="number" min="12" max="600" placeholder="Months" value={customTerm} onChange={(e) => setCustomTerm(e.target.value)} className="font-body mt-2" />
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold">
              {saving ? "Saving..." : "Save mortgage details"}
            </Button>
            <Button variant="outline" onClick={closeDialog} className="rounded-full font-body">Skip for now</Button>
          </div>
        </div>
      </div>
    );
  };

  // ── TAX ASSESSMENT STEP ──
  const TaxAssessmentStep = () => {
    const [assessedValue, setAssessedValue] = useState("");
    const [assessYear, setAssessYear] = useState(new Date().getFullYear().toString());
    const [jurisdiction, setJurisdiction] = useState("");
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
      const val = parseFloat(assessedValue);
      const v = taxAssessmentSchema.safeParse({
        value: val, valuation_date: `${assessYear}-01-01`, source: jurisdiction || undefined,
      });
      if (!v.success) {
        toast({ title: v.error.errors[0]?.message || "Validation failed", variant: "destructive" });
        return;
      }
      setSaving(true);
      try {
        const { error } = await supabase.from("property_valuations" as any).insert({
          property_id: form.property_id,
          user_id: user!.id,
          valuation_type: "tax_assessment",
          valuation_date: `${assessYear}-01-01`,
          value: val,
          source: jurisdiction || null,
          document_id: uploadedDocId || null,
        });
        if (error) throw error;

        queryClient.invalidateQueries({ queryKey: ["properties"] });
        toast({ title: "Tax assessment value recorded" });
        closeDialog();
      } catch (err: any) {
        toast({ title: "Error saving assessment", description: err.message, variant: "destructive" });
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="space-y-4">
        <DialogHeader>
          <DialogTitle className="font-display">Record tax assessment value?</DialogTitle>
          <DialogDescription className="font-body">
            If this includes your property's assessed value, add it to your value history.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="font-body">Assessed value *</Label>
            <CurrencyInput value={assessedValue} onChange={setAssessedValue} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="font-body">Assessment year *</Label>
              <Input type="number" min="2000" max="2099" value={assessYear} onChange={(e) => setAssessYear(e.target.value)} className="font-body" />
            </div>
            <div className="space-y-2">
              <Label className="font-body">County / jurisdiction</Label>
              <Input value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)} placeholder="e.g., Maricopa County" className="font-body" />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold">
              {saving ? "Saving..." : "Add to value history"}
            </Button>
            <Button variant="outline" onClick={closeDialog} className="rounded-full font-body">Skip</Button>
          </div>
        </div>
      </div>
    );
  };

  // ── UPLOAD STEP (original form) ──
  const UploadStep = () => (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle className="font-display">Upload Documents</DialogTitle>
      </DialogHeader>

      {/* Property */}
      {properties.length > 1 && (
        <div className="space-y-2">
          <Label className="font-body">Property *</Label>
          <Select value={form.property_id} onValueChange={(v) => setForm({ ...form, property_id: v })}>
            <SelectTrigger className="font-body"><SelectValue placeholder="Select property" /></SelectTrigger>
            <SelectContent>
              {properties.map((p) => (
                <SelectItem key={p.id} value={p.id} className="font-body">{getPropertyDisplayName(p)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* File Picker */}
      <div className="space-y-2">
        <Label className="font-body">Files *</Label>
        <FilePicker files={files} onChange={setFiles} maxFiles={20} label="Drop files here or click to browse" />
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label className="font-body">Category *</Label>
        <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
          <SelectTrigger className="font-body"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-60">
            {Object.entries(CATEGORY_GROUPS).map(([, group]) => (
              <div key={group.label}>
                <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{group.label}</div>
                {group.categories.map((cat) => (
                  <SelectItem key={cat} value={cat} className="font-body text-sm">{CATEGORY_LABELS[cat]}</SelectItem>
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Title & Description */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="font-body">Title</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Auto from filename" className="font-body" />
        </div>
        <div className="space-y-2">
          <Label className="font-body">Document Date</Label>
          <Input type="date" value={form.document_date} onChange={(e) => setForm({ ...form, document_date: e.target.value })} className="font-body" />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="font-body">Description</Label>
        <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" className="font-body" rows={2} />
      </div>

      <div className="space-y-2">
        <Label className="font-body">Tags</Label>
        <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="tag1, tag2, tag3" className="font-body" />
      </div>

      {/* System */}
      <div className="space-y-2">
        <Label className="font-body">System (optional)</Label>
        <Select value={form.system_key || "none"} onValueChange={(v) => setForm({ ...form, system_key: v === "none" ? "" : v })}>
          <SelectTrigger className="font-body text-xs h-9"><SelectValue placeholder="Select system" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none" className="font-body text-xs">No system</SelectItem>
            {SYSTEMS_CATALOG.map((sys) => (
              <SelectItem key={sys.key} value={sys.key} className="font-body text-xs">{sys.icon} {sys.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Optional Linking */}
      <div className="space-y-3 pt-2 border-t border-border">
        <p className="font-body text-xs text-muted-foreground font-medium">Link to (optional)</p>
        <div className="grid grid-cols-1 gap-2">
          {maintenanceLogs.length > 0 && (
            <Select value={form.maintenance_log_id || "none"} onValueChange={(v) => setForm({ ...form, maintenance_log_id: v === "none" ? "" : v })}>
              <SelectTrigger className="font-body text-xs h-9"><SelectValue placeholder="Link to maintenance entry" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="font-body text-xs">No maintenance link</SelectItem>
                {maintenanceLogs.map((log: any) => (
                  <SelectItem key={log.id} value={log.id} className="font-body text-xs">
                    {log.title}{log.scheduled_date ? ` — ${new Date(log.scheduled_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {inventoryItems.length > 0 && (
            <Select value={form.home_item_id || "none"} onValueChange={(v) => setForm({ ...form, home_item_id: v === "none" ? "" : v })}>
              <SelectTrigger className="font-body text-xs h-9"><SelectValue placeholder="Link to inventory item" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="font-body text-xs">No inventory link</SelectItem>
                {inventoryItems.map((item: any) => (
                  <SelectItem key={item.id} value={item.id} className="font-body text-xs">{item.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {contacts.length > 0 && (
            <Select value={form.contact_id || "none"} onValueChange={(v) => setForm({ ...form, contact_id: v === "none" ? "" : v })}>
              <SelectTrigger className="font-body text-xs h-9"><SelectValue placeholder="Link to contractor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="font-body text-xs">No contractor link</SelectItem>
                {contacts.map((c: any) => (
                  <SelectItem key={c.id} value={c.id} className="font-body text-xs">{c.name}{c.company ? ` · ${c.company}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Progress */}
      {uploading && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="font-body text-xs text-muted-foreground text-center">Uploading... {Math.round(progress)}%</p>
        </div>
      )}

      <Button
        onClick={handleUpload}
        disabled={uploading || files.length === 0 || !form.property_id}
        className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold"
      >
        {uploading ? "Uploading..." : `Upload ${files.length} File${files.length !== 1 ? "s" : ""}`}
      </Button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {step === "upload" && <UploadStep />}
        {step === "appraisal" && <AppraisalStep />}
        {step === "mortgage" && <MortgageStep />}
        {step === "tax_assessment" && <TaxAssessmentStep />}
      </DialogContent>
    </Dialog>
  );
};

export default DocumentUploadDialog;
