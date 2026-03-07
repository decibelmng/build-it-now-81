import { useRef, useState, useEffect } from "react";
import { Upload, X, FileText, Image as ImageIcon } from "lucide-react";
import { UNIVERSAL_FILE_ACCEPT, isImageFile, fileTypeLabel } from "@/lib/fileUploadConstants";

interface FilePickerProps {
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  label?: string;
  accept?: string;
  /** If true, shows a compact single-line style */
  compact?: boolean;
}

const FilePicker = ({
  files,
  onChange,
  maxFiles = 10,
  label = "Click to add photos or documents",
  accept = UNIVERSAL_FILE_ACCEPT,
  compact = false,
}: FilePickerProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<Record<number, string>>({});
  const [dragOver, setDragOver] = useState(false);

  // Generate previews for image files
  useEffect(() => {
    const newPreviews: Record<number, string> = {};
    const readers: FileReader[] = [];

    files.forEach((file, idx) => {
      if (isImageFile(file)) {
        const reader = new FileReader();
        readers.push(reader);
        reader.onload = (e) => {
          newPreviews[idx] = e.target?.result as string;
          setPreviews((prev) => ({ ...prev, [idx]: e.target?.result as string }));
        };
        reader.readAsDataURL(file);
      }
    });

    return () => {
      readers.forEach((r) => {
        try { r.abort(); } catch { /* ignore */ }
      });
    };
  }, [files]);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const remaining = maxFiles - files.length;
    const newFiles = [...files, ...selected.slice(0, remaining)];
    onChange(newFiles);
    e.target.value = "";
  };

  const remove = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
    setPreviews((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        multiple
        onChange={handleSelect}
      />
      <div
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          dragOver ? "border-accent bg-accent/10" : "border-border/50 hover:border-accent/50 hover:bg-accent/5"
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(false);
          const dropped = Array.from(e.dataTransfer.files);
          const remaining = maxFiles - files.length;
          if (remaining > 0) onChange([...files, ...dropped.slice(0, remaining)]);
        }}
      >
        <Upload className="mx-auto h-6 w-6 text-muted-foreground mb-1" />
        <p className="font-body text-xs text-muted-foreground">{dragOver ? "Drop files here" : label}</p>
        {files.length > 0 && (
          <p className="font-body text-[10px] text-muted-foreground mt-1">
            {files.length}/{maxFiles} files selected
          </p>
        )}
      </div>

      {files.length > 0 && (
        <div className="space-y-1.5 mt-2">
          {files.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 text-xs font-body bg-muted/50 rounded-md px-2 py-1.5"
            >
              {isImageFile(file) ? (
                previews[idx] ? (
                  <img
                    src={previews[idx]}
                    alt={file.name}
                    className="h-8 w-8 rounded object-cover shrink-0"
                  />
                ) : (
                  <ImageIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                )
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded bg-secondary shrink-0">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <span className="truncate block">{file.name}</span>
                <span className="text-muted-foreground text-[10px]">
                  {fileTypeLabel(file)} · {(file.size / 1024).toFixed(0)} KB
                </span>
              </div>
              <button
                type="button"
                className="text-muted-foreground hover:text-destructive shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  remove(idx);
                }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FilePicker;
