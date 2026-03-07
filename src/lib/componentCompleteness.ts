/**
 * Calculates a data completeness score (0–100) for a home component record.
 *
 * Scoring weights:
 * - install_date: 20 points
 * - manufacturer/model (brand or model): 15 points
 * - warranty_expiration (warranty_expiry): 20 points
 * - last_service_date (last_maintained): 15 points
 * - condition/status (notes as proxy): 10 points
 * - cost (estimated_value): 10 points
 * - contractor info (linked contact via maintenance context): 10 points
 */

interface ComponentRecord {
  install_date?: string | null;
  brand?: string | null;
  model?: string | null;
  warranty_expiry?: string | null;
  last_maintained?: string | null;
  notes?: string | null;
  estimated_value?: number | null;
  // Optional: if the component has a linked contact or contractor info
  contact_id?: string | null;
  last_updated_from_log_id?: string | null;
}

export function calculateComponentCompleteness(component: ComponentRecord): number {
  let score = 0;

  // install_date: 20 points
  if (component.install_date) score += 20;

  // manufacturer/model: 15 points (either brand or model populated)
  if (component.brand || component.model) score += 15;

  // warranty_expiration: 20 points
  if (component.warranty_expiry) score += 20;

  // last_service_date: 15 points
  if (component.last_maintained) score += 15;

  // condition/status: 10 points (notes field serves as condition info)
  if (component.notes && component.notes.trim().length > 0) score += 10;

  // cost: 10 points
  if (component.estimated_value != null && component.estimated_value > 0) score += 10;

  // contractor info: 10 points (linked log or contact)
  if (component.contact_id || component.last_updated_from_log_id) score += 10;

  return Math.min(score, 100);
}
