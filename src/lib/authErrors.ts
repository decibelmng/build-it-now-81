const BREACH_MSG =
  "That password has appeared in a known data breach — please choose a different one.";

/**
 * Detects the Supabase "password found in HIBP breach" error and returns a
 * friendly message. Falls back to the original message otherwise.
 */
export function friendlyPasswordError(err: { message?: string; code?: string } | null | undefined): string {
  if (!err) return "";
  const msg = (err.message || "").toLowerCase();
  const code = (err.code || "").toLowerCase();
  if (
    code === "weak_password" ||
    msg.includes("pwned") ||
    msg.includes("compromised") ||
    msg.includes("data breach") ||
    msg.includes("has been found in a data breach")
  ) {
    return BREACH_MSG;
  }
  return err.message || "";
}
