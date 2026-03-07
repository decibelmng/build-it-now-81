import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

/**
 * Determines category and display_type from a file's MIME type for document indexing.
 */
function classifyFile(
  fileType: string | null,
  context: "maintenance" | "inventory" | "contractor"
): { category: string; display_type: string } {
  const isImage = fileType?.startsWith("image/");
  const isPdf = fileType === "application/pdf";

  switch (context) {
    case "maintenance":
      if (isImage) return { category: "maintenance_photo", display_type: "photo" };
      if (isPdf) return { category: "maintenance_receipt", display_type: "receipt" };
      return { category: "maintenance_document", display_type: "other" };
    case "contractor":
      if (isImage) return { category: "maintenance_photo", display_type: "photo" };
      if (isPdf) return { category: "maintenance_receipt", display_type: "receipt" };
      return { category: "maintenance_document", display_type: "other" };
    case "inventory":
      if (isImage) return { category: "inventory_photo", display_type: "photo" };
      if (isPdf) return { category: "inventory_document", display_type: "manual" };
      return { category: "inventory_document", display_type: "other" };
  }
}

/**
 * Idempotently indexes a file into the documents table.
 * Checks for existing row with matching file_path before inserting.
 */
export async function indexDocument(params: {
  file_path: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  property_id: string;
  user_id: string;
  title: string;
  context: "maintenance" | "inventory" | "contractor";
  maintenance_log_id?: string | null;
  contractor_submission_id?: string | null;
  home_item_id?: string | null;
  contact_id?: string | null;
  system_key?: string | null;
}): Promise<void> {
  // Check for existing document with this file_path (idempotency)
  const { data: existing } = await supabase
    .from("documents")
    .select("id")
    .eq("file_path", params.file_path)
    .maybeSingle();

  if (existing) return; // Already indexed

  const { category, display_type } = classifyFile(params.file_type, params.context);

  await supabase.from("documents").insert({
    file_path: params.file_path,
    file_name: params.file_name,
    name: params.title,
    title: params.title,
    file_type: params.file_type,
    file_size: params.file_size,
    property_id: params.property_id,
    user_id: params.user_id,
    category,
    display_type,
    maintenance_log_id: params.maintenance_log_id || null,
    contractor_submission_id: params.contractor_submission_id || null,
    home_item_id: params.home_item_id || null,
    contact_id: params.contact_id || null,
    system_key: params.system_key || null,
  });
}

/**
 * Removes the document index row for a given file_path.
 */
export async function removeDocumentIndex(file_path: string): Promise<void> {
  await supabase.from("documents").delete().eq("file_path", file_path);
}

/**
 * Indexes a maintenance log photo.
 */
export async function indexMaintenancePhoto(params: {
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  property_id: string;
  user_id: string;
  maintenance_log_id: string;
  log_title: string;
  log_date?: string;
}): Promise<void> {
  const dateStr = params.log_date
    ? format(new Date(params.log_date), "MMM d, yyyy")
    : format(new Date(), "MMM d, yyyy");
  const title = `${params.log_title} — ${dateStr}`;

  await indexDocument({
    ...params,
    title,
    context: "maintenance",
  });
}

/**
 * Indexes files from a contractor submission (called on approval).
 */
export async function indexContractorSubmissionFiles(params: {
  submission: {
    id: string;
    property_id: string;
    contractor_company_name: string;
    service_category: string;
    service_date: string;
    photos?: string[] | null;
    receipt_files?: string[] | null;
    add_to_contacts?: boolean;
    system_key?: string | null;
  };
  user_id: string;
  contact_id?: string | null;
}): Promise<void> {
  const { submission, user_id, contact_id } = params;
  const dateStr = format(new Date(submission.service_date), "MMM d, yyyy");
  const title = `${submission.contractor_company_name} — ${submission.service_category} — ${dateStr}`;

  const allFiles: { path: string; type: "photo" | "receipt" }[] = [
    ...(submission.photos || []).map((p) => ({ path: p, type: "photo" as const })),
    ...(submission.receipt_files || []).map((p) => ({ path: p, type: "receipt" as const })),
  ];

  for (const file of allFiles) {
    const fileName = file.path.split("/").pop() || file.path;
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    const isImage = ["jpg", "jpeg", "png", "gif", "webp", "heic"].includes(ext);
    const fileType = isImage ? `image/${ext === "jpg" ? "jpeg" : ext}` : "application/pdf";

    await indexDocument({
      file_path: file.path,
      file_name: fileName,
      file_type: fileType,
      file_size: null,
      property_id: submission.property_id,
      user_id,
      title,
      context: "contractor",
      contractor_submission_id: submission.id,
      contact_id: contact_id || null,
      system_key: submission.system_key || null,
    });
  }
}

/**
 * Indexes a home inventory item attachment.
 */
export async function indexInventoryAttachment(params: {
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  property_id: string;
  user_id: string;
  home_item_id: string;
  item_name: string;
}): Promise<void> {
  await indexDocument({
    ...params,
    title: params.item_name,
    context: "inventory",
  });
}
