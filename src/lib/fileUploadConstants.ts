/**
 * Universal accept string for all file upload inputs.
 */
export const UNIVERSAL_FILE_ACCEPT =
  "image/jpeg,image/png,image/heic,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * Check if a file type is an image.
 */
export const isImageFile = (fileOrType: File | string): boolean => {
  const type = typeof fileOrType === "string" ? fileOrType : fileOrType.type;
  return type.startsWith("image/");
};

/**
 * Check if a file type is a PDF.
 */
export const isPdfFile = (fileOrType: File | string): boolean => {
  const type = typeof fileOrType === "string" ? fileOrType : fileOrType.type;
  return type === "application/pdf";
};

/**
 * Get a display-friendly file type label.
 */
export const fileTypeLabel = (file: File): string => {
  if (isImageFile(file)) return "Image";
  if (isPdfFile(file)) return "PDF";
  if (file.type.includes("word") || file.type.includes("document")) return "DOC";
  return "File";
};
