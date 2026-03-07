
-- Purchase information on properties
alter table public.properties add column purchase_price numeric(12,2);
alter table public.properties add column purchase_date date;
alter table public.properties add column purchase_closing_costs numeric(12,2);

-- Sale information
alter table public.properties add column sale_price numeric(12,2);
alter table public.properties add column sale_date date;
alter table public.properties add column sale_closing_costs numeric(12,2);
alter table public.properties add column agent_commissions numeric(12,2);

-- Expense classification on maintenance_logs
alter table public.maintenance_logs add column expense_type text default 'repair';
alter table public.maintenance_logs add column tax_notes text;

-- Expense classification on contractor_submissions
alter table public.contractor_submissions add column expense_type text default 'repair';

-- Cost basis summary view
create or replace view public.cost_basis_summary as
select
  p.id as property_id,
  p.user_id,
  p.purchase_price,
  p.purchase_date,
  p.purchase_closing_costs,
  p.sale_price,
  p.sale_date,
  p.sale_closing_costs,
  p.agent_commissions,
  coalesce(sum(case when ml.expense_type = 'capital_improvement' then ml.cost else 0 end), 0) as total_improvements,
  coalesce(sum(case when ml.expense_type = 'repair' then ml.cost else 0 end), 0) as total_repairs,
  count(case when ml.expense_type = 'capital_improvement' then 1 end) as improvement_count,
  count(case when ml.expense_type = 'repair' then 1 end) as repair_count,
  coalesce(p.purchase_price, 0)
    + coalesce(p.purchase_closing_costs, 0)
    + coalesce(sum(case when ml.expense_type = 'capital_improvement' then ml.cost else 0 end), 0)
    as adjusted_basis,
  case when p.sale_price is not null then
    p.sale_price
    - coalesce(p.sale_closing_costs, 0)
    - coalesce(p.agent_commissions, 0)
    - (
      coalesce(p.purchase_price, 0)
      + coalesce(p.purchase_closing_costs, 0)
      + coalesce(sum(case when ml.expense_type = 'capital_improvement' then ml.cost else 0 end), 0)
    )
  else null end as estimated_gain
from public.properties p
left join public.maintenance_logs ml on ml.property_id = p.id and ml.cost is not null
group by p.id, p.user_id, p.purchase_price, p.purchase_date, p.purchase_closing_costs,
         p.sale_price, p.sale_date, p.sale_closing_costs, p.agent_commissions;

-- RLS on the view (views inherit from underlying tables, but we enable explicit policy)
alter view public.cost_basis_summary set (security_invoker = on);
