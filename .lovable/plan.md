
# Add "New Contractor" Option in Recurring Templates

## Overview
Add an inline "Add New Contractor" form within the Recurring Templates dialog, so users can create a new contact directly without leaving the workflow. The new contact will be saved to the `home_contacts` table and automatically selected as the assigned contractor.

## How It Works
1. In the contractor dropdown on the Recurring Template form, a new **"+ Add New Contractor"** option will appear at the top of the list
2. Selecting it will expand an inline form below the dropdown with fields for: Name (required), Role, Company, Phone, and Email
3. When the recurring template is submitted, the new contact is created first, then the template is created with that contact linked
4. The new contractor will also appear in the Contacts section going forward

## Technical Details

### Changes to `src/components/dashboard/RecurringTemplates.tsx`

1. **Add state for inline contractor form**
   - Boolean `showNewContact` toggle
   - Object `newContact` with fields: `name`, `role`, `company`, `phone`, `email`

2. **Update the contractor Select dropdown**
   - Add a `"__new__"` option labeled "+ Add New Contractor" at the top of the list
   - When selected, set `showNewContact = true` and clear `contact_id`

3. **Render inline contact fields** when `showNewContact` is true
   - Name (required), Role (select from existing roles list), Company, Phone, Email
   - A "Cancel" link to collapse the form and revert to the dropdown

4. **Update the `addTemplate` mutation**
   - If `showNewContact` is true, first insert into `home_contacts` with the new contact data and the selected `property_id`
   - Use the returned contact ID as the `contact_id` for the new recurring template
   - After success, invalidate both `home_contacts` and `recurring_templates` query caches so the Contacts section stays in sync

### No database changes required
The existing `home_contacts` table already has all the necessary columns. No migrations needed.
