import Link from "next/link";
import { ArrowRight, Check, Bell, Sparkles, Mail, BarChart2, Inbox, TrendingUp, Zap } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Revenue Intelligence — Revenue Recovery Platform for SaaS",
  description: "Detect failed payments, at-risk customers, and silent churn across Stripe, Paddle, and Revolut. Recover revenue before it's gone.",
  alternates: {
    canonical: "https://revenueintelligence.co.uk",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Revenue Intelligence",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: "Revenue recovery platform for SaaS founders. Detect failed payments, at-risk customers, and silent churn across Stripe, Paddle, and Revolut — and recover revenue before it's gone.",
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
    "Failed payment detection and recovery",
    "At-risk customer alerts by name",
    "AI-drafted recovery emails",
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
        <p className="text-sm font-bold tracking-tight text-gray-900">Revenue Intelligence</p>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Sign in</Link>
          <Link href="/login" className="text-sm font-medium bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1.5">
            Find Lost Revenue <ArrowRight size={13} />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 grid md:grid-cols-2 gap-16 items-center">
        <div>
          <div className="inline-flex items-center gap-2 bg-red-50 text-red-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-red-100">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            Revenue recovery for SaaS founders
          </div>
          <h1 className="text-5xl font-bold text-gray-900 leading-tight tracking-tight mb-5">
            Stop losing revenue<br />you didn&apos;t know<br />you were losing.
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed mb-8">
            Detect failed payments, at-risk customers, and silent churn across Stripe, Paddle, and Revolut — and recover revenue before it&apos;s gone.
          </p>
          <div className="flex items-center gap-4 mb-6">
            <Link href="/login" className="bg-indigo-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2">
              Connect & Find Lost Revenue <ArrowRight size={15} />
            </Link>
            <p className="text-sm text-gray-400">Free · no card required</p>
          </div>
          <div className="flex items-center gap-6 text-xs text-gray-400">
            {["Stripe · Paddle · Revolut", "No engineers needed", "Keys encrypted at rest"].map((t) => (
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
              <p className="text-[9px] font-semibold text-indigo-400 uppercase tracking-widest mb-1">Recovery opportunity</p>
              <p className="text-xs font-medium text-indigo-900">Email jane@acme.com — her payment is 8 days overdue and worth £79/mo. A personal note now has a strong chance of saving it.</p>
            </div>
            {/* Recovery email preview */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 mb-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Recovery email · ready to send</p>
              <p className="text-xs text-gray-600 leading-relaxed">Hey Jane — just wanted to reach out personally. I noticed your payment didn&apos;t go through and wanted to check in before anything got interrupted. You&apos;ve been with us for 14 months…</p>
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50">
                <span className="text-[11px] font-semibold text-indigo-600">Copy to clipboard</span>
                <span className="text-[11px] text-gray-300">Regenerate</span>
              </div>
            </div>
            {/* At risk */}
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-amber-800">2 customers at risk · £108/mo at stake</p>
                <p className="text-[11px] text-amber-600 mt-0.5">jane@acme.com · mark@startup.io</p>
              </div>
              <span className="text-[11px] text-amber-700 font-semibold bg-amber-100 px-2 py-1 rounded-lg">Draft email →</span>
            </div>
          </div>
          <div className="absolute -top-3 -right-3 bg-green-500 text-white text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-lg">
            Stripe · Paddle · Revolut
          </div>
        </div>
      </section>

      {/* Pain section */}
      <section className="border-y border-gray-100 bg-gray-50 py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-2xl font-semibold text-gray-900 leading-relaxed">
            Most SaaS revenue loss is invisible. Failed payments become silent cancellations. Downgrades go unnoticed. By the time you see it in your MRR, the customer is already gone.
          </p>
          <p className="text-gray-500 mt-4 text-base leading-relaxed">
            We don&apos;t just show you the leakage — we identify who&apos;s at risk, write the recovery email, and get it in front of you before it&apos;s too late.
          </p>
        </div>
      </section>

      {/* Feature story 1 — At-risk detection */}
      <section className="py-24 px-6 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-amber-600 text-xs font-semibold mb-4">
              <Bell size={13} />
              Failed payment detection
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">
              Know the moment a payment fails — not a week later.
            </h2>
            <p className="text-gray-500 leading-relaxed mb-6">
              The second a subscription goes past due, Revenue Intelligence flags it. You see the customer by name, exactly how much revenue is at risk, and how many days you have to act before they cancel.
            </p>
            <p className="text-gray-500 leading-relaxed">
              Every morning, every at-risk customer is waiting at the top of your screen. No digging through Stripe. No missed payments sliding into cancellations. Just a clear list of who needs your attention and what it&apos;s worth.
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

      {/* Feature story 2 — Recovery email (hero feature) */}
      <section className="py-24 px-6 bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-green-600 text-xs font-semibold mb-4">
              <Mail size={13} />
              Recovery emails written for you
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">
              We detect the problem and prepare the action.
            </h2>
            <p className="text-gray-500 leading-relaxed mb-6">
              Most tools stop at dashboards. Revenue Intelligence goes further — the moment we detect a failed payment or at-risk customer, the recovery email is already written. Not a template. A personal email tailored to that customer&apos;s name, plan, tenure, and history.
            </p>
            <p className="text-gray-500 leading-relaxed mb-6">
              Copy it, send it, save the revenue. Most at-risk customers recovered within 24 hours of a personal outreach.
            </p>
            <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3">
              <p className="text-sm font-semibold text-green-800">This is the product moat.</p>
              <p className="text-xs text-green-600 mt-1">Failed payment detected → customer identified → email written → you send in seconds. No other tool does all four steps.</p>
            </div>
          </div>
          {/* Mock email */}
          <div className="bg-amber-50 border border-amber-100 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between border-b border-amber-100">
              <div>
                <p className="text-xs font-semibold text-amber-900">jane@acme.com</p>
                <p className="text-[11px] text-amber-600 mt-0.5">Past due · 9 days overdue — recovery email ready.</p>
              </div>
              <span className="text-xs font-semibold text-amber-700">Recovery email</span>
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

      {/* Feature story 3 — AI briefing + chat */}
      <section className="py-24 px-6 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* Mock */}
          <div className="space-y-3">
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">What to do next · Tuesday</p>
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
              What to do next — not just what happened.
            </h2>
            <p className="text-gray-500 leading-relaxed mb-6">
              Every time you open Revenue Intelligence, it&apos;s read your payment data and written you a plain-English briefing: who needs your attention, what&apos;s at risk, and exactly what to do about it. No numbers to interpret. Just actions.
            </p>
            <p className="text-gray-500 leading-relaxed">
              Ask anything. Revenue Intelligence knows your customers, your revenue history, and your trends — and answers in plain English, not generic advice.
            </p>
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
              Revenue health
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">
              See exactly where you&apos;re leaking revenue.
            </h2>
            <p className="text-gray-500 leading-relaxed mb-6">
              MRR waterfall showing new, expansion, contraction, and churn. NRR telling you if your existing customers are growing. A 3-month forecast based on your actual growth curve. The full picture — always current, no manual work.
            </p>
            <p className="text-gray-500 leading-relaxed">
              Works across Stripe, Paddle, and Revolut. One view of your entire payment stack — no spreadsheets, no switching between dashboards.
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
              Know about failures the moment they happen — in Slack.
            </h2>
            <p className="text-gray-500 leading-relaxed mb-6">
              Connect your Slack workspace and Revenue Intelligence posts every failed payment, new customer, and cancellation in real time — straight into your channel. Customer name and amount in the message itself.
            </p>
            <p className="text-gray-500 leading-relaxed">
              No context switching, no finding out hours later. The faster you know, the faster you can act — and the higher your recovery rate.
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
                desc: "Every Monday: MRR movement, new customers, churn, and who needs your attention going into the week.",
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
          <p className="text-xs font-semibold text-gray-400 text-center mb-12 tracking-widest uppercase">First value in under 2 minutes</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Connect your payment stack",
                desc: "Paste your Stripe, Paddle, or Revolut key. No webhooks, no engineers, no setup. Revenue Intelligence reads your data directly — securely encrypted at rest.",
                color: "bg-indigo-50 text-indigo-600",
              },
              {
                step: "2",
                title: "See where you're losing revenue",
                desc: "Revenue Intelligence scans every subscription and shows you exactly what's leaking — failed payments, at-risk customers, silent churn — with the revenue at stake for each.",
                color: "bg-amber-50 text-amber-600",
              },
              {
                step: "3",
                title: "Recover it before it's gone",
                desc: "One click drafts a personal recovery email for that customer. Copy it, send it, save the revenue. Most founders recover their first customer in under two minutes.",
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
            Stripe had flagged the failures. I just never saw them. I built Revenue Intelligence so that can&apos;t happen — to me, or to any other founder running a SaaS on their own. The goal isn&apos;t better dashboards. It&apos;s recovering revenue you&apos;re already losing.
          </p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600">B</div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Brendan</p>
              <p className="text-xs text-gray-400">Founder, Revenue Intelligence</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-gray-50 border-b border-gray-100 px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">One saved customer pays for months of Revenue Intelligence.</h2>
            <p className="text-gray-500">Find lost revenue in your payment stack — free. No credit card required.</p>
          </div>
          <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Monthly */}
            <div className="bg-white border border-gray-200 rounded-2xl p-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Monthly</p>
              <p className="text-4xl font-bold text-gray-900 mb-1">£29<span className="text-xl font-normal text-gray-400">/mo</span></p>
              <p className="text-sm text-gray-400 mb-8">14-day free trial</p>
              <ul className="space-y-3 mb-8">
                {[
                  "Failed payment detection & alerts",
                  "At-risk customer identification",
                  "AI-drafted recovery emails",
                  "Daily AI briefing & revenue chat",
                  "Revenue waterfall & forecast",
                  "Weekly email digest",
                  "Real-time Slack alerts",
                  "Cohort retention analysis",
                  "Stripe · Paddle · Revolut",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-gray-600">
                    <Check size={13} className="text-gray-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/login" className="w-full block text-center border border-indigo-200 text-indigo-600 font-semibold py-3 rounded-xl hover:bg-indigo-50 transition-colors text-sm">
                Find Lost Revenue — Free
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
                  "Failed payment detection & alerts",
                  "At-risk customer identification",
                  "AI-drafted recovery emails",
                  "Daily AI briefing & revenue chat",
                  "Revenue waterfall & forecast",
                  "Weekly email digest",
                  "Real-time Slack alerts",
                  "Cohort retention analysis",
                  "Stripe · Paddle · Revolut",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-indigo-100">
                    <Check size={13} className="text-indigo-300 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/login" className="w-full block text-center bg-white text-indigo-600 font-semibold py-3 rounded-xl hover:bg-indigo-50 transition-colors text-sm">
                Find Lost Revenue — Free
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-indigo-600 py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-3">Stop leaving revenue on the table.</h2>
          <p className="text-indigo-200 mb-8 leading-relaxed">Connect your payment stack in 30 seconds. We&apos;ll show you exactly where you&apos;re losing money today — and help you recover it.</p>
          <Link href="/login" className="inline-flex items-center gap-2 bg-white text-indigo-600 font-semibold px-8 py-3.5 rounded-xl hover:bg-indigo-50 transition-colors">
            Connect & Find Lost Revenue <ArrowRight size={15} />
          </Link>
          <div className="flex items-center justify-center gap-6 mt-6 text-xs text-indigo-300">
            <span>No credit card required</span>
            <span className="w-1 h-1 bg-indigo-400 rounded-full" />
            <span>14 days free</span>
            <span className="w-1 h-1 bg-indigo-400 rounded-full" />
            <span>Stripe · Paddle · Revolut</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-gray-400">
          <p className="font-semibold text-gray-900">Revenue Intelligence</p>
          <p>© {new Date().getFullYear()} Revenue Intelligence. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="mailto:brendan.mcintosh@outlook.com" className="hover:text-gray-600 transition-colors">Contact</a>
            <Link href="/login" className="hover:text-gray-600 transition-colors">Sign in</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
