import type { Tables } from "@/integrations/supabase/types";

export type ResidencyType = "owned" | "renting" | "renting_out" | "second_home";

type PropertyLike = Partial<Tables<"properties">> | null | undefined;

/**
 * Single source of truth for residency-driven feature flags across
 * the My Home experience. Callers should use these booleans instead
 * of inline string checks against `residency_type`.
 */
export function useResidencyFeatures(property: PropertyLike) {
  const residency = (((property as any)?.residency_type as ResidencyType) || "owned");
  const isRenting = residency === "renting";
  const isRentingOut = residency === "renting_out";
  const isSecondHome = residency === "second_home";
  const isOwned = residency === "owned";

  return {
    residency,
    isRenting,
    isRentingOut,
    isSecondHome,
    isOwned,
    // Purchase / cost-basis / closing costs / sale — hidden only for renters.
    // Landlords and second-home owners keep full financial features.
    showPurchaseInfo: !isRenting,
    showClosingCosts: !isRenting,
    showCostBasis: !isRenting,
    showSaleInfo: !isRenting,
    showTaxInvestment: !isRenting,
    showLeaseDetails: isRenting,
    canTransfer: !isRenting,
    // Structural systems (roof/HVAC/plumbing/electrical/exterior/foundation)
    // default to disabled when the user is renting.
    disableStructuralSystems: isRenting,
  };
}

export const RESIDENCY_OPTIONS: { value: ResidencyType; label: string; hint: string }[] = [
  { value: "owned", label: "I own and live here", hint: "Primary residence" },
  { value: "renting", label: "I rent this home", hint: "Track what's yours" },
  { value: "renting_out", label: "I own it and rent it out", hint: "Landlord / rental property" },
  { value: "second_home", label: "Second or vacation home", hint: "Second home you own" },
];
