import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Home, TrendingUp, DollarSign, Wallet } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { usePropertyEquity } from "@/hooks/usePropertyEquity";

interface Props {
  properties: any[];
  onSelectProperty: (id: string) => void;
}

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  single_family: "Single Family",
  condo: "Condo",
  townhouse: "Townhouse",
  multi_family: "Multi-Family",
  vacation: "Vacation",
  investment: "Investment",
  other: "Other",
};

const fmt = (n: number | null | undefined) => {
  if (n == null || Number.isNaN(Number(n))) return "—";
  const v = Number(n);
  if (v === 0) return "$0";
  return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

const fmtPct = (n: number | null | undefined) => {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return `${Number(n) > 0 ? "" : ""}${Number(n).toFixed(1)}%`;
};

const PortfolioRollup = ({ properties, onSelectProperty }: Props) => {
  const { user } = useAuth();
  const { data: equity = [] } = usePropertyEquity();

  const propertyIds = properties.map((p) => p.id);

  // Active utility accounts across all properties
  const { data: accounts = [] } = useQuery({
    queryKey: ["portfolio_accounts", user?.id, propertyIds.join(",")],
    queryFn: async () => {
      if (propertyIds.length === 0) return [];
      const { data, error } = await supabase
        .from("property_utilities")
        .select("id, property_id, monthly_cost, is_income, status")
        .in("property_id", propertyIds)
        .eq("status", "active");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && propertyIds.length > 0,
  });

  // Latest actual payment per account
  const accountIds = accounts.map((a: any) => a.id);
  const { data: latestPayments = [] } = useQuery({
    queryKey: ["portfolio_latest_payments", accountIds.join(",")],
    queryFn: async () => {
      if (accountIds.length === 0) return [];
      const { data, error } = await supabase
        .from("utility_payments")
        .select("utility_id, amount, payment_month")
        .in("utility_id", accountIds)
        .order("payment_month", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: accountIds.length > 0,
  });

  // Map utility_id -> latest amount
  const latestByAccount = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of latestPayments as any[]) {
      if (!m.has(p.utility_id)) m.set(p.utility_id, Number(p.amount) || 0);
    }
    return m;
  }, [latestPayments]);

  // Per-property rollup
  const rows = useMemo(() => {
    return properties.map((prop) => {
      const eq = equity.find((e) => e.property_id === prop.id);
      const propAccounts = (accounts as any[]).filter((a) => a.property_id === prop.id);
      let monthlyExpense = 0;
      let monthlyIncome = 0;
      for (const a of propAccounts) {
        const actual = latestByAccount.get(a.id);
        const amt = actual != null ? actual : Number(a.monthly_cost) || 0;
        if (a.is_income) monthlyIncome += amt;
        else monthlyExpense += amt;
      }
      return {
        id: prop.id,
        name: prop.name || "Untitled",
        type: prop.property_type || "other",
        value: eq?.current_estimated_value ?? null,
        mortgage: eq?.mortgage_balance ?? null,
        payment: eq?.mortgage_payment ?? null,
        monthlyExpense,
        monthlyIncome,
        equity: eq?.estimated_equity ?? null,
      };
    });
  }, [properties, equity, accounts, latestByAccount]);

  const totals = useMemo(() => {
    const t = {
      value: 0,
      mortgage: 0,
      payment: 0,
      monthlyExpense: 0,
      monthlyIncome: 0,
      equity: 0,
    };
    for (const r of rows) {
      t.value += r.value || 0;
      t.mortgage += r.mortgage || 0;
      t.payment += r.payment || 0;
      t.monthlyExpense += r.monthlyExpense;
      t.monthlyIncome += r.monthlyIncome;
      t.equity += r.equity || 0;
    }
    return t;
  }, [rows]);

  const netEquityPct = totals.value > 0 ? (totals.equity / totals.value) * 100 : null;
  const monthlyNet = totals.monthlyExpense - totals.monthlyIncome;

  const stats = [
    { label: "Total Value", value: fmt(totals.value), icon: Home, color: "text-accent" },
    { label: "Total Debt", value: fmt(totals.mortgage), icon: DollarSign, color: "text-destructive" },
    {
      label: "Net Equity",
      value: fmt(totals.equity),
      subValue: netEquityPct != null ? `(${fmtPct(netEquityPct)})` : undefined,
      icon: TrendingUp,
      color: "text-sage",
    },
    { label: "Monthly Net Cost", value: fmt(monthlyNet), icon: Wallet, color: "text-accent" },
  ];

  const donutData = [
    { name: "Equity", value: Math.max(0, totals.equity) },
    { name: "Debt", value: Math.max(0, totals.mortgage) },
  ];
  const hasDonut = donutData[0].value > 0 || donutData[1].value > 0;
  const DONUT_COLORS = ["hsl(var(--sage))", "hsl(var(--destructive))"];

  const handleRowClick = (id: string) => {
    sessionStorage.setItem("selectedPropertyId", id);
    onSelectProperty(id);
  };

  return (
    <div className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold">Portfolio</h3>
          <p className="font-body text-xs text-muted-foreground">
            {properties.length} properties · rolled up
          </p>
        </div>
      </div>

      {/* Portfolio strip */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="border-border/50">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div className="min-w-0">
                <p className="font-body text-xs text-muted-foreground truncate">{s.label}</p>
                <p className={`font-display text-lg font-bold ${s.color}`}>
                  {s.value}
                  {s.subValue && (
                    <span className="text-sm font-normal ml-1 text-muted-foreground">{s.subValue}</span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        {/* Table (desktop) / stacked cards (mobile) */}
        <Card className="border-border/50 lg:col-span-2">
          <CardContent className="p-5">
            <h4 className="font-display text-base font-semibold mb-4">By Property</h4>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-left font-body text-xs text-muted-foreground">
                    <th className="py-2 pr-3">Property</th>
                    <th className="py-2 pr-3 text-right">Value</th>
                    <th className="py-2 pr-3 text-right">Mortgage</th>
                    <th className="py-2 pr-3 text-right">Payment</th>
                    <th className="py-2 pr-3 text-right">Accounts</th>
                    <th className="py-2 pr-3 text-right">Rent</th>
                    <th className="py-2 text-right">Equity</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => handleRowClick(r.id)}
                      className="border-b border-border/30 last:border-0 cursor-pointer hover:bg-secondary/40 transition-colors font-body"
                    >
                      <td className="py-3 pr-3">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium truncate max-w-[180px]">{r.name}</span>
                          <Badge variant="secondary" className="text-[10px] w-fit">
                            {PROPERTY_TYPE_LABELS[r.type] || r.type}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-right">{fmt(r.value)}</td>
                      <td className="py-3 pr-3 text-right">{fmt(r.mortgage)}</td>
                      <td className="py-3 pr-3 text-right">{fmt(r.payment)}</td>
                      <td className="py-3 pr-3 text-right">{fmt(r.monthlyExpense)}</td>
                      <td className="py-3 pr-3 text-right text-sage">
                        {r.monthlyIncome > 0 ? fmt(r.monthlyIncome) : "—"}
                      </td>
                      <td className="py-3 text-right font-semibold">{fmt(r.equity)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-body font-semibold">
                    <td className="pt-3 pr-3">Totals</td>
                    <td className="pt-3 pr-3 text-right">{fmt(totals.value)}</td>
                    <td className="pt-3 pr-3 text-right">{fmt(totals.mortgage)}</td>
                    <td className="pt-3 pr-3 text-right">{fmt(totals.payment)}</td>
                    <td className="pt-3 pr-3 text-right">{fmt(totals.monthlyExpense)}</td>
                    <td className="pt-3 pr-3 text-right text-sage">
                      {totals.monthlyIncome > 0 ? fmt(totals.monthlyIncome) : "—"}
                    </td>
                    <td className="pt-3 text-right text-accent">{fmt(totals.equity)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile stacked cards */}
            <div className="md:hidden space-y-3">
              {rows.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleRowClick(r.id)}
                  className="w-full text-left rounded-lg border border-border/50 p-3 hover:bg-secondary/40 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-body font-medium text-sm">{r.name}</p>
                      <Badge variant="secondary" className="text-[10px] mt-1">
                        {PROPERTY_TYPE_LABELS[r.type] || r.type}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="font-body text-[11px] text-muted-foreground">Equity</p>
                      <p className="font-display font-bold text-sage">{fmt(r.equity)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-body">
                    <div>
                      <span className="text-muted-foreground">Value:</span> {fmt(r.value)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Mortgage:</span> {fmt(r.mortgage)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Payment:</span> {fmt(r.payment)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Accounts:</span> {fmt(r.monthlyExpense)}
                    </div>
                    {r.monthlyIncome > 0 && (
                      <div className="col-span-2 text-sage">
                        <span className="text-muted-foreground">Rent:</span> {fmt(r.monthlyIncome)}
                      </div>
                    )}
                  </div>
                </button>
              ))}
              <div className="rounded-lg bg-secondary/40 p-3 text-xs font-body">
                <div className="flex justify-between font-semibold">
                  <span>Total Equity</span>
                  <span className="text-accent">{fmt(totals.equity)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Equity vs Debt donut */}
        <Card className="border-border/50">
          <CardContent className="p-5">
            <h4 className="font-display text-base font-semibold mb-4">Equity vs Debt</h4>
            {hasDonut ? (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {donutData.map((_, i) => (
                        <Cell key={i} fill={DONUT_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontFamily: "var(--font-body)",
                      }}
                      formatter={(v: any) => fmt(Number(v))}
                    />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      wrapperStyle={{ fontFamily: "var(--font-body)", fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="font-body text-sm text-muted-foreground text-center py-8">
                Add home values and mortgage balances to see the split.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PortfolioRollup;
