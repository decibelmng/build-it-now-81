/**
 * Simple store for a pending "add/edit component" action
 * that survives navigation between dashboard sections.
 */
export interface PendingAction {
  category: string;
  mode: "add" | "edit";
  timestamp: number;
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
