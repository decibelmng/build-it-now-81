import { z } from "zod";

// ── Maintenance Log ──
export const maintenanceLogSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(5000).optional(),
  scheduled_date: z.string().optional(),
  cost: z.string().refine((v) => !v || (!isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 999999), {
    message: "Cost must be between 0 and 999,999",
  }).optional(),
  category: z.string().optional(),
  system_key: z.string().optional(),
  scope: z.string().optional(),
  expense_type: z.string().optional(),
  tax_notes: z.string().max(2000).optional(),
  property_id: z.string().min(1, "Property is required"),
});

// ── Property ──
export const propertySchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  address: z.string().min(1, "Address is required").max(500),
  city: z.string().max(200).optional(),
  state: z.string().max(100).optional(),
  zip: z.string().max(20).optional(),
  property_type: z.enum(["single_family", "condo", "townhouse", "multi_family", "other"]).optional(),
  bedrooms: z.string().refine((v) => !v || (!isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 100), {
    message: "Bedrooms must be 0-100",
  }).optional(),
  bathrooms: z.string().refine((v) => !v || (!isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 100), {
    message: "Bathrooms must be 0-100",
  }).optional(),
  sqft: z.string().refine((v) => !v || (!isNaN(Number(v)) && Number(v) >= 1 && Number(v) <= 100000), {
    message: "Square footage must be 1-100,000",
  }).optional(),
  year_built: z.string().refine((v) => !v || (!isNaN(Number(v)) && Number(v) >= 1800 && Number(v) <= 2030), {
    message: "Year built must be 1800-2030",
  }).optional(),
});

// ── Contact ──
export const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().max(20).optional(),
  company: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  role: z.string().optional(),
  property_id: z.string().min(1, "Property is required"),
});

// ── Document ──
export const documentSchema = z.object({
  title: z.string().max(300).optional(),
  category: z.string().optional(),
  description: z.string().max(2000).optional(),
  document_date: z.string().optional(),
  tags: z.string().max(500).optional(),
  property_id: z.string().min(1, "Property is required"),
});

// ── Home Item ──
export const homeItemSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  category: z.string().optional(),
  brand: z.string().max(200).optional(),
  model: z.string().max(200).optional(),
  serial_number: z.string().max(200).optional(),
  install_date: z.string().optional(),
  last_maintained: z.string().optional(),
  expected_replacement: z.string().optional(),
  warranty_expiry: z.string().optional(),
  notes: z.string().max(2000).optional(),
  estimated_value: z.string().refine((v) => !v || (!isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 9999999), {
    message: "Value must be between 0 and 9,999,999",
  }).optional(),
});

// ── Property Sharing ──
export const propertyShareSchema = z.object({
  email: z.string().email("Invalid email address"),
  property_id: z.string().min(1, "Property is required"),
});

// ── Profile Update ──
export const profileUpdateSchema = z.object({
  display_name: z.string().min(1, "Name is required").max(200),
  phone: z.string().max(20).optional().or(z.literal("")),
});

// ── Recurring Template ──
export const recurringTemplateSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(5000).optional(),
  interval_months: z.number().min(1).max(60),
  category: z.string().optional(),
  system_key: z.string().optional(),
  estimated_cost: z.number().min(0).max(999999).optional(),
  property_id: z.string().min(1, "Property is required"),
  next_due_date: z.string().min(1, "Due date is required"),
});

// ── Transfer Email ──
export const transferEmailSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  property_id: z.string().min(1, "Property is required"),
});

// ── Mortgage Update ──
export const mortgageUpdateSchema = z.object({
  mortgage_balance: z.number().min(0).max(99999999).optional(),
  original_loan_amount: z.number().min(0).max(99999999).optional(),
  mortgage_rate: z.number().min(0).max(30).optional(),
  mortgage_payment: z.number().min(0).max(999999).optional(),
  loan_term_months: z.number().min(12).max(600).optional(),
});

// ── Appraisal Valuation ──
export const appraisalSchema = z.object({
  value: z.number().min(1, "Appraised value is required").max(999999999),
  valuation_date: z.string().min(1, "Date is required"),
  valuation_type: z.string().min(1),
  source: z.string().max(200).optional(),
});

// ── Tax Assessment Valuation ──
export const taxAssessmentSchema = z.object({
  value: z.number().min(1, "Assessed value is required").max(999999999),
  valuation_date: z.string().min(1, "Year is required"),
  source: z.string().max(200).optional(),
});

// ── Valuation (generic) ──
export const valuationSchema = z.object({
  valuation_type: z.string().min(1),
  valuation_date: z.string().min(1, "Date is required"),
  value: z.number().min(1, "Value is required").max(99999999),
  source: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  property_id: z.string().min(1),
});

// ── File Upload Validation ──
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const validateFile = (file: File): string | null => {
  if (file.size > MAX_FILE_SIZE) {
    return `File "${file.name}" exceeds the 10MB size limit`;
  }
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return `File "${file.name}" has an unsupported file type`;
  }
  return null;
};

export const validateFiles = (files: File[]): string | null => {
  for (const file of files) {
    const error = validateFile(file);
    if (error) return error;
  }
  return null;
};

/**
 * Helper: validate form data with a Zod schema.
 * Returns { success: true, data } or { success: false, error: string }.
 */
export const validateForm = <T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } => {
  const result = schema.safeParse(data);
  if (!result.success) {
    return { success: false, error: result.error.errors[0]?.message ?? "Validation failed" };
  }
  return { success: true, data: result.data };
};
