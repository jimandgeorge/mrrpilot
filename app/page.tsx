import Link from "next/link";
import { TrendingUp, ShieldAlert, Sparkles, ArrowRight, Check } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <p className="text-sm font-bold tracking-tight text-gray-900">RevInt</p>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Sign in</Link>
          <Link href="/login" className="text-sm font-medium bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1.5">
            Get started <ArrowRight size={13} />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 grid md:grid-cols-2 gap-16 items-center">
        <div>
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
            Revenue intelligence for SaaS founders
          </div>
          <h1 className="text-5xl font-bold text-gray-900 leading-tight tracking-tight mb-5">
            Messy revenue data,<br />made clear.
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed mb-8">
            RevInt turns your Stripe data into clear, actionable insight — MRR, churn risk, LTV, and AI briefings that tell you what to do next.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/login" className="bg-indigo-600 text-white font-medium px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2">
              Start for free <ArrowRight size={15} />
            </Link>
            <p className="text-sm text-gray-400">No credit card required</p>
          </div>
        </div>

        {/* Mock dashboard preview */}
        <div className="relative">
          <div className="bg-gradient-to-br from-gray-50 to-indigo-50/30 rounded-2xl border border-gray-200 p-5 shadow-xl shadow-indigo-100/40">
            {/* MRR hero card */}
            <div className="bg-gradient-to-br from-white via-white to-indigo-50/40 rounded-xl border border-gray-100 p-5 mb-3">
              <p className="text-xs font-semibold text-gray-400 mb-1">Monthly Recurring Revenue</p>
              <p className="text-4xl font-bold text-gray-900 tracking-tight mb-1">£4,820</p>
              <p className="text-sm text-gray-400">
                Forecast in 3 months:{" "}
                <span className="text-green-600 font-semibold">£6,240</span>
                <span className="text-green-500 ml-1 text-xs">↑ 29%</span>
              </p>
            </div>
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              {[
                { label: "ARPU",       value: "£79",   sub: "per customer"   },
                { label: "NRR",        value: "112%",  sub: "expanding",     color: "text-green-600" },
                { label: "Growth",     value: "+18.4%",sub: "vs MRR",        color: "text-green-600" },
                { label: "Churn Rate", value: "1.8%",  sub: "this month",    color: "text-green-600" },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-xl border border-gray-100 px-4 py-3">
                  <p className="text-[11px] font-semibold text-gray-400 mb-0.5">{s.label}</p>
                  <p className={`text-xl font-bold ${s.color ?? "text-gray-900"}`}>{s.value}</p>
                  <p className="text-[11px] text-gray-400">{s.sub}</p>
                </div>
              ))}
            </div>
            {/* Churn risk teaser */}
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-amber-600">Churn Risk</p>
                <p className="text-xs text-gray-500 mt-0.5">2 customers · £158 MRR at risk</p>
              </div>
              <span className="text-xs text-amber-500 font-medium">Act now →</span>
            </div>
          </div>
          {/* Floating badge */}
          <div className="absolute -top-3 -right-3 bg-green-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg">
            Live from Stripe
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 border-y border-gray-100 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold text-gray-400 text-center mb-12 tracking-widest uppercase">Everything a SaaS founder needs</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: TrendingUp,
                title: "Live revenue metrics",
                desc: "MRR, ARPU, NRR, growth rate and a 3-month forecast — all calculated in real time from your Stripe invoices.",
                color: "bg-indigo-50 text-indigo-500",
              },
              {
                icon: ShieldAlert,
                title: "Churn risk before it happens",
                desc: "Customers approaching your churn threshold are flagged with days remaining and MRR at risk — so you can reach out first.",
                color: "bg-amber-50 text-amber-500",
              },
              {
                icon: Sparkles,
                title: "AI revenue briefings",
                desc: "An analyst-style summary of what's happening with your revenue, written fresh every time you refresh the dashboard.",
                color: "bg-purple-50 text-purple-500",
              },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="bg-white rounded-2xl border border-gray-200 p-7">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-5 ${color}`}>
                  <Icon size={18} strokeWidth={1.8} />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Simple, honest pricing</h2>
          <p className="text-gray-500">Start free. Upgrade when it's paying for itself.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {/* Free */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8">
            <p className="text-sm font-semibold text-gray-500 mb-1">Free</p>
            <p className="text-4xl font-bold text-gray-900 mb-1">£0</p>
            <p className="text-sm text-gray-400 mb-8">Forever</p>
            <ul className="space-y-3 mb-8">
              {["Full dashboard access", "MRR, ARPU, NRR, churn rate", "Churn risk scoring", "AI revenue briefings", "Customer detail pages"].map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
                  <Check size={14} className="text-green-500 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/login" className="w-full block text-center border border-gray-200 text-gray-700 font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm">
              Get started free
            </Link>
          </div>
          {/* Pro — coming soon */}
          <div className="bg-indigo-600 rounded-2xl p-8 text-white relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-white/20 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full">Coming soon</div>
            <p className="text-sm font-semibold text-indigo-200 mb-1">Pro</p>
            <p className="text-4xl font-bold mb-1">£29<span className="text-xl font-normal text-indigo-300">/mo</span></p>
            <p className="text-sm text-indigo-300 mb-8">Per workspace</p>
            <ul className="space-y-3 mb-8">
              {["Everything in Free", "Weekly email digest", "Slack alerts for churn & milestones", "Cohort retention analysis", "Multi-account Stripe", "Team members"].map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-indigo-100">
                  <Check size={14} className="text-indigo-300 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <button disabled className="w-full block text-center bg-white/20 text-white font-medium py-2.5 rounded-xl text-sm cursor-not-allowed opacity-70">
              Notify me
            </button>
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="bg-indigo-600 py-16 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-3">Turn your revenue data into action.</h2>
          <p className="text-indigo-200 mb-8">Connect Stripe in 30 seconds. Clear insight, no noise.</p>
          <Link href="/login" className="inline-flex items-center gap-2 bg-white text-indigo-600 font-semibold px-8 py-3 rounded-xl hover:bg-indigo-50 transition-colors">
            Get started free <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-gray-400">
          <p className="font-semibold text-gray-900">RevInt</p>
          <p>© {new Date().getFullYear()} RevInt. All rights reserved.</p>
          <Link href="/login" className="hover:text-gray-600 transition-colors">Sign in</Link>
        </div>
      </footer>

    </div>
  );
}
