import Link from "next/link";
import { ArrowRight, Check, Bell, Sparkles, Mail, BarChart2, Inbox, TrendingUp, Zap } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RevInt — Revenue Intelligence for SaaS Founders",
  description: "Connect Stripe in 30 seconds. MRR, churn alerts, AI briefings, and revenue forecasting. Know the moment a payment fails — not a week later.",
  alternates: {
    canonical: "https://revenueintelligence.co.uk",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "RevInt",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: "Revenue intelligence for SaaS founders. Connect Stripe and get MRR tracking, churn alerts, AI briefings, and revenue forecasting.",
  url: "https://revenueintelligence.co.uk",
  offers: {
    "@type": "Offer",
    price: "29",
    priceCurrency: "GBP",
    priceSpecification: {
      "@type": "UnitPriceSpecification",
      price: "29",
      priceCurrency: "GBP",
      unitText: "MONTH",
    },
  },
  featureList: [
    "Live MRR, ARR, ARPU, NRR tracking",
    "Churn risk alerts by name",
    "AI-drafted outreach emails",
    "Daily AI revenue briefing",
    "Revenue forecast and what-if scenarios",
    "Weekly email digest",
    "Real-time Slack alerts",
    "Cohort retention analysis",
    "Automated dunning sequences",
  ],
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <p className="text-sm font-bold tracking-tight text-gray-900">RevInt</p>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Sign in</Link>
          <Link href="/login" className="text-sm font-medium bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1.5">
            Start free trial <ArrowRight size={13} />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 grid md:grid-cols-2 gap-16 items-center">
        <div>
          <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-amber-100">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
            Revenue intelligence for SaaS founders
          </div>
          <h1 className="text-5xl font-bold text-gray-900 leading-tight tracking-tight mb-5">
            Stop losing customers<br />you didn&apos;t know<br />were leaving.
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed mb-8">
            RevInt connects to Stripe and watches your revenue for you. Failed payments, at-risk customers, MRR trends — surfaced instantly, explained in plain English, with the outreach email already written.
          </p>
          <div className="flex items-center gap-4 mb-6">
            <Link href="/login" className="bg-indigo-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2">
              Start free trial <ArrowRight size={15} />
            </Link>
            <p className="text-sm text-gray-400">14 days free · no card required</p>
          </div>
          <div className="flex items-center gap-6 text-xs text-gray-400">
            {["Connects in 30 seconds", "No engineers needed", "Stripe key encrypted at rest"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <Check size={11} className="text-green-500" />{t}
              </span>
            ))}
          </div>
        </div>

        {/* Hero mock */}
        <div className="relative">
          <div className="bg-gradient-to-br from-gray-50 to-indigo-50/30 rounded-2xl border border-gray-200 p-5 shadow-xl shadow-indigo-100/40">
            {/* Priority callout */}
            <div className="bg-indigo-50 border-l-4 border-indigo-500 rounded-r-xl px-4 py-3 mb-3">
              <p className="text-[9px] font-semibold text-indigo-400 uppercase tracking-widest mb-1">Today&apos;s priority</p>
              <p className="text-xs font-medium text-indigo-900">Email jane@acme.com — her payment is 8 days overdue and worth £79/mo. A personal note now has a strong chance of saving it.</p>
            </div>
            {/* Briefing */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 mb-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Your briefing · Monday</p>
              <p className="text-sm text-gray-700 leading-relaxed">Two customers have overdue payments — reach out to <span className="font-semibold text-gray-900">Jane</span> and <span className="font-semibold text-gray-900">Mark</span> today before they cancel. MRR is up <span className="text-green-600 font-semibold">£340</span> this month.</p>
              <span className="inline-block w-1 h-3 bg-indigo-400 ml-0.5 animate-pulse rounded-sm mt-1" />
            </div>
            {/* Metrics strip */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[
                { label: "MRR",   value: "£4,820", color: "text-gray-900" },
                { label: "NRR",   value: "112%",   color: "text-green-600" },
                { label: "ARPU",  value: "£79",    color: "text-gray-900" },
                { label: "Churn", value: "1.8%",   color: "text-green-600" },
              ].map((m) => (
                <div key={m.label} className="bg-white rounded-lg border border-gray-100 px-2 py-2 text-center">
                  <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide">{m.label}</p>
                  <p className={`text-sm font-bold tabular-nums ${m.color}`}>{m.value}</p>
                </div>
              ))}
            </div>
            {/* At risk */}
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-amber-800">2 customers at risk</p>
                <p className="text-[11px] text-amber-600 mt-0.5">jane@acme.com · mark@startup.io</p>
              </div>
              <span className="text-[11px] text-amber-700 font-semibold bg-amber-100 px-2 py-1 rounded-lg">Draft email →</span>
            </div>
          </div>
          <div className="absolute -top-3 -right-3 bg-green-500 text-white text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-lg">
            Live from Stripe
          </div>
        </div>
      </section>

      {/* Pain section */}
      <section className="border-y border-gray-100 bg-gray-50 py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-2xl font-semibold text-gray-900 leading-relaxed">
            Most SaaS churn starts with a failed payment. Most founders find out too late — after the customer has already cancelled and moved on.
          </p>
          <p className="text-gray-500 mt-4 text-base leading-relaxed">
            Stripe doesn&apos;t email you when a customer goes past due. Your spreadsheet doesn&apos;t flag who&apos;s been on a failed payment for 8 days. By the time you notice, it&apos;s too late to save them.
          </p>
        </div>
      </section>

      {/* Feature story 1 — Churn alerts */}
      <section className="py-24 px-6 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-amber-600 text-xs font-semibold mb-4">
              <Bell size={13} />
              Instant churn alerts
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">
              Know the moment a payment fails — not a week later.
            </h2>
            <p className="text-gray-500 leading-relaxed mb-6">
              The second a subscription goes past due, RevInt flags it. You see the customer by name, exactly how much MRR is at risk, and how many days you have to act before they cancel.
            </p>
            <p className="text-gray-500 leading-relaxed">
              Every morning, the customers who need your attention are waiting at the top of your dashboard. No digging through Stripe. No missed payments sliding into cancellations.
            </p>
          </div>
          {/* Mock */}
          <div className="space-y-3">
            {[
              { email: "jane@acme.com",   days: 8, mrr: "£79/mo", months: "14 months", total: "£1,106" },
              { email: "mark@startup.io", days: 3, mrr: "£29/mo", months: "6 months",  total: "£174"   },
            ].map((c) => (
              <div key={c.email} className="bg-amber-50 border border-amber-100 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-amber-900">{c.email}</p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      Past due · {c.days} day{c.days !== 1 ? "s" : ""} overdue · {c.mrr}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-lg shrink-0">
                    Draft email →
                  </span>
                </div>
                <div className="border-t border-amber-100 bg-white/60 px-5 py-2.5 flex gap-4 text-[11px] text-gray-500">
                  <span>Customer for {c.months}</span>
                  <span>·</span>
                  <span>Total paid: {c.total}</span>
                </div>
              </div>
            ))}
            <div className="bg-white border border-gray-100 rounded-2xl px-5 py-3 flex items-center gap-2 text-xs text-gray-400">
              <span className="w-2 h-2 bg-green-400 rounded-full" />
              18 active subscriptions · no issues
            </div>
          </div>
        </div>
      </section>

      {/* Feature story 2 — AI briefing + chat */}
      <section className="py-24 px-6 bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          {/* Mock */}
          <div className="space-y-3">
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Your briefing · Tuesday</p>
              <p className="text-sm text-gray-700 leading-relaxed">
                Jane&apos;s payment is now 9 days overdue — she&apos;s been a customer for 14 months and worth reaching out to personally. Mark updated his card overnight, so that risk is resolved. MRR is holding at <span className="font-semibold text-gray-900">£4,820</span>. No cancellations this week.
              </p>
              <span className="inline-block w-1 h-3 bg-indigo-400 ml-0.5 animate-pulse rounded-sm mt-2" />
            </div>
            {/* Chat */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
              <div className="flex justify-end">
                <div className="bg-indigo-600 text-white text-xs rounded-2xl px-4 py-2 max-w-[80%]">What would you do about Jane?</div>
              </div>
              <div className="text-xs text-gray-700 leading-relaxed max-w-[90%]">
                Jane has paid on time for 13 of her 14 months. That&apos;s a strong track record — this is almost certainly a card issue, not intention to cancel. A short personal note today has a high chance of saving her.
              </div>
              <div className="flex justify-end">
                <div className="bg-indigo-600 text-white text-xs rounded-2xl px-4 py-2 max-w-[80%]">Draft that email for me</div>
              </div>
            </div>
          </div>
          <div>
            <div className="inline-flex items-center gap-2 text-indigo-600 text-xs font-semibold mb-4">
              <Sparkles size={13} />
              AI revenue briefing
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">
              Open your dashboard and know exactly what needs your attention.
            </h2>
            <p className="text-gray-500 leading-relaxed mb-6">
              Every time you log in, RevInt has read your Stripe data and written you a plain-English briefing. No numbers to interpret. Just what happened, what it means, and what to do next.
            </p>
            <p className="text-gray-500 leading-relaxed">
              And when you want to go deeper, just ask. RevInt knows your customers, your trends, and your revenue — and answers in plain English, not generic advice.
            </p>
          </div>
        </div>
      </section>

      {/* Feature story 3 — AI email */}
      <section className="py-24 px-6 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-green-600 text-xs font-semibold mb-4">
              <Mail size={13} />
              AI-drafted outreach
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">
              The right email, written for you in one click.
            </h2>
            <p className="text-gray-500 leading-relaxed mb-6">
              Not a template. A personal email tailored to that customer — their name, their plan, how long they&apos;ve been with you, how much they&apos;ve paid. The kind of email you&apos;d write yourself if you had the time.
            </p>
            <p className="text-gray-500 leading-relaxed">
              Copy it, send it, save the revenue. Most at-risk customers saved within 24 hours of a personal outreach.
            </p>
          </div>
          {/* Mock email */}
          <div className="bg-amber-50 border border-amber-100 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between border-b border-amber-100">
              <div>
                <p className="text-xs font-semibold text-amber-900">jane@acme.com</p>
                <p className="text-[11px] text-amber-600 mt-0.5">Past due · 9 days overdue — reach out before they cancel.</p>
              </div>
              <span className="text-xs font-semibold text-amber-700">Hide draft</span>
            </div>
            <div className="bg-white px-5 py-5">
              <p className="text-sm text-gray-700 leading-relaxed">
                Hey Jane — just wanted to reach out personally. I noticed your payment didn&apos;t go through this month and wanted to check everything was okay before anything got interrupted.
                <br /><br />
                You&apos;ve been with us for 14 months and I&apos;d genuinely hate to lose you over something we can sort quickly. Here&apos;s your billing link if you&apos;d like to update your card:
                <span className="text-indigo-500"> billing.stripe.com/…</span>
                <br /><br />
                Happy to help if there&apos;s anything else going on.
              </p>
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
                <span className="text-xs font-semibold text-indigo-600 cursor-pointer">Copy to clipboard</span>
                <span className="text-xs text-gray-400 cursor-pointer">Regenerate</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature story 4 — Revenue intelligence */}
      <section className="py-24 px-6 bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          {/* Mock dashboard */}
          <div className="space-y-3">
            <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4 flex items-center divide-x divide-gray-100">
              {[
                { label: "MRR",  value: "£4,820",  sub: "+£340 this month", green: false },
                { label: "ARR",  value: "£57,840", sub: undefined,          green: false },
                { label: "ARPU", value: "£79",     sub: undefined,          green: false },
                { label: "NRR",  value: "112%",    sub: undefined,          green: true  },
              ].map((m) => (
                <div key={m.label} className="flex-1 px-3 first:pl-0 last:pr-0 text-center">
                  <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{m.label}</p>
                  <p className={`text-sm font-bold tabular-nums ${m.green ? "text-green-600" : "text-gray-900"}`}>{m.value}</p>
                  {m.sub && <p className="text-[10px] text-gray-400">{m.sub}</p>}
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-end justify-between mb-1">
                <div>
                  <p className="text-xs font-semibold text-gray-500">MRR History</p>
                  <p className="text-2xl font-bold text-gray-900 mt-0.5">£4,820 <span className="text-xs font-semibold text-green-600">+8% MoM</span></p>
                </div>
                <span className="text-[10px] text-gray-300 flex items-center gap-1">
                  <svg width="16" height="4" viewBox="0 0 16 4"><line x1="0" y1="2" x2="16" y2="2" stroke="#a5b4fc" strokeWidth="2" strokeDasharray="3 2"/></svg>
                  Forecast
                </span>
              </div>
              <div className="flex items-end gap-1 h-16 mt-3">
                {[22,28,32,38,35,45,42,55,50,62,58,72,68,82].map((h, i) => (
                  <div key={i} className={`flex-1 rounded-sm ${i >= 11 ? "bg-indigo-200 opacity-60 border border-dashed border-indigo-300" : "bg-indigo-400"}`} style={{ height: `${h}%` }} />
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5">3-month forecast · <span className="text-green-600 font-medium">£6,240</span></p>
            </div>
          </div>
          <div>
            <div className="inline-flex items-center gap-2 text-indigo-600 text-xs font-semibold mb-4">
              <BarChart2 size={13} />
              Full revenue intelligence
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">
              Every number that matters, live from Stripe.
            </h2>
            <p className="text-gray-500 leading-relaxed mb-6">
              MRR, ARR, ARPU, NRR, growth rate, quick ratio — calculated automatically and updated in real time. No spreadsheets, no manual imports, no stale data.
            </p>
            <p className="text-gray-500 leading-relaxed">
              A 3-month forecast based on your actual growth curve. An MRR waterfall showing new, expansion, contraction, and churn. Revenue by plan. The full picture, always current.
            </p>
          </div>
        </div>
      </section>

      {/* Feature story 5 — Real-time Slack alerts */}
      <section className="py-24 px-6 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-indigo-600 text-xs font-semibold mb-4">
              <Zap size={13} />
              Real-time Slack alerts
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">
              Your revenue, in your Slack the moment it moves.
            </h2>
            <p className="text-gray-500 leading-relaxed mb-6">
              Connect your Slack workspace and RevInt posts every new customer, payment, failed charge, and cancellation in real time — straight into your chosen channel.
            </p>
            <p className="text-gray-500 leading-relaxed">
              You see the customer name and amount in the message itself. No context switching, no checking Stripe, no finding out hours later.
            </p>
          </div>
          {/* Mock Slack feed */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-gray-50 border-b border-gray-100 px-5 py-3 flex items-center gap-2">
              <span className="text-sm font-bold text-gray-700">#revenue</span>
              <span className="text-xs text-gray-400">· connected to Stripe</span>
              <span className="ml-auto w-2 h-2 bg-green-400 rounded-full" />
            </div>
            <div className="divide-y divide-gray-50">
              {[
                { emoji: "🎉", text: "New customer — tom@beta-labs.io · £79/mo",        time: "2m ago",  bold: true  },
                { emoji: "⚠️", text: "Payment failed — jane@acme.com · £79 at risk",     time: "8m ago",  bold: false },
                { emoji: "💰", text: "Payment received — mark@startup.io · £29",          time: "1h ago",  bold: false },
                { emoji: "😬", text: "Cancellation — old@client.com · £49/mo lost",       time: "3h ago",  bold: false },
                { emoji: "🎉", text: "New customer — sarah@growthco.io · £149/mo",        time: "5h ago",  bold: true  },
              ].map(({ emoji, text, time, bold }) => (
                <div key={text} className="px-5 py-3.5 flex items-center gap-3">
                  <span className="text-lg leading-none">{emoji}</span>
                  <p className={`flex-1 text-sm ${bold ? "font-semibold text-gray-800" : "text-gray-600"}`}>{text}</p>
                  <span className="text-[11px] text-gray-300 shrink-0">{time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Also included — compact feature grid */}
      <section className="py-20 px-6 bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold text-gray-400 text-center mb-10 tracking-widest uppercase">Also included</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: TrendingUp,
                color: "text-indigo-500",
                bg: "bg-indigo-50",
                title: "Revenue forecast",
                desc: "3-month MRR projection from your actual growth curve. Adjust churn and new customer sliders to model scenarios.",
              },
              {
                icon: Inbox,
                color: "text-purple-500",
                bg: "bg-purple-50",
                title: "Weekly email digest",
                desc: "Every Monday morning: MRR movement, new customers, churn, and who needs your attention going into the week.",
              },
              {
                icon: BarChart2,
                color: "text-blue-500",
                bg: "bg-blue-50",
                title: "Cohort retention",
                desc: "See which monthly cohorts stick and which drop off — a heat-map table built from your real payment history.",
              },
              {
                icon: Mail,
                color: "text-green-500",
                bg: "bg-green-50",
                title: "Automated dunning",
                desc: "Day 1, 3, and 7 recovery emails drafted and queued the moment a payment fails. Pre-written, personalised, ready to send.",
              },
            ].map(({ icon: Icon, color, bg, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-4`}>
                  <Icon size={16} className={color} />
                </div>
                <p className="text-sm font-semibold text-gray-900 mb-2">{title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-gray-100 bg-white py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold text-gray-400 text-center mb-12 tracking-widest uppercase">Up and running in under a minute</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Connect your Stripe account",
                desc: "Paste your Stripe secret key. No webhooks, no engineers, no setup. RevInt reads your data directly — securely encrypted at rest.",
                color: "bg-indigo-50 text-indigo-600",
              },
              {
                step: "2",
                title: "See exactly who's at risk",
                desc: "RevInt scans every subscription and flags at-risk customers by name — with MRR at stake, days overdue, and full payment history.",
                color: "bg-amber-50 text-amber-600",
              },
              {
                step: "3",
                title: "Reach out before they cancel",
                desc: "One click drafts a personal, human email for that customer. Copy it, send it, save the revenue. Most take under two minutes.",
                color: "bg-green-50 text-green-600",
              },
            ].map(({ step, title, desc, color }) => (
              <div key={step} className="relative">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold mb-4 ${color}`}>
                  {step}
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Founder story */}
      <section className="py-20 px-6 border-b border-gray-100">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-6">Why this exists</p>
          <p className="text-2xl font-semibold text-gray-900 leading-relaxed mb-4">
            In one month I lost £3,400 to preventable churn. Three customers had failed payments for weeks. I found out after they&apos;d already cancelled and moved on.
          </p>
          <p className="text-gray-500 text-base leading-relaxed mb-8">
            Stripe had flagged the failures. I just never saw them. I built RevInt so that can&apos;t happen — to me, or to any other founder running a SaaS on their own. Every feature in here exists because I needed it and it didn&apos;t exist.
          </p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600">B</div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Brendan</p>
              <p className="text-xs text-gray-400">Founder, RevInt</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-gray-50 border-b border-gray-100 px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Simple, honest pricing</h2>
            <p className="text-gray-500">Try free for 14 days. No credit card required. One saved customer pays for months of RevInt.</p>
          </div>
          <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Monthly */}
            <div className="bg-white border border-gray-200 rounded-2xl p-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Monthly</p>
              <p className="text-4xl font-bold text-gray-900 mb-1">£29<span className="text-xl font-normal text-gray-400">/mo</span></p>
              <p className="text-sm text-gray-400 mb-8">14-day free trial</p>
              <ul className="space-y-3 mb-8">
                {[
                  "Live MRR, ARR, ARPU, NRR",
                  "Churn risk alerts by name",
                  "AI-drafted outreach emails",
                  "Daily AI revenue briefing",
                  "Conversational revenue chat",
                  "Revenue forecast & what-if scenarios",
                  "Weekly email digest",
                  "Real-time Slack alerts",
                  "Cohort retention analysis",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-gray-600">
                    <Check size={13} className="text-gray-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/login" className="w-full block text-center border border-indigo-200 text-indigo-600 font-semibold py-3 rounded-xl hover:bg-indigo-50 transition-colors text-sm">
                Start free trial
              </Link>
            </div>

            {/* Yearly */}
            <div className="bg-indigo-600 rounded-2xl p-8 text-white relative">
              <span className="absolute top-4 right-4 text-[11px] font-bold text-green-300 bg-green-900/30 px-2.5 py-1 rounded-full">
                2 months free
              </span>
              <p className="text-xs font-semibold text-indigo-300 uppercase tracking-wide mb-3">Yearly</p>
              <p className="text-4xl font-bold mb-1">£290<span className="text-xl font-normal text-indigo-300">/yr</span></p>
              <p className="text-sm text-indigo-300 mb-8">14-day free trial · save £58</p>
              <ul className="space-y-3 mb-8">
                {[
                  "Live MRR, ARR, ARPU, NRR",
                  "Churn risk alerts by name",
                  "AI-drafted outreach emails",
                  "Daily AI revenue briefing",
                  "Conversational revenue chat",
                  "Revenue forecast & what-if scenarios",
                  "Weekly email digest",
                  "Real-time Slack alerts",
                  "Cohort retention analysis",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-indigo-100">
                    <Check size={13} className="text-indigo-300 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/login" className="w-full block text-center bg-white text-indigo-600 font-semibold py-3 rounded-xl hover:bg-indigo-50 transition-colors text-sm">
                Start free trial
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-indigo-600 py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-3">Stop finding out too late.</h2>
          <p className="text-indigo-200 mb-8 leading-relaxed">Connect Stripe in 30 seconds. See who&apos;s at risk today. Save the customers you would have lost.</p>
          <Link href="/login" className="inline-flex items-center gap-2 bg-white text-indigo-600 font-semibold px-8 py-3.5 rounded-xl hover:bg-indigo-50 transition-colors">
            Start your free trial <ArrowRight size={15} />
          </Link>
          <div className="flex items-center justify-center gap-6 mt-6 text-xs text-indigo-300">
            <span>No credit card required</span>
            <span className="w-1 h-1 bg-indigo-400 rounded-full" />
            <span>14 days free</span>
            <span className="w-1 h-1 bg-indigo-400 rounded-full" />
            <span>Cancel anytime</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-gray-400">
          <p className="font-semibold text-gray-900">RevInt</p>
          <p>© {new Date().getFullYear()} RevInt. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="mailto:brendan.mcintosh@outlook.com" className="hover:text-gray-600 transition-colors">Contact</a>
            <Link href="/login" className="hover:text-gray-600 transition-colors">Sign in</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
