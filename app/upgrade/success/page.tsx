"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ArrowRight, Bell, Sparkles, Mail, BarChart2 } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function UpgradeSuccessPage() {
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<"monthly" | "yearly" | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) setEmail(session.user.email);

      const res = await fetch("/api/billing/status", {
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
      });
      const data = await res.json();
      if (data.status === "active") {
        // Heuristic: if daysLeft > 300 it's a yearly plan
        setPlan(data.daysLeft > 300 ? "yearly" : "monthly");
      }
    }
    load();
  }, []);

  const nextSteps = [
    { icon: BarChart2, title: "Check your dashboard", desc: "Your MRR, ARPU, NRR and 3-month forecast are waiting.", href: "/dashboard" },
    { icon: Bell,      title: "See who's at risk",    desc: "Any customers with failed payments are flagged by name.", href: "/customers" },
    { icon: Sparkles,  title: "Read your briefing",   desc: "Revenue Intelligence has already written your first revenue summary.", href: "/dashboard" },
    { icon: Mail,      title: "Draft an outreach email", desc: "Click any at-risk customer to generate a personal email in one click.", href: "/customers" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-6 py-16">
      <div className="max-w-md w-full">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={30} className="text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">You're subscribed</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
            {email ? `Welcome to Revenue Intelligence, ${email.split("@")[0]}.` : "Welcome to Revenue Intelligence."}{" "}
            {plan === "yearly" ? "Your yearly plan is active." : plan === "monthly" ? "Your monthly plan is active." : ""}
          </p>
        </div>

        {/* Next steps */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">What to do next</p>
          </div>
          <ul>
            {nextSteps.map(({ icon: Icon, title, desc, href }, i) => (
              <li key={i} className="border-b border-gray-50 dark:border-gray-800 last:border-0">
                <Link href={href} className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                  <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                    <Icon size={15} className="text-indigo-500 dark:text-indigo-400" strokeWidth={1.8} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{title}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{desc}</p>
                  </div>
                  <ArrowRight size={14} className="text-gray-300 dark:text-gray-600 group-hover:text-indigo-400 transition-colors shrink-0 mt-1" />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <Link
          href="/dashboard"
          className="w-full block text-center bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition-colors text-sm"
        >
          Go to dashboard →
        </Link>
      </div>
    </div>
  );
}
