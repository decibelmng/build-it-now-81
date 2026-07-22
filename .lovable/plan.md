# Global Property Filter

One persistent property selector, same placement on every dashboard page, wired into every list.

## 1. Shared state

**New file** `src/hooks/usePropertyFilter.tsx`
- `PropertyFilterProvider` — mounts in `Dashboard.tsx` inside `SubscriptionProvider`.
- State: `selectedPropertyId: string | "all"`, default `"all"`.
- On mount: read `localStorage["propertyFilter"]`, verify id still exists in the user's `properties` (query `id, is_archived`), else fall back to `"all"`. Persist on change.
- Exposes `usePropertyFilter()` → `{ selectedPropertyId, setSelectedPropertyId, properties, activeProperty }` where `properties` is the filtered (non-archived) list used everywhere.

## 2. Shared component

**New file** `src/components/dashboard/PropertyFilterBar.tsx`
- Props: `{ allowAll?: boolean = true; onChange?: (id) => void }`.
- Renders `null` when `properties.length < 2`.
- 2–4 properties → shadcn `Tabs` segmented control (styled to match `PropertyUtilities`), first tab "All" (when allowed) then one per property (short name = first word or truncated `name`).
- 5+ → shadcn `Select`, "All properties" first entry, then all.
- Reads/writes context; `allowAll=false` variant used by `TaxInvestmentPage` with local override (see §5).

## 3. Placement

Directly under the page title/subtitle, above all content, full-width row (`className="mb-6"`). Applied to every section listed below.

Replace ad-hoc controls (remove local state, read from context):
- `PropertyUtilities.tsx` — remove property Tabs.
- `SavingsTracking.tsx` — remove "All" tabs.
- `PropertyTimeline.tsx` — remove property Select.
- `HomeInventoryPage.tsx` — remove local Select (add "All" support, see §4).
- `TaxInvestmentPage.tsx` — see §5.

## 4. Wire into every list

For each section: read `selectedPropertyId` from context and filter queries/derived data client-side (RLS untouched). When `"all"`, render a small property badge on each row/card (short property name from context map).

Sections updated:
- `MaintenanceLog.tsx` — logs list + stats aggregations.
- `HomeContacts.tsx` — contacts filtered by `property_id`; utility-derived contacts inherit their utility's `property_id`.
- `DocumentVault.tsx` — documents list.
- `RecurringTemplates.tsx`.
- `ContractorLinks.tsx`, `ContractorSubmissions.tsx`.
- `AnalyticsInsights.tsx` — chart data scoped to selected property.
- `HomeInventoryPage.tsx` — "all" groups items under `<h3>` property subheadings; when specific, current behavior.
- `DashboardOverview.tsx` — stat cards + recent activity respect filter. `PortfolioRollup` always renders unfiltered (documented note).

## 5. Single-property-only pages

`TaxInvestmentPage.tsx`:
- Uses `PropertyFilterBar allowAll={false}` with `onChange` writing to a local `taxPropertyId` state.
- If global selection is `"all"`, local state defaults to `properties[0].id` without calling `setSelectedPropertyId` on the context.
- If global is a specific property, mirror it locally on mount and when it changes.

## 6. Create-form defaults

When a specific property is globally selected, every "Add" dialog pre-fills `property_id`:
- New maintenance log, contact, document, utility account, inventory item, recurring template.
Still editable inside the dialog.

## 7. New-entry consistency

Shared helper `notifySavedToDifferentProperty(newPropertyId)`:
- If new entry's `property_id !== selectedPropertyId` and filter isn't `"all"`, fire sonner toast: `Saved to {name}` with `View` action calling `setSelectedPropertyId(newPropertyId)`.
- Called from the save handlers of every add/edit dialog listed in §6.

## Technical notes

- Non-invasive: no query/RLS changes, only client-side filter + form defaults.
- Property lookup map `{id → shortName}` provided by context for badge rendering.
- Archived properties (`is_archived` if column exists) excluded from bar options but still shown if selection lands on one (guarded by fallback to "all").
- Backwards compat: sections that currently accept a `propertyId` prop keep working; the filter overrides.

## Files touched

New: `src/hooks/usePropertyFilter.tsx`, `src/components/dashboard/PropertyFilterBar.tsx`, `src/lib/propertyFilterToast.ts`.

Edited: `src/pages/Dashboard.tsx`, `DashboardOverview.tsx`, `PropertyCards.tsx` (no bar; already property-scoped), `HomeInventoryPage.tsx`, `MaintenanceLog.tsx`, `HomeContacts.tsx`, `DocumentVault.tsx` (or `documents/DocumentsHub.tsx`), `RecurringTemplates.tsx`, `ContractorLinks.tsx`, `ContractorSubmissions.tsx`, `AnalyticsInsights.tsx`, `PropertyUtilities.tsx`, `PropertyTimeline.tsx`, `SavingsTracking.tsx`, `TaxInvestmentPage.tsx`.
