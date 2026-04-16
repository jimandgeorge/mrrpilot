"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import Link from "next/link";
import { Lock } from "lucide-react";

function fmt(pence: number) {
  return `£${Math.round(pence / 100).toLocaleString("en-GB")}`;
}

type BaseMetrics = {
  currentMrr: number;
  avgMonthlyGrowth: number;
  churnRate: number;
  arpu: number;
  mrrGoal: number;
};

export default function ForecastPage() {
  const [loading, setLoading] = useState(true);
  const [notConnected, setNotConnected] = useState(false);
  const [trialExpired, setTrialExpired] = useState(false);
  const [baseMetrics, setBaseMetrics] = useState<BaseMetrics | null>(null);

  // What-if controls
  const [addCustomers, setAddCustomers] = useState(0);
  const [pricePerCustomer, setPricePerCustomer] = useState(29); // £
  const [scenarioChurnPct, setScenarioChurnPct] = useState(2);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Billing gate
      const billingRes = await fetch("/api/billing/status", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const billing = await billingRes.json();
      if (billing.trialExpired) { setTrialExpired(true); setLoading(false); return; }

      // MRR goal
      const goalData = await fetch("/api/user/goal", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      }).then(r => r.json()).catch(() => ({ mrr_goal: 0 }));

      // Stripe data
      const res = await fetch("/api/stripe", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();

      if (data.notConnected) { setNotConnected(true); setLoading(false); return; }

      // Current MRR from active subscriptions
      const mrrEntries = Object.values(data.mrrByCustomer ?? {}) as { mrr: number }[];
      const currentMrr = mrrEntries.reduce((s, v) => s + v.mrr, 0);
      const activeCount = mrrEntries.length;
      const arpu = activeCount > 0 ? Math.round(currentMrr / activeCount) : 2900;

      // Build monthly revenue from invoices (last 4 months)
      const mrrByMonth: Record<string, number> = {};
      (data.invoices ?? []).forEach((inv: any) => {
        if (!inv.amount_paid || inv.amount_paid <= 0) return;
        const d = new Date(inv.created * 1000);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        mrrByMonth[key] = (mrrByMonth[key] ?? 0) + inv.amount_paid;
      });

      const sortedMonths = Object.entries(mrrByMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-4);

      let avgMonthlyGrowth = 0;
      if (sortedMonths.length >= 2) {
        const changes = sortedMonths.slice(1).map(([, mrr], i) => mrr - sortedMonths[i][1]);
        avgMonthlyGrowth = changes.reduce((s, c) => s + c, 0) / changes.length;
      }

      // Monthly churn rate (customer-based proxy)
      const threeMonthsAgo = Date.now() / 1000 - 90 * 86400;
      const recentChurns = (data.churnEvents ?? []).filter((e: any) => e.cancelledAt > threeMonthsAgo).length;
      const rawChurnRate = activeCount > 0 ? recentChurns / activeCount / 3 : 0.02;
      const churnRate = Math.min(Math.max(rawChurnRate, 0), 0.5);

      setBaseMetrics({
        currentMrr,
        avgMonthlyGrowth,
        churnRate,
        arpu,
        mrrGoal: goalData.mrr_goal ?? 0,
      });
      setPricePerCustomer(Math.max(1, Math.round(arpu / 100)));
      setScenarioChurnPct(Math.round(churnRate * 100 * 10) / 10);
      setLoading(false);
    }
    load();
  }, []);

  const baseChurnPct = baseMetrics ? Math.round(baseMetrics.churnRate * 100 * 10) / 10 : 2;

  const { chartData, baseFinal, scenarioFinal, goalMonthBase, goalMonthScenario } = useMemo(() => {
    if (!baseMetrics) return { chartData: [], baseFinal: 0, scenarioFinal: 0, goalMonthBase: null, goalMonthScenario: null };

    const { currentMrr, avgMonthlyGrowth, churnRate, mrrGoal } = baseMetrics;
    const extraMrrPerMonth = addCustomers * pricePerCustomer * 100;
    const scenarioChurnRate = scenarioChurnPct / 100;
    const labels = ["Now", "Mo 1", "Mo 2", "Mo 3", "Mo 4", "Mo 5", "Mo 6"];

    let baseMrr = currentMrr;
    let scenMrr = currentMrr;
    let goalMonthBase: number | null = null;
    let goalMonthScenario: number | null = null;

    const points = [{ label: "Now", base: currentMrr, scenario: currentMrr }];

    for (let i = 1; i <= 6; i++) {
      baseMrr = Math.max(0, baseMrr - baseMrr * churnRate + avgMonthlyGrowth);
      scenMrr = Math.max(0, scenMrr - scenMrr * scenarioChurnRate + avgMonthlyGrowth + extraMrrPerMonth);
      if (mrrGoal > 0 && goalMonthBase === null && baseMrr >= mrrGoal) goalMonthBase = i;
      if (mrrGoal > 0 && goalMonthScenario === null && scenMrr >= mrrGoal) goalMonthScenario = i;
      points.push({ label: labels[i], base: Math.round(baseMrr), scenario: Math.round(scenMrr) });
    }

    return { chartData: points, baseFinal: Math.round(baseMrr), scenarioFinal: Math.round(scenMrr), goalMonthBase, goalMonthScenario };
  }, [baseMetrics, addCustomers, pricePerCustomer, scenarioChurnPct]);

  const delta = scenarioFinal - baseFinal;
  const scenarioChanged = addCustomers > 0 || Math.abs(scenarioChurnPct - baseChurnPct) > 0.05;

  function resetScenario() {
    setAddCustomers(0);
    if (baseMetrics) {
      setPricePerCustomer(Math.max(1, Math.round(baseMetrics.arpu / 100)));
      setScenarioChurnPct(Math.round(baseMetrics.churnRate * 100 * 10) / 10);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-6 space-y-4">
        <div className="h-7 bg-gray-200 rounded w-1/4 animate-pulse" />
        <div className="h-4 bg-gray-100 rounded w-1/3 animate-pulse" />
        <div className="h-64 bg-gray-100 rounded-2xl animate-pulse mt-6" />
      </div>
    );
  }

  if (trialExpired) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 text-center gap-4">
        <Lock size={24} className="text-indigo-400" />
        <h2 className="text-lg font-semibold text-gray-900">Your trial has ended</h2>
        <Link href="/upgrade" className="bg-indigo-600 text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors">
          Subscribe — £29/mo →
        </Link>
      </div>
    );
  }

  if (notConnected) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 text-center gap-4">
        <p className="text-gray-500 text-sm">Connect your Stripe account to use forecasting.</p>
        <Link href="/settings" className="text-sm text-indigo-600 hover:underline">Go to Settings →</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-6 space-y-6">

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Revenue Forecast</h1>
        <p className="text-sm text-gray-500 mt-1">Adjust the sliders to model different scenarios and see where your MRR could be in 6 months.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <p className="text-xs text-gray-400 mb-1.5">Current trajectory</p>
          <p className="text-2xl font-bold text-gray-900">{fmt(baseFinal)}</p>
          <p className="text-xs text-gray-400 mt-1">MRR in 6 months</p>
        </div>
        <div className={`rounded-2xl p-5 border transition-colors ${scenarioChanged ? "bg-indigo-600 border-indigo-600" : "bg-white border-gray-200"}`}>
          <p className={`text-xs mb-1.5 ${scenarioChanged ? "text-indigo-200" : "text-gray-400"}`}>Your scenario</p>
          <p className={`text-2xl font-bold ${scenarioChanged ? "text-white" : "text-gray-900"}`}>{fmt(scenarioFinal)}</p>
          {scenarioChanged ? (
            <p className={`text-xs mt-1 font-medium ${delta > 0 ? "text-green-300" : delta < 0 ? "text-red-300" : "text-indigo-200"}`}>
              {delta > 0 ? `+${fmt(delta)}` : fmt(delta)} vs base
            </p>
          ) : (
            <p className="text-xs text-gray-400 mt-1">Adjust sliders below</p>
          )}
        </div>
      </div>

      {/* Goal insight */}
      {(baseMetrics?.mrrGoal ?? 0) > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-800">
          <span className="font-semibold">Goal: {fmt(baseMetrics!.mrrGoal)}</span>
          {goalMonthBase !== null
            ? ` — reached in month ${goalMonthBase} on current trajectory.`
            : scenarioChanged && goalMonthScenario !== null
            ? ` — not on current path, but reached in month ${goalMonthScenario} with your scenario.`
            : " — not reached within 6 months on current trajectory."}
        </div>
      )}

      {/* Chart */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-5">6-Month MRR Projection</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `£${Math.round(v / 100).toLocaleString("en-GB")}`}
              width={64}
            />
            <Tooltip
              formatter={(v, name) => [fmt(typeof v === "number" ? v : 0), name === "base" ? "Current trajectory" : "Your scenario"]}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
            />
            <Line type="monotone" dataKey="base" stroke="#d1d5db" strokeWidth={2} strokeDasharray="6 3" dot={false} name="base" />
            <Line type="monotone" dataKey="scenario" stroke="#4f46e5" strokeWidth={2.5} dot={false} name="scenario" />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-5 mt-3 justify-end">
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="inline-block w-5 border-t-2 border-dashed border-gray-300" />
            Current trajectory
          </span>
          <span className="flex items-center gap-1.5 text-xs text-indigo-500">
            <span className="inline-block w-5 border-t-2 border-solid border-indigo-500" />
            Your scenario
          </span>
        </div>
      </div>

      {/* What-if sliders */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-7">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">What-if scenarios</p>
          {scenarioChanged && (
            <button onClick={resetScenario} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              Reset
            </button>
          )}
        </div>

        {/* Add customers per month */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">New customers per month</label>
            <span className="text-sm font-bold text-indigo-600">{addCustomers}</span>
          </div>
          <input
            type="range" min={0} max={20} step={1}
            value={addCustomers}
            onChange={(e) => setAddCustomers(Number(e.target.value))}
            className="w-full accent-indigo-600 h-1.5"
          />
          <div className="flex justify-between text-xs text-gray-300 mt-1.5">
            <span>0</span><span>20</span>
          </div>
        </div>

        {/* Revenue per customer */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <label className="text-sm font-medium text-gray-700">Revenue per new customer</label>
              <p className="text-xs text-gray-400 mt-0.5">Default is your current ARPU</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-sm text-gray-400">£</span>
              <input
                type="number" min={1} max={9999}
                value={pricePerCustomer}
                onChange={(e) => setPricePerCustomer(Math.max(1, Number(e.target.value)))}
                className="w-16 text-sm font-bold text-indigo-600 text-right border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <span className="text-sm text-gray-400">/mo</span>
            </div>
          </div>
        </div>

        {/* Monthly churn rate */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Monthly churn rate</label>
            <span className="text-sm font-bold text-indigo-600">{scenarioChurnPct.toFixed(1)}%</span>
          </div>
          <input
            type="range" min={0} max={20} step={0.5}
            value={scenarioChurnPct}
            onChange={(e) => setScenarioChurnPct(Number(e.target.value))}
            className="w-full accent-indigo-600 h-1.5"
          />
          <div className="flex justify-between text-xs text-gray-300 mt-1.5">
            <span>0%</span>
            <span className="text-gray-400">Current: {baseChurnPct.toFixed(1)}%</span>
            <span>20%</span>
          </div>
        </div>
      </div>

    </div>
  );
}
