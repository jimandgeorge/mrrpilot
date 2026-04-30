"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Download, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Customer = {
  id: string;
  email: string;
  total: number;
  payments: number;
  lastPayment: Date;
  churned: boolean;
};

type ChurnEvent = {
  email: string;
  label: string;
  cancelledAt: number;
};

type Filter = "all" | "active" | "at_risk" | "churned";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [churnReasonMap, setChurnReasonMap] = useState<Record<string, string>>({});
  const [atRiskIds, setAtRiskIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [notConnected, setNotConnected] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const token = session?.access_token ?? "";
      const fetchProvider = async () => {
        const preferred = localStorage.getItem("revint_active_provider");
        const orderedEndpoints = preferred === "paddle"
          ? ["/api/paddle", "/api/stripe", "/api/revolut"]
          : preferred === "revolut"
          ? ["/api/revolut", "/api/stripe", "/api/paddle"]
          : ["/api/stripe", "/api/paddle", "/api/revolut"];
        for (const endpoint of orderedEndpoints) {
          const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
          const d = await res.json();
          if (!d.notConnected) return d;
        }
        return null;
      };
      fetchProvider()
        .then((data) => {
          if (!data) { setNotConnected(true); setLoading(false); return; }
          const sorted = (data.customers || []).sort((a: any, b: any) => b.total - a.total);
          const reasonMap: Record<string, string> = {};
          const churnEvents: ChurnEvent[] = data.churnEvents || [];
          churnEvents.sort((a, b) => b.cancelledAt - a.cancelledAt).forEach((e) => {
            if (!reasonMap[e.email]) reasonMap[e.email] = e.label;
          });
          const riskIds = new Set<string>((data.atRiskSubscriptions || []).map((s: any) => s.id));
          setAtRiskIds(riskIds);
          setChurnReasonMap(reasonMap);
          setCustomers(sorted);
          setLoading(false);
        });
    });
  }, []);

  function exportCSV() {
    const rows = [
      ["Email", "Total (£)", "Payments", "Avg Payment (£)", "Last Payment", "Status", "Churn Reason"],
      ...customers.map((c) => {
        const avg = c.payments > 0 ? c.total / c.payments : 0;
        const isAtRisk = atRiskIds.has(c.id);
        const status = c.churned ? "Churned" : isAtRisk ? "At Risk" : "Active";
        return [
          c.email,
          (c.total / 100).toFixed(2),
          c.payments,
          (avg / 100).toFixed(2),
          new Date(c.lastPayment).toLocaleDateString("en-GB"),
          status,
          c.churned ? (churnReasonMap[c.email] || "") : "",
        ];
      }),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (notConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6">
        <div className="text-4xl mb-4">🔌</div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Connect a payment provider</h2>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-6 max-w-xs">Add your Stripe, Paddle, or Revolut key in Settings to see your customer data.</p>
        <a href="/settings" className="bg-indigo-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors">Go to Settings →</a>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-8 px-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 animate-pulse space-y-2">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            </div>
          ))}
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50 dark:border-gray-800">
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
              <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-12" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const activeCustomers = customers.filter((c) => !c.churned);
  const atRiskCustomers = customers.filter((c) => atRiskIds.has(c.id));
  const churnedCustomers = customers.filter((c) => c.churned);
  const avgCLTV = customers.length > 0 ? customers.reduce((s, c) => s + c.total, 0) / customers.length : 0;

  // Filter + search
  const filtered = customers.filter((c) => {
    const isAtRisk = atRiskIds.has(c.id);
    const matchesFilter =
      filter === "all" ? true
      : filter === "active" ? (!c.churned && !isAtRisk)
      : filter === "at_risk" ? isAtRisk
      : c.churned;
    const matchesSearch = c.email.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const filterOptions: { key: Filter; label: string; count: number }[] = [
    { key: "all",      label: "All",      count: customers.length },
    { key: "active",   label: "Active",   count: activeCustomers.length - atRiskCustomers.length },
    { key: "at_risk",  label: "At risk",  count: atRiskCustomers.length },
    { key: "churned",  label: "Churned",  count: churnedCustomers.length },
  ];

  return (
    <div className="max-w-5xl mx-auto py-8 px-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Customers</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">See who is driving your revenue</p>
        </div>
        <button onClick={exportCSV} className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg transition-colors">
          <Download size={13} className="inline mr-1" />Export CSV
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Total</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{customers.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Active</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{activeCustomers.length}</p>
        </div>
        <div className={`border rounded-2xl p-5 ${atRiskCustomers.length > 0 ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/50" : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"}`}>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">At Risk</p>
          <p className={`text-2xl font-bold ${atRiskCustomers.length > 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-900 dark:text-gray-100"}`}>{atRiskCustomers.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Avg CLTV</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">£{(avgCLTV / 100).toFixed(0)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">

        {/* Search + filter toolbar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600" />
            <input
              type="text"
              placeholder="Search customers…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-600 bg-white dark:bg-gray-800 placeholder:text-gray-300 dark:placeholder:text-gray-600"
            />
          </div>
          <div className="flex items-center gap-1">
            {filterOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setFilter(opt.key)}
                className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                  filter === opt.key
                    ? "bg-gray-900 text-white"
                    : "text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                {opt.label}
                <span className={`ml-1 tabular-nums ${filter === opt.key ? "text-gray-400" : "text-gray-300 dark:text-gray-600"}`}>{opt.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-4 items-center px-5 py-2.5 bg-gray-50/60 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
          <span className="w-8" />
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Customer</p>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">Total</p>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 text-right hidden md:block">Payments</p>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 text-right hidden md:block">Last payment</p>
          <span className="w-10" />
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <p className="px-5 py-10 text-sm text-gray-400 dark:text-gray-500 text-center">No customers match your search.</p>
        ) : (
          <ul>
            {filtered.map((c) => {
              const isAtRisk = atRiskIds.has(c.id);
              const initial = c.email?.[0]?.toUpperCase() ?? "?";
              const avatarColor = c.churned
                ? "bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400"
                : isAtRisk
                ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                : "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400";

              return (
                <li key={c.id} className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-4 items-center px-5 py-3.5 border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-800 transition-colors group">

                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${avatarColor}`}>
                    {initial}
                  </div>

                  {/* Email + badges */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{c.email}</span>
                      {c.churned && (
                        <span className="text-[11px] font-medium bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 px-1.5 py-0.5 rounded-full shrink-0">Churned</span>
                      )}
                      {c.churned && churnReasonMap[c.email] && (
                        <span className="text-[11px] text-gray-400 dark:text-gray-500 shrink-0">{churnReasonMap[c.email]}</span>
                      )}
                      {isAtRisk && (
                        <span className="text-[11px] font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50 px-1.5 py-0.5 rounded-full shrink-0">At risk</span>
                      )}
                    </div>
                  </div>

                  {/* Total */}
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 tabular-nums text-right">
                    £{(c.total / 100).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                  </p>

                  {/* Payments */}
                  <p className="text-sm text-gray-400 dark:text-gray-500 tabular-nums text-right hidden md:block">{c.payments}</p>

                  {/* Last payment */}
                  <p className="text-sm text-gray-400 dark:text-gray-500 text-right hidden md:block">
                    {new Date(c.lastPayment).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>

                  {/* View link */}
                  <Link
                    href={`/customers/${c.id}`}
                    className="flex justify-end w-10 text-gray-300 dark:text-gray-600 hover:text-indigo-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <ArrowRight size={14} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

    </div>
  );
}
