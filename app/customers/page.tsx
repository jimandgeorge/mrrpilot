"use client";

import { useEffect, useState } from "react";

type Customer = {
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

function daysSince(date: Date | string) {
  return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [churnReasonMap, setChurnReasonMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stripe")
      .then((res) => res.json())
      .then((data) => {
        const sorted = (data.customers || []).sort(
          (a: any, b: any) => b.total - a.total
        );
        // Build email → most recent churn reason map
        const reasonMap: Record<string, string> = {};
        const churnEvents: ChurnEvent[] = data.churnEvents || [];
        churnEvents
          .sort((a, b) => b.cancelledAt - a.cancelledAt)
          .forEach((e) => {
            if (!reasonMap[e.email]) reasonMap[e.email] = e.label;
          });
        setChurnReasonMap(reasonMap);
        setCustomers(sorted);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold">Customers</h1>
          <p className="text-gray-500 mt-1">See who is driving your revenue</p>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl p-4 animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-6 bg-gray-200 rounded w-3/4" />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-5 bg-white border border-gray-200 rounded-2xl animate-pulse flex justify-between items-center">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-4 bg-gray-200 rounded w-1/6" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const activeCustomers = customers.filter((c) => !c.churned);
  const atRiskCustomers = customers.filter(
    (c) => !c.churned && daysSince(c.lastPayment) > 30
  );
  const topCustomers = activeCustomers.slice(0, 3);
  const avgCLTV =
    customers.length > 0
      ? customers.reduce((sum, c) => sum + c.total, 0) / customers.length
      : 0;

  return (
    <div className="max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">Customers</h1>
        <p className="text-gray-500 mt-1">See who is driving your revenue</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className="text-xs text-gray-500 mb-1">Total Customers</p>
          <p className="text-2xl font-semibold">{customers.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className="text-xs text-gray-500 mb-1">Active</p>
          <p className="text-2xl font-semibold text-green-600">{activeCustomers.length}</p>
        </div>
        <div className={`border rounded-2xl p-4 ${atRiskCustomers.length > 0 ? "bg-yellow-50 border-yellow-200" : "bg-white border-gray-200"}`}>
          <p className="text-xs text-gray-500 mb-1">At Risk</p>
          <p className={`text-2xl font-semibold ${atRiskCustomers.length > 0 ? "text-yellow-700" : ""}`}>{atRiskCustomers.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className="text-xs text-gray-500 mb-1">Avg CLTV</p>
          <p className="text-2xl font-semibold">£{(avgCLTV / 100).toFixed(0)}</p>
        </div>
      </div>

      {/* Top Customers */}
      {topCustomers.length > 0 && (
        <div className="mb-10">
          <h2 className="text-sm font-medium text-gray-500 mb-3">Top Customers</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topCustomers.map((c, i) => {
              const avgPayment = c.payments > 0 ? c.total / c.payments : 0;
              const medals = ["🥇", "🥈", "🥉"];
              return (
                <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">{medals[i]}</span>
                    <p className="font-medium text-sm truncate">{c.email}</p>
                  </div>
                  <p className="text-3xl font-semibold mb-3">
                    £{(c.total / 100).toFixed(2)}
                  </p>
                  <div className="space-y-1 text-xs text-gray-500">
                    <div className="flex justify-between">
                      <span>Payments</span>
                      <span className="font-medium text-gray-700">{c.payments}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg payment</span>
                      <span className="font-medium text-gray-700">£{(avgPayment / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last payment</span>
                      <span className="font-medium text-gray-700">{new Date(c.lastPayment).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* At-Risk Customers */}
      {atRiskCustomers.length > 0 && (
        <div className="mb-10">
          <h2 className="text-sm font-medium text-yellow-700 mb-3">⚠️ At-Risk Customers</h2>
          <div className="space-y-3">
            {atRiskCustomers.map((c, i) => {
              const days = Math.floor(daysSince(c.lastPayment));
              return (
                <div key={i} className="p-5 bg-yellow-50 border border-yellow-200 rounded-2xl flex justify-between items-center">
                  <div>
                    <p className="font-medium">{c.email}</p>
                    <p className="text-sm text-yellow-700 mt-0.5">No payment in {days} days — consider reaching out</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">£{(c.total / 100).toFixed(2)}</p>
                    <p className="text-xs text-gray-400">CLTV</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All Customers */}
      <div>
        <h2 className="text-sm font-medium text-gray-500 mb-3">All Customers</h2>
        <div className="space-y-2">
          {customers.map((c, i) => {
            const isAtRisk = !c.churned && daysSince(c.lastPayment) > 30;
            const avgPayment = c.payments > 0 ? c.total / c.payments : 0;

            return (
              <div
                key={i}
                className={`p-4 border rounded-xl flex justify-between items-center text-sm ${
                  c.churned
                    ? "bg-red-50 border-red-200"
                    : isAtRisk
                    ? "bg-yellow-50 border-yellow-200"
                    : "bg-white border-gray-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <p className="font-medium">{c.email}</p>
                  {c.churned && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">💀 Churned</span>
                  )}
                  {c.churned && churnReasonMap[c.email] && (
                    <span className="text-xs bg-red-50 text-red-500 border border-red-200 px-2 py-0.5 rounded-full">
                      {churnReasonMap[c.email]}
                    </span>
                  )}
                  {isAtRisk && (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">⚠️ At risk</span>
                  )}
                </div>
                <div className="flex items-center gap-6 text-right">
                  <div className="hidden md:block text-gray-400">
                    <span>{c.payments} payment{c.payments !== 1 ? "s" : ""}</span>
                    <span className="mx-2">·</span>
                    <span>avg £{(avgPayment / 100).toFixed(2)}</span>
                  </div>
                  <div>
                    <p className="font-semibold">£{(c.total / 100).toFixed(2)}</p>
                    <p className="text-xs text-gray-400">Last: {new Date(c.lastPayment).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
