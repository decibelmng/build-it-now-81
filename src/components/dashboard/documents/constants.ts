// Category groups and their specific categories for the Documents Hub

export const CATEGORY_GROUPS: Record<string, { label: string; categories: string[] }> = {
  property: {
    label: "Property Documents",
    categories: ["deed_title", "survey_plat", "closing_documents", "appraisal", "tax_records"],
  },
  insurance: {
    label: "Insurance",
    categories: ["insurance_policy", "supplemental_insurance", "insurance_claim", "home_warranty"],
  },
  legal: {
    label: "Legal & Compliance",
    categories: ["mortgage_lien", "hoa_agreement", "hoa_minutes", "permits", "zoning", "environmental_report"],
  },
  design: {
    label: "Design & Construction",
    categories: ["architectural_plans", "renovation_plans", "engineering_report", "landscaping_plans", "as_built_drawings"],
  },
  inspections: {
    label: "Inspections",
    categories: ["home_inspection", "pest_inspection", "well_septic_inspection", "pool_inspection", "code_compliance"],
  },
  manuals: {
    label: "Manuals & Warranties",
    categories: ["appliance_manual", "system_manual", "warranty_card"],
  },
  financial: {
    label: "Financial",
    categories: ["mortgage_statement", "property_tax_bill", "utility_bill", "contractor_invoice", "improvement_receipt"],
  },
  maintenance: {
    label: "Maintenance & Repairs",
    categories: ["maintenance_photo", "maintenance_receipt", "maintenance_document"],
  },
  inventory: {
    label: "Inventory",
    categories: ["inventory_photo", "inventory_document"],
  },
  other: {
    label: "Other",
    categories: ["other"],
  },
};

export const CATEGORY_LABELS: Record<string, string> = {
  deed_title: "Deed & Title",
  survey_plat: "Survey / Plat",
  closing_documents: "Closing Documents",
  appraisal: "Appraisal",
  tax_records: "Tax Records",
  mortgage_lien: "Mortgage / Lien",
  insurance_policy: "Insurance Policy",
  supplemental_insurance: "Supplemental Insurance",
  insurance_claim: "Insurance Claim",
  home_warranty: "Home Warranty",
  hoa_agreement: "HOA Agreement",
  hoa_minutes: "HOA Minutes",
  permits: "Permits",
  zoning: "Zoning",
  environmental_report: "Environmental Report",
  architectural_plans: "Architectural Plans",
  renovation_plans: "Renovation Plans",
  engineering_report: "Engineering Report",
  landscaping_plans: "Landscaping Plans",
  as_built_drawings: "As-Built Drawings",
  home_inspection: "Home Inspection",
  pest_inspection: "Pest Inspection",
  well_septic_inspection: "Well / Septic Inspection",
  pool_inspection: "Pool Inspection",
  code_compliance: "Code Compliance",
  appliance_manual: "Appliance Manual",
  system_manual: "System Manual",
  warranty_card: "Warranty Card",
  mortgage_statement: "Mortgage Statement",
  property_tax_bill: "Property Tax Bill",
  utility_bill: "Utility Bill",
  contractor_invoice: "Contractor Invoice",
  improvement_receipt: "Improvement Receipt",
  maintenance_photo: "Maintenance Photo",
  maintenance_receipt: "Maintenance Receipt",
  maintenance_document: "Maintenance Document",
  inventory_photo: "Inventory Photo",
  inventory_document: "Inventory Document",
  other: "Other",
};

export const DISPLAY_TYPES = [
  { value: "photo", label: "Photo" },
  { value: "receipt", label: "Receipt" },
  { value: "invoice", label: "Invoice" },
  { value: "manual", label: "Manual" },
  { value: "report", label: "Report" },
  { value: "plan", label: "Plan" },
  { value: "contract", label: "Contract" },
  { value: "other", label: "Other" },
];

export const SOURCE_FILTERS = [
  { value: "all", label: "All Sources" },
  { value: "direct", label: "Direct Upload" },
  { value: "maintenance", label: "Maintenance Log" },
  { value: "contractor", label: "Contractor Submission" },
  { value: "inventory", label: "Inventory Item" },
];

export const FILE_TYPE_FILTERS = [
  { value: "all", label: "All Types" },
  { value: "photo", label: "Photos" },
  { value: "pdf", label: "PDFs" },
  { value: "doc", label: "Documents" },
];

export type DocumentFilters = {
  search: string;
  categoryGroup: string;
  category: string;
  source: string;
  fileType: string;
  contactId: string;
  dateFrom: string;
  dateTo: string;
  dateField: "uploaded_at" | "document_date";
  systemKey: string;
};

export const DEFAULT_FILTERS: DocumentFilters = {
  search: "",
  categoryGroup: "all",
  category: "all",
  source: "all",
  fileType: "all",
  contactId: "all",
  dateFrom: "",
  dateTo: "",
  dateField: "uploaded_at",
  systemKey: "all",
};

export function getSourceFromDoc(doc: any): "direct" | "maintenance" | "contractor" | "inventory" {
  if (doc.maintenance_log_id) return "maintenance";
  if (doc.contractor_submission_id) return "contractor";
  if (doc.home_item_id) return "inventory";
  return "direct";
}

export function getSourceIcon(source: string) {
  switch (source) {
    case "maintenance": return "wrench";
    case "contractor": return "user";
    case "inventory": return "package";
    default: return "upload";
  }
}

export function getActiveFilterCount(filters: DocumentFilters): number {
  let count = 0;
  if (filters.search) count++;
  if (filters.categoryGroup !== "all") count++;
  if (filters.category !== "all") count++;
  if (filters.source !== "all") count++;
  if (filters.fileType !== "all") count++;
  if (filters.contactId !== "all") count++;
  if (filters.systemKey !== "all") count++;
  if (filters.dateFrom || filters.dateTo) count++;
  return count;
}
