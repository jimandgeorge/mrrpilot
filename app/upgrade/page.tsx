"use client";
import { useState, useEffect } from "react";
import { Check, ArrowRight, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type Interval = "monthly" | "yearly";

const PLANS: Record<Interval, { price: string; sub: string; badge: string | null; saving: string | null }> = {
  monthly: { price: "£29", sub: "/mo", badge: null,             saving: null     },
  yearly:  { price: "£290", sub: "/yr", badge: "2 months free", saving: "Save £58" },
};

const FEATURES = [
  "Live MRR, ARR, ARPU, NRR",
  "Churn risk alerts by name",
  "AI-drafted outreach emails",
  "Daily AI revenue briefing",
  "Conversational revenue chat",
  "Weekly email digest",
  "Customer detail pages",
];

export default function UpgradePage() {
  const [interval, setInterval] = useState<Interval>("monthly");
  const [loading, setLoading] = useState(false);
  const [billing, setBilling] = useState<{ daysLeft: number; trialExpired: boolean; status: string } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      fetch("/api/billing/status", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      }).then(r => r.json()).then(setBilling).catch(() => {});
    });
  }, []);

  async function startCheckout() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ interval }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
      setLoading(false);
    }
  }

  const plan = PLANS[interval];
  const isTrialing = billing?.status === "trialing" && !billing?.trialExpired;
  const daysLeft = billing?.daysLeft ?? 0;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-16">
      <div className="max-w-sm w-full">

        {/* Trial context banner */}
        {isTrialing && (
          <div className={`flex items-center gap-3 rounded-xl px-4 py-3 mb-6 border ${daysLeft <= 3 ? "bg-amber-50 border-amber-100" : "bg-indigo-50 border-indigo-100"}`}>
            <Clock size={14} className={daysLeft <= 3 ? "text-amber-500 shrink-0" : "text-indigo-400 shrink-0"} />
            <p className={`text-sm font-medium ${daysLeft <= 3 ? "text-amber-800" : "text-indigo-800"}`}>
              {daysLeft === 0
                ? "Your trial ends today — subscribe to keep access."
                : daysLeft === 1
                ? "1 day left in your trial."
                : `${daysLeft} days left in your trial.`}
            </p>
          </div>
        )}

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {billing?.trialExpired ? "Your trial has ended" : "Subscribe to Revenue Intelligence"}
          </h1>
          <p className="text-gray-500 text-sm">
            {isTrialing
              ? "Lock in your access before your trial ends. One saved customer pays for months."
              : "One saved customer pays for months of access."}
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            {(["monthly", "yearly"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setInterval(opt)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                  interval === opt ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {opt === "monthly" ? "Monthly" : "Yearly"}
                {opt === "yearly" && (
                  <span className="ml-1.5 text-[10px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">
                    −17%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-indigo-600 rounded-2xl p-8 text-white mb-4">
          <p className="text-sm font-semibold text-indigo-200 mb-1">Revenue Intelligence</p>
          <div className="flex items-end gap-2 mb-1">
            <p className="text-4xl font-bold">{plan.price}<span className="text-xl font-normal text-indigo-300">{plan.sub}</span></p>
            {plan.saving && (
              <span className="mb-1 text-xs font-semibold text-green-300 bg-green-900/30 px-2 py-0.5 rounded-full">
                {plan.saving}
              </span>
            )}
          </div>
          {plan.badge ? (
            <p className="text-sm text-indigo-300 mb-8">{plan.badge} · Cancel anytime</p>
          ) : (
            <p className="text-sm text-indigo-300 mb-8">Cancel anytime</p>
          )}
          <ul className="space-y-3 mb-8">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-indigo-100">
                <Check size={14} className="text-indigo-300 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <button
            onClick={startCheckout}
            disabled={loading}
            className="w-full bg-white text-indigo-600 font-semibold py-3 rounded-xl hover:bg-indigo-50 transition-colors text-sm disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? "Redirecting…" : <><span>Subscribe now</span><ArrowRight size={14} /></>}
          </button>
        </div>

        <p className="text-center text-xs text-gray-400">Secured by Stripe · Cancel anytime</p>
        <div className="text-center mt-4">
          <Link href="/dashboard" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
