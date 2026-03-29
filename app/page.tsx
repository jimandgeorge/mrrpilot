import Link from "next/link";
import { ArrowRight, Check, Zap, Eye, Mail } from "lucide-react";

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
          <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
            Churn prevention for SaaS founders
          </div>
          <h1 className="text-5xl font-bold text-gray-900 leading-tight tracking-tight mb-5">
            Know who's about to churn<br />before they do.
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed mb-8">
            The moment a customer's payment fails, RevInt flags them by name, shows you exactly what's at risk, and writes the outreach email for you. Most cancellations are preventable — RevInt makes sure you act in time.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/login" className="bg-indigo-600 text-white font-medium px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2">
              Start free trial <ArrowRight size={15} />
            </Link>
            <p className="text-sm text-gray-400">14 days free · no card required</p>
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
                { label: "ARPU",       value: "£79",    sub: "per customer",  color: undefined       },
                { label: "NRR",        value: "112%",   sub: "expanding",     color: "text-green-600" },
                { label: "Growth",     value: "+18.4%", sub: "vs last month", color: "text-green-600" },
                { label: "Churn Rate", value: "1.8%",   sub: "this month",    color: "text-green-600" },
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
                <p className="text-xs font-semibold text-amber-600">2 customers at risk</p>
                <p className="text-xs text-gray-500 mt-0.5">jane@acme.com · mark@startup.io</p>
              </div>
              <span className="text-xs text-amber-500 font-medium">Draft email →</span>
            </div>
          </div>
          {/* Floating badge */}
          <div className="absolute -top-3 -right-3 bg-green-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg">
            Live from Stripe
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-gray-100 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold text-gray-400 text-center mb-12 tracking-widest uppercase">Up and running in under a minute</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                step: "1",
                title: "Connect your Stripe account",
                desc: "Paste your Stripe secret key. No webhooks, no engineers, no setup. RevInt reads your data directly.",
                color: "bg-indigo-50 text-indigo-500",
              },
              {
                icon: Eye,
                step: "2",
                title: "See exactly who's at risk",
                desc: "RevInt scans every subscription and flags at-risk customers by name — with MRR at stake, days overdue, and full payment history.",
                color: "bg-amber-50 text-amber-500",
              },
              {
                icon: Mail,
                step: "3",
                title: "Reach out before they cancel",
                desc: "One click drafts a personal, human email tailored to that customer's history. Copy it, send it, save the revenue.",
                color: "bg-green-50 text-green-600",
              },
            ].map(({ icon: Icon, step, title, desc, color }) => (
              <div key={step} className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                    <Icon size={18} strokeWidth={1.8} />
                  </div>
                  <span className="text-xs font-bold text-gray-300 tracking-widest uppercase">Step {step}</span>
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 border-b border-gray-100 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold text-gray-400 text-center mb-12 tracking-widest uppercase">Everything you need to keep your customers</p>

          {/* Bento grid */}
          <div className="grid md:grid-cols-3 gap-4">

            {/* Dashboard metrics — spans 2 cols */}
            <div className="md:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 overflow-hidden">
              <div className="mb-5">
                <h3 className="text-base font-semibold text-gray-900 mb-1">All your numbers in one place</h3>
                <p className="text-sm text-gray-500">MRR, ARPU, NRR, growth rate, and a 3-month forecast — calculated live from your Stripe data. No manual imports, ever.</p>
              </div>
              <div className="bg-gradient-to-br from-gray-50 to-indigo-50/30 rounded-xl border border-gray-100 p-4">
                <div className="flex items-center divide-x divide-gray-100 mb-4">
                  {[
                    { label: "MRR", value: "£4,820", sub: "+£340 this month" },
                    { label: "ARR", value: "£57,840", sub: undefined },
                    { label: "ARPU", value: "£79", sub: undefined },
                    { label: "NRR", value: "112%", color: "text-green-600" },
                  ].map((m) => (
                    <div key={m.label} className="flex-1 px-3 first:pl-0 last:pr-0 text-center">
                      <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{m.label}</p>
                      <p className={`text-sm font-bold tabular-nums ${m.color ?? "text-gray-900"}`}>{m.value}</p>
                      {m.sub && <p className="text-[10px] text-gray-400">{m.sub}</p>}
                    </div>
                  ))}
                </div>
                <div className="flex items-end gap-1 h-12">
                  {[30, 42, 38, 55, 48, 62, 58, 70, 65, 80, 75, 88].map((h, i) => (
                    <div key={i} className="flex-1 rounded-sm bg-indigo-200" style={{ height: `${h}%` }} />
                  ))}
                  {[92, 100].map((h, i) => (
                    <div key={i} className="flex-1 rounded-sm bg-indigo-400" style={{ height: `${h}%` }} />
                  ))}
                  {[96, 100, 100].map((h, i) => (
                    <div key={i} className="flex-1 rounded-sm bg-indigo-200 opacity-50 border border-dashed border-indigo-300" style={{ height: `${h}%` }} />
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5">3-month forecast · <span className="text-green-600 font-medium">£6,240</span></p>
              </div>
            </div>

            {/* Churn risk */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 overflow-hidden">
              <div className="mb-5">
                <h3 className="text-base font-semibold text-gray-900 mb-1">Know who's about to leave before they do</h3>
                <p className="text-sm text-gray-500">At-risk customers flagged by name the moment something goes wrong.</p>
              </div>
              <div className="space-y-2">
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-3.5 py-3">
                  <p className="text-xs font-semibold text-amber-900">jane@acme.com</p>
                  <p className="text-[11px] text-amber-600 mt-0.5">Past due · 8 days overdue · £79/mo</p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">Draft email →</span>
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-3.5 py-3">
                  <p className="text-xs font-semibold text-amber-900">mark@startup.io</p>
                  <p className="text-[11px] text-amber-600 mt-0.5">Past due · 3 days overdue · £29/mo</p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">Draft email →</span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI briefing */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 overflow-hidden">
              <div className="mb-5">
                <h3 className="text-base font-semibold text-gray-900 mb-1">Start every day knowing where you stand</h3>
                <p className="text-sm text-gray-500">A plain-English briefing waiting for you every time you open the dashboard.</p>
              </div>
              <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Your briefing</p>
                <p className="text-sm text-gray-700 leading-relaxed">Jane and Mark both have overdue payments — reach out today before they cancel. MRR is up £340 this month driven by two new Pro customers. Your 3-month forecast sits at <span className="text-green-600 font-medium">£6,240</span>.</p>
                <span className="inline-block w-1 h-3.5 bg-gray-300 ml-0.5 animate-pulse rounded-sm" />
              </div>
            </div>

            {/* AI email draft — spans 2 cols */}
            <div className="md:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 overflow-hidden">
              <div className="mb-5">
                <h3 className="text-base font-semibold text-gray-900 mb-1">The right email, written for you in one click</h3>
                <p className="text-sm text-gray-500">Personal, specific, ready to send — tailored to that customer's plan, history, and how long they've been with you.</p>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold text-amber-900">jane@acme.com</p>
                    <p className="text-[11px] text-amber-600">Past due · 8 days overdue — reach out before they cancel.</p>
                  </div>
                  <span className="text-xs font-semibold text-amber-700">Hide draft</span>
                </div>
                <div className="bg-white border-t border-amber-100 px-4 py-4">
                  <p className="text-sm text-gray-700 leading-relaxed">Hey Jane — just checking in. I noticed your payment didn't go through this month and wanted to reach out personally before anything got interrupted. You've been with us for 14 months and I'd hate to lose you over something we can sort out quickly. Here's the link to update your card: <span className="text-indigo-500">billing.stripe.com/…</span></p>
                  <div className="flex gap-3 mt-3">
                    <span className="text-xs font-medium text-indigo-600">Copy to clipboard</span>
                    <span className="text-xs text-gray-400">Regenerate</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Conversational chat */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 overflow-hidden">
              <div className="mb-5">
                <h3 className="text-base font-semibold text-gray-900 mb-1">Ask anything, get answers about your actual customers</h3>
                <p className="text-sm text-gray-500">Not generic advice — specific answers based on your Stripe data.</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-end">
                  <div className="bg-indigo-600 text-white text-xs rounded-2xl px-3.5 py-2 max-w-[80%]">Who should I reach out to today?</div>
                </div>
                <div className="flex justify-start">
                  <div className="text-xs text-gray-700 leading-relaxed max-w-[90%]">Jane and Mark both have overdue payments. Jane's been a customer for 14 months — she's worth a personal note today.</div>
                </div>
                <div className="flex justify-end">
                  <div className="bg-indigo-600 text-white text-xs rounded-2xl px-3.5 py-2 max-w-[80%]">What's driving growth this month?</div>
                </div>
              </div>
            </div>

            {/* Weekly digest */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 overflow-hidden">
              <div className="mb-5">
                <h3 className="text-base font-semibold text-gray-900 mb-1">Your week in revenue, every Monday morning</h3>
                <p className="text-sm text-gray-500">A digest of what happened, who's at risk, and what to do — delivered to your inbox.</p>
              </div>
              <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                <p className="text-[10px] text-gray-400 mb-2">Monday 9:00 AM · from RevInt</p>
                <p className="text-xs font-semibold text-gray-800 mb-2">Your week: MRR up £340, 1 customer at risk</p>
                <div className="space-y-1.5">
                  {[
                    { dot: "bg-green-500", text: "2 new customers · +£158 MRR" },
                    { dot: "bg-amber-400", text: "1 at risk · jane@acme.com" },
                    { dot: "bg-indigo-400", text: "Forecast: £6,240 in 3 months" },
                  ].map(({ dot, text }) => (
                    <div key={text} className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
                      <p className="text-[11px] text-gray-600">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Customer detail */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 overflow-hidden">
              <div className="mb-5">
                <h3 className="text-base font-semibold text-gray-900 mb-1">Know every customer's full story</h3>
                <p className="text-sm text-gray-500">Plan, payment history, total paid, time as a customer — everything in one place.</p>
              </div>
              <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-800">Jane Smith</p>
                    <p className="text-[11px] text-gray-400">jane@acme.com</p>
                  </div>
                  <span className="text-[11px] bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">At risk</span>
                </div>
                <div className="space-y-1.5">
                  {[
                    { label: "Plan", value: "Pro · £79/mo" },
                    { label: "Customer for", value: "14 months" },
                    { label: "Total paid", value: "£1,106" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between">
                      <p className="text-[11px] text-gray-400">{label}</p>
                      <p className="text-[11px] font-medium text-gray-700">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Social proof / founder story */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-2xl font-semibold text-gray-900 leading-relaxed mb-6">
            "I lost £3,400 in one month to preventable churn. Three customers had failed payments for weeks and I had no idea until they'd already cancelled. RevInt is what I wish I'd had."
          </p>
          <div className="flex items-center justify-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600">B</div>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-900">Brendan, founder of RevInt</p>
              <p className="text-xs text-gray-400">Built this after losing customers he could have kept</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-gray-50 border-y border-gray-100 px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Simple, honest pricing</h2>
            <p className="text-gray-500">Try free for 14 days. Cancel anytime.</p>
          </div>
          <div className="max-w-sm mx-auto">
            <div className="bg-indigo-600 rounded-2xl p-8 text-white">
              <p className="text-sm font-semibold text-indigo-200 mb-1">RevInt</p>
              <p className="text-4xl font-bold mb-1">£29<span className="text-xl font-normal text-indigo-300">/mo</span></p>
              <p className="text-sm text-indigo-300 mb-8">14-day free trial · no credit card required</p>
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
              <Link href="/login" className="w-full block text-center bg-white text-indigo-600 font-semibold py-3 rounded-xl hover:bg-indigo-50 transition-colors text-sm">
                Start free trial
              </Link>
            </div>
            <p className="text-center text-xs text-gray-400 mt-4">One saved customer pays for months of RevInt.</p>
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="bg-indigo-600 py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-3">Stop losing customers you could have kept.</h2>
          <p className="text-indigo-200 mb-8">Connect Stripe in 30 seconds. See who's at risk today.</p>
          <Link href="/login" className="inline-flex items-center gap-2 bg-white text-indigo-600 font-semibold px-8 py-3 rounded-xl hover:bg-indigo-50 transition-colors">
            Start free trial <ArrowRight size={15} />
          </Link>
          <div className="flex items-center justify-center gap-6 mt-6 text-xs text-indigo-300">
            <span>No credit card required</span>
            <span className="w-1 h-1 bg-indigo-400 rounded-full" />
            <span>Cancel anytime</span>
            <span className="w-1 h-1 bg-indigo-400 rounded-full" />
            <span>Your Stripe key is encrypted at rest</span>
          </div>
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
