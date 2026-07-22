import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, subMonths, parseISO } from "date-fns";

export interface MonthlySavings {
  month: string; // yyyy-MM
  label: string; // MMM yy
  expenses: number;
  income: number;
  net_spend: number;
  deposit: number | null;
  accrual: number | null; // null if deposit is null
}

export interface HomeSavingsResult {
  months: MonthlySavings[]; // oldest -> newest, length 12
  current: MonthlySavings | null;
  cumulativeSaved: number; // running sum of accruals (nulls skipped)
  coverageCount: number; // months where accrual >= 0 (deposit non-null)
  depositTotal: number | null; // aggregate monthly deposit (per prop or sum)
  hasDeposit: boolean;
  isLoading: boolean;
}

export function useHomeSavings(propertyId?: string | null): HomeSavingsResult {
  const { user } = useAuth();

  // 12-month window (inclusive of current month)
  const windowStart = useMemo(() => startOfMonth(subMonths(new Date(), 11)), []);
  const windowStartIso = format(windowStart, "yyyy-MM-dd");

  const { data: properties = [] } = useQuery({
    queryKey: ["home_savings_properties", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, monthly_deposit");
      if (error) throw error;
      return data as { id: string; monthly_deposit: number | null }[];
    },
    enabled: !!user,
  });

  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["home_savings_payments", user?.id, propertyId, windowStartIso],
    queryFn: async () => {
      let q = supabase
        .from("utility_payments")
        .select("amount, payment_month, property_id, property_utilities!inner(is_income)")
        .gte("payment_month", windowStartIso);
      if (propertyId) q = q.eq("property_id", propertyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["home_savings_logs", user?.id, propertyId, windowStartIso],
    queryFn: async () => {
      let q = supabase
        .from("maintenance_logs")
        .select("cost, completed_date, property_id")
        .eq("status", "completed")
        .gte("completed_date", windowStartIso);
      if (propertyId) q = q.eq("property_id", propertyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as { cost: number | null; completed_date: string | null; property_id: string | null }[];
    },
    enabled: !!user,
  });

  const depositTotal = useMemo(() => {
    const scope = propertyId
      ? properties.filter((p) => p.id === propertyId)
      : properties;
    const vals = scope
      .map((p) => (p.monthly_deposit != null ? Number(p.monthly_deposit) : null))
      .filter((v) => v != null) as number[];
    if (vals.length === 0) return null;
    return vals.reduce((s, v) => s + v, 0);
  }, [properties, propertyId]);

  const months: MonthlySavings[] = useMemo(() => {
    const buckets = new Map<string, { expenses: number; income: number }>();
    for (let i = 11; i >= 0; i--) {
      const d = startOfMonth(subMonths(new Date(), i));
      buckets.set(format(d, "yyyy-MM"), { expenses: 0, income: 0 });
    }

    payments.forEach((p) => {
      const key = format(startOfMonth(parseISO(p.payment_month)), "yyyy-MM");
      const bucket = buckets.get(key);
      if (!bucket) return;
      const amt = Number(p.amount) || 0;
      const isIncome = !!p.property_utilities?.is_income;
      if (isIncome) bucket.income += amt;
      else bucket.expenses += amt;
    });

    logs.forEach((l) => {
      if (!l.completed_date || l.cost == null) return;
      const key = format(startOfMonth(parseISO(l.completed_date)), "yyyy-MM");
      const bucket = buckets.get(key);
      if (!bucket) return;
      bucket.expenses += Number(l.cost) || 0;
    });

    return Array.from(buckets.entries()).map(([month, b]) => {
      const net_spend = b.expenses - b.income;
      const deposit = depositTotal;
      const accrual = deposit == null ? null : deposit - net_spend;
      return {
        month,
        label: format(parseISO(month + "-01"), "MMM"),
        expenses: b.expenses,
        income: b.income,
        net_spend,
        deposit,
        accrual,
      };
    });
  }, [payments, logs, depositTotal]);

  const cumulativeSaved = useMemo(
    () => months.reduce((s, m) => s + (m.accrual ?? 0), 0),
    [months]
  );

  const coverageCount = useMemo(
    () => months.filter((m) => m.accrual != null && m.accrual >= 0).length,
    [months]
  );

  return {
    months,
    current: months[months.length - 1] ?? null,
    cumulativeSaved,
    coverageCount,
    depositTotal,
    hasDeposit: depositTotal != null,
    isLoading: paymentsLoading || logsLoading,
  };
}
