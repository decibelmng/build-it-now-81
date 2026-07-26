import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Normalises anything into the only format a native date input accepts: "YYYY-MM-DD".
 * Handles Supabase timestamps ("2019-04-12T00:00:00+00:00"), Date objects, null,
 * undefined, empty strings, and the invalid "0000-..." values that break the year field.
 */
export function toDateInputValue(input: unknown): string {
  if (!input) return "";
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) return "";
    const y = input.getFullYear();
    if (y < 1000 || y > 9999) return "";
    const m = String(input.getMonth() + 1).padStart(2, "0");
    const d = String(input.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  }
  if (typeof input !== "string") return "";
  const match = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "";
  if (match[1] === "0000") return "";
  return match[1] + "-" + match[2] + "-" + match[3];
}

/** Value to send to Supabase: a clean "YYYY-MM-DD" date string, or null when empty. */
export function toDbDate(value: unknown): string | null {
  const v = toDateInputValue(value);
  return v === "" ? null : v;
}

/** Parses a "YYYY-MM-DD" string into a local Date without the UTC off-by-one-day shift. */
export function fromDateInputValue(value: unknown): Date | undefined {
  const v = toDateInputValue(value);
  if (!v) return undefined;
  const d = new Date(v + "T00:00:00");
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export interface DateFieldProps
  extends Omit<
    React.ComponentPropsWithoutRef<typeof Input>,
    "type" | "value" | "onChange"
  > {
  /** Always a plain "YYYY-MM-DD" string (or null/undefined/timestamp, which is normalised). */
  value: string | Date | null | undefined;
  /** Receives a plain "YYYY-MM-DD" string, or "" when the field is cleared. */
  onChange: (value: string) => void;
}

export const DateField = React.forwardRef<HTMLInputElement, DateFieldProps>(
  (
    { value, onChange, className, min = "1900-01-01", max = "2100-12-31", ...props },
    ref
  ) => {
    return (
      <Input
        {...props}
        ref={ref}
        type="date"
        min={min}
        max={max}
        className={cn("block", className)}
        value={toDateInputValue(value)}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
);
DateField.displayName = "DateField";
