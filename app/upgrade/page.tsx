"use client";
import { useState } from "react";
import { Check, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function UpgradePage() {
  const [loading, setLoading] = useState(false);

  async function startCheckout() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-16">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Your trial has ended</h1>
          <p className="text-gray-500 text-sm">Subscribe to keep access to RevInt and protect your revenue.</p>
        </div>

        <div className="bg-indigo-600 rounded-2xl p-8 text-white mb-4">
          <p className="text-sm font-semibold text-indigo-200 mb-1">RevInt</p>
          <p className="text-4xl font-bold mb-1">£29<span className="text-xl font-normal text-indigo-300">/mo</span></p>
          <p className="text-sm text-indigo-300 mb-8">Cancel anytime</p>
          <ul className="space-y-3 mb-8">
            {[
              "All your numbers in one place",
              "Churn risk alerts by name",
              "AI-drafted outreach emails",
              "Daily AI revenue briefing",
              "Conversational revenue chat",
              "Weekly email digest",
              "Customer detail pages",
            ].map((f) => (
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

        <p className="text-center text-xs text-gray-400">
          One saved customer pays for months of RevInt.
        </p>
        <div className="text-center mt-4">
          <Link href="/dashboard" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
