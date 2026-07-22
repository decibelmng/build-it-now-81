/**
 * Simple store for a pending "add/edit component" action
 * that survives navigation between dashboard sections.
 */
export interface PendingAction {
  category: string;
  mode: "add" | "edit";
  timestamp: number;
  prefill?: {
    name?: string;
    system_key?: string;
    install_date?: string;
    purchase_price?: string;
  };
  retirement_log_id?: string;
}

let pending: PendingAction | null = null;

export function setPendingInventoryAction(action: PendingAction) {
  pending = action;
}

export function consumePendingInventoryAction(): PendingAction | null {
  const action = pending;
  pending = null;
  return action;
}
