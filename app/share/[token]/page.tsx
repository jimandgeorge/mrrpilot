"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mrr, setMrr] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);
  const [churnRate, setChurnRate] = useState(0);
  const [mrrHistory, setMrrHistory] = useState<{ month: string; mrr: number }[]>([]);

  useEffect(() => {
    fetch(`/api/share/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); setLoading(false); return; }

        const invoices: any[] = data.invoices || [];
        const events: any[] = data.events || [];

        // MRR
        const latestByCustomer: Record<string, any> = {};
        invoices.forEach((inv) => {
          const id = inv.customer;
          if (!id) return;
          if (!latestByCustomer[id] || inv.created > latestByCustomer[id].created) {
            latestByCustomer[id] = inv;
          }
        });
        let totalMRR = 0;
        Object.values(latestByCustomer).forEach((inv: any) => {
          const line = inv.lines?.data?.[0];
          const interval = line?.price?.recurring?.interval;
          const intervalCount = line?.price?.recurring?.interval_count || 1;
          const amount = inv.amount_paid || 0;
          if (interval === "year") totalMRR += Math.round(amount / (12 * intervalCount));
          else if (interval === "week") totalMRR += Math.round((amount * 52) / (12 * intervalCount));
          else totalMRR += Math.round(amount / intervalCount);
        });

        // Build latest invoice timestamp per customer
        const latestInvoiceAt: Record<string, number> = {};
        invoices.forEach((inv: any) => {
          if (!inv.customer) return;
          if (!latestInvoiceAt[inv.customer] || inv.created > latestInvoiceAt[inv.customer]) {
            latestInvoiceAt[inv.customer] = inv.created;
          }
        });

        // Build latest churn event timestamp per customer
        const latestChurnAt: Record<string, number> = {};
        events.forEach((evt: any) => {
          const id = evt.data.object.customer;
          if (!id) return;
          if (!latestChurnAt[id] || evt.created > latestChurnAt[id]) {
            latestChurnAt[id] = evt.created;
          }
        });

        // Churned = has a churn event AND last invoice is >35 days old (matches main dashboard)
        const now = Math.floor(Date.now() / 1000);
        const thirtyFiveDaysAgo = now - 35 * 24 * 60 * 60;
        const churnedIds = new Set(
          Object.keys(latestInvoiceAt).filter((id) => {
            const churnAt = latestChurnAt[id];
            const invoiceAt = latestInvoiceAt[id];
            return churnAt && invoiceAt < thirtyFiveDaysAgo;
          })
        );
        const activeCount = Object.keys(latestInvoiceAt).filter((id) => !churnedIds.has(id)).length;

        // Churn rate (last 30 days)
        const thirtyDaysAgo = now - 30 * 24 * 60 * 60;
        const recentChurns = new Set(
          events
            .filter((e: any) => e.created >= thirtyDaysAgo)
            .map((e: any) => e.data.object.customer)
            .filter(Boolean)
        );
        const beforePeriod = new Set(
          Object.keys(latestInvoiceAt).filter((id) => latestInvoiceAt[id] < thirtyDaysAgo)
        );
        const churn = beforePeriod.size > 0 ? (recentChurns.size / beforePeriod.size) * 100 : 0;

        // MRR history (monthly)
        const byMonth: Record<string, number> = {};
        invoices.forEach((inv: any) => {
          if (!inv.amount_paid) return;
          const d = new Date(inv.created * 1000);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          const line = inv.lines?.data?.[0];
          const interval = line?.price?.recurring?.interval;
          const intervalCount = line?.price?.recurring?.interval_count || 1;
          let monthly = inv.amount_paid;
          if (interval === "year") monthly = Math.round(monthly / (12 * intervalCount));
          else if (interval === "week") monthly = Math.round((monthly * 52) / (12 * intervalCount));
          byMonth[key] = (byMonth[key] || 0) + monthly;
        });
        const history = Object.entries(byMonth)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, val]) => ({
            month: new Date(key + "-01").toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
            mrr: Math.round(val / 100),
          }));

        setMrr(totalMRR);
        setCustomerCount(activeCount);
        setChurnRate(churn);
        setMrrHistory(history);
        setLoading(false);
      })
      .catch(() => { setError("Failed to load data."); setLoading(false); });
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-300 text-sm">Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-center px-6">
        <div>
          <p className="text-2xl mb-2">🔗</p>
          <p className="text-gray-700 font-medium">{error}</p>
          <p className="text-sm text-gray-400 mt-1">This link may have been revoked.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-gray-900">RevInt</p>
          <p className="text-xs text-gray-400">Shared dashboard · read-only</p>
        </div>
        <span className="text-xs text-gray-300 border border-gray-100 px-2.5 py-1 rounded-full">View only</span>
      </div>

      <div className="max-w-3xl mx-auto py-10 px-6 space-y-6">

        {/* Key metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <p className="text-xs font-semibold text-gray-500 mb-2">MRR</p>
            <p className="text-3xl font-bold">£{(mrr / 100).toLocaleString("en-GB")}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <p className="text-xs font-semibold text-gray-500 mb-2">Active Customers</p>
            <p className="text-3xl font-bold text-green-600">{customerCount}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <p className="text-xs font-semibold text-gray-500 mb-2">Churn Rate</p>
            <p className={`text-3xl font-bold ${churnRate > 5 ? "text-red-500" : "text-green-600"}`}>
              {churnRate.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* MRR chart */}
        {mrrHistory.length > 1 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <p className="text-xs font-semibold text-gray-500 mb-4">Revenue by Month</p>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={mrrHistory}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `£${v}`} width={45} />
                <Tooltip formatter={(v) => [`£${v}`, "Revenue"]} />
                <Area type="monotone" dataKey="mrr" stroke="#6366f1" strokeWidth={2} fill="url(#grad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

      </div>
    </div>
  );
}
