"use client";

import { useState } from "react";
import { RefreshCw, TrendingUp, TrendingDown, UserPlus, UserMinus, AlertCircle, Lightbulb } from "lucide-react";
import Link from "next/link";

const COMMENTARY = "Two customers have overdue payments worth £108/mo combined — Jane and Mark both need a personal note today before they cancel. MRR is up £340 this month driven by 3 new customers, and NRR at 112% means your existing base is expanding. No cancellations this week.";

const PRIORITY = "Email jane@acme.com — her payment is 8 days overdue and worth £79/mo. She's been a customer for 14 months. A personal note now has a strong chance of saving it.";

const PROSE = {
  momentum: "MRR grew 8% month-on-month to £4,820, driven by 3 new customers at an average of £79/mo. The growth curve is steady — your 3-month forecast sits at £6,240 if current acquisition continues. Expansion revenue from existing customers is contributing more than churn is taking away.",
  mix: "Professional plan accounts for 80% of MRR (£3,840 across 48 customers), with Starter making up the remainder. No meaningful contraction this month — the mix is healthy and skewed toward your higher-value tier. Consider a push to move Starter customers up.",
  churn: "One formal cancellation this month worth £49/mo. Two additional customers are in the at-risk window with overdue payments — reaching out personally within 24 hours typically recovers 60–70% of these. Your overall churn rate sits at 1.8%, which is healthy for this MRR range.",
};

const RECOVERY_EMAIL = `Hey Jane — just wanted to reach out personally. I noticed your payment didn't go through this month and wanted to check everything was okay before anything got interrupted.

You've been with us for 14 months and I'd genuinely hate to lose you over something we can sort quickly. Here's your billing link if you'd like to update your card:

billing.stripe.com/…

Happy to help if there's anything else going on.`;

const EVENTS = [
  { email: "tom@beta-labs.io",   type: "new"     as const, amount: 14900, date: "3 Jan" },
  { email: "sarah@growthco.io",  type: "new"     as const, amount: 7900,  date: "1 Jan" },
  { email: "alice@startup.co",   type: "upgrade" as const, amount: 12000, date: "28 Dec" },
  { email: "jane@acme.com",      type: "renewal" as const, amount: 7900,  date: "22 Dec" },
  { email: "mark@startup.io",    type: "renewal" as const, amount: 2900,  date: "20 Dec" },
  { email: "bob@techco.io",      type: "new"     as const, amount: 7900,  date: "18 Dec" },
  { email: "old@client.com",     type: "churn"   as const, amount: 4900,  date: "15 Dec" },
  { email: "petra@saasco.com",   type: "renewal" as const, amount: 14900, date: "12 Dec" },
  { email: "lena@devtools.io",   type: "renewal" as const, amount: 7900,  date: "10 Dec" },
  { email: "james@fintech.co",   type: "new"     as const, amount: 14900, date: "5 Dec" },
];

const typeConfig = {
  new:     { label: "New",     border: "border-l-green-400",  pill: "bg-green-50 text-green-700"   },
  renewal: { label: "Renewal", border: "border-l-blue-300",   pill: "bg-blue-50 text-blue-600"     },
  upgrade: { label: "Upgrade", border: "border-l-purple-400", pill: "bg-purple-50 text-purple-700" },
  churn:   { label: "Churned", border: "border-l-red-300",    pill: "bg-red-50 text-red-600"       },
};

const INSIGHTS = [
  { icon: UserPlus,    text: "3 new customers this month",               detail: "Send a welcome email in the first 24 hours — highest-leverage retention action.", type: "positive" as const },
  { icon: UserMinus,   text: "£49/mo lost to churn this month",          detail: "Email churned customers within 48 hours — win-back rates drop sharply after that.", type: "warning"  as const },
  { icon: TrendingUp,  text: "Revenue up 8% vs MRR month-on-month",      detail: "Strong growth. Double down on whatever acquisition channel is working.", type: "positive" as const },
  { icon: AlertCircle, text: "2 customers at risk — act today",          detail: "Jane and Mark both have overdue payments. A personal email recovers most of these.", type: "warning"  as const },
  { icon: Lightbulb,   text: "No upgrades this month",                   detail: "Highlight your higher-tier plan on next login or billing email.", type: "neutral"  as const },
];

export default function DemoPage() {
  const [proseTab, setProseTab] = useState<"momentum" | "mix" | "churn">("momentum");
  const [janeOpen, setJaneOpen] = useState(true);
  const [janeCopied, setJaneCopied] = useState(false);
  const [janeSending, setJaneSending] = useState(false);
  const [janeSent, setJaneSent] = useState(false);
  const [aliceOpen, setAliceOpen] = useState(false);
  const [aliceSending, setAliceSending] = useState(false);
  const [aliceSent, setAliceSent] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [showChatPrompt, setShowChatPrompt] = useState(false);

  function copyEmail() {
    navigator.clipboard.writeText(RECOVERY_EMAIL);
    setJaneCopied(true);
    setTimeout(() => setJaneCopied(false), 2000);
  }

  function sendEmail() {
    setJaneSending(true);
    setTimeout(() => { setJaneSending(false); setJaneSent(true); }, 1400);
  }

  function sendAliceEmail() {
    setAliceSending(true);
    setTimeout(() => { setAliceSending(false); setAliceSent(true); }, 1400);
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Demo banner */}
      <div className="bg-indigo-600 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold bg-white/20 text-white px-2.5 py-1 rounded-full">Demo</span>
          <p className="text-sm text-indigo-100">This is a live preview with sample data — nothing here is real.</p>
        </div>
        <Link href="/login" className="shrink-0 text-xs font-semibold bg-white text-indigo-600 px-4 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors">
          Connect your payments →
        </Link>
      </div>

      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between">
        <p className="text-sm font-bold tracking-tight text-gray-900">Revenue Intelligence</p>
        <Link href="/login" className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors">Sign up free →</Link>
      </nav>

      <div className="max-w-6xl mx-auto py-8 px-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Good morning.</h1>
            <p className="text-xs text-gray-400 mt-0.5">Thursday, 9 January</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden text-xs font-medium">
              {["7d","30d","90d","All"].map((l) => (
                <button key={l} className={`px-3 py-1.5 transition-colors ${l === "7d" ? "bg-indigo-600 text-white" : "text-gray-400"}`}>{l}</button>
              ))}
            </div>
            <button className="text-xs text-gray-400 border border-gray-200 px-3 py-1.5 rounded-lg min-w-[90px]">
              <RefreshCw size={12} className="inline mr-1" />Refresh
            </button>
          </div>
        </div>

        {/* ROI callout */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold text-green-600 uppercase tracking-widest mb-1">Recovered by Revenue Intelligence</p>
            <p className="text-3xl font-bold text-green-800 tabular-nums">£1,240</p>
            <p className="text-xs text-green-500 mt-1">3 of 7 invoices saved</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-4xl font-bold text-green-700 tabular-nums">42×</p>
            <p className="text-xs text-green-500 mt-1">your subscription cost</p>
          </div>
        </div>

        {/* Main 2+1 grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

          {/* Left — briefing + at-risk */}
          <div className="lg:col-span-2 space-y-4">

            {/* Briefing */}
            <div className="bg-white rounded-2xl border border-gray-200 p-7">
              <p className="text-[11px] font-semibold text-gray-400 tracking-widest uppercase mb-4">Your briefing</p>

              {/* Priority */}
              <div className="mb-5 bg-indigo-50 border-l-4 border-indigo-500 rounded-r-xl px-4 py-3">
                <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest mb-1">Today&apos;s priority</p>
                <p className="text-sm font-medium text-indigo-900">{PRIORITY}</p>
              </div>

              <p className="text-[17px] leading-relaxed text-gray-800">{COMMENTARY}</p>

              {/* Chat (locked) */}
              <div className="mt-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onFocus={() => setShowChatPrompt(true)}
                    placeholder="Who should I reach out to today?"
                    className="flex-1 text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder:text-gray-300"
                  />
                  <button className="text-sm font-medium bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors">Ask</button>
                </div>
                {showChatPrompt && (
                  <p className="text-xs text-gray-400 mt-2 pl-1">
                    <Link href="/login" className="text-indigo-500 hover:text-indigo-700 font-medium">Sign up free</Link> to chat with your own revenue data.
                  </p>
                )}
                {!showChatPrompt && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {["Why is jane@acme.com at risk?", "What's my biggest risk right now?", "Which customers are most likely to upgrade?"].map((q) => (
                      <button key={q} onClick={() => { setChatInput(q); setShowChatPrompt(true); }}
                        className="text-xs text-gray-400 hover:text-indigo-600 border border-gray-100 hover:border-indigo-200 px-3 py-1.5 rounded-full transition-colors">
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* At-risk */}
            <div className="bg-amber-50 border border-amber-100 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5">
                <p className="text-sm text-amber-900">
                  <span className="font-semibold">jane@acme.com</span> subscription is past due · 8 days overdue — reach out before they cancel.
                </p>
                <div className="shrink-0 flex items-center gap-3 ml-4">
                  <button onClick={() => setJaneOpen((o) => !o)}
                    className="text-xs font-semibold text-amber-700 hover:text-amber-900 transition-colors">
                    {janeOpen ? "Hide draft" : "Draft email →"}
                  </button>
                  <span className="text-xs font-semibold text-amber-600">View →</span>
                </div>
              </div>
              {janeOpen && (
                <div className="border-t border-amber-100 bg-white px-5 py-4">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{RECOVERY_EMAIL}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <button
                      onClick={sendEmail}
                      disabled={janeSending || janeSent}
                      className={`text-xs font-semibold transition-colors disabled:opacity-50 ${janeSent ? "text-green-600" : "text-indigo-600 hover:text-indigo-800"}`}
                    >
                      {janeSending ? "Sending…" : janeSent ? "Sent ✓" : "Send now →"}
                    </button>
                    <button onClick={copyEmail} className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors">
                      {janeCopied ? "Copied ✓" : "Copy"}
                    </button>
                    <span className="text-xs text-gray-400">Regenerate</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-xl px-5 py-3.5">
              <p className="text-sm text-amber-900">
                <span className="font-semibold">mark@startup.io</span> subscription is past due · 3 days overdue — reach out before they cancel.
              </p>
              <div className="shrink-0 flex items-center gap-3 ml-4">
                <span className="text-xs font-semibold text-amber-700">Draft email →</span>
                <span className="text-xs font-semibold text-amber-600">View →</span>
              </div>
            </div>

          {/* Expansion opportunities */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest px-1">Expansion opportunities</p>

            <div className="bg-indigo-50 border border-indigo-100 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5">
                <p className="text-sm text-indigo-900">
                  <span className="font-semibold">alice@startup.co</span> · 11 months on Starter — loyal customer, potential upgrade.
                </p>
                <div className="shrink-0 flex items-center gap-3 ml-4">
                  <button onClick={() => setAliceOpen(o => !o)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
                    {aliceOpen ? "Hide pitch" : "Draft pitch →"}
                  </button>
                  <span className="text-xs font-semibold text-indigo-500">View →</span>
                </div>
              </div>
              {aliceOpen && (
                <div className="border-t border-indigo-100 bg-white px-5 py-4">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{`Hey Alice — just wanted to check in. You've been using us for almost a year now and I genuinely appreciate that.

I wanted to make sure you're getting full value — we've added a few things on the Professional plan recently that I think you'd find useful, including advanced analytics and priority support.

Happy to walk you through it if you're curious — or if there's anything you've wished the product did, I'd love to hear it.`}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <button
                      onClick={sendAliceEmail}
                      disabled={aliceSending || aliceSent}
                      className={`text-xs font-semibold transition-colors disabled:opacity-50 ${aliceSent ? "text-green-600" : "text-indigo-600 hover:text-indigo-800"}`}
                    >
                      {aliceSending ? "Sending…" : aliceSent ? "Sent ✓" : "Send now →"}
                    </button>
                    <span className="text-xs text-gray-400">Copy</span>
                    <span className="text-xs text-gray-400">Regenerate</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-xl px-5 py-3.5">
              <p className="text-sm text-indigo-900">
                <span className="font-semibold">bob@techco.io</span> · 7 months on Starter — loyal customer, potential upgrade.
              </p>
              <div className="shrink-0 flex items-center gap-3 ml-4">
                <span className="text-xs font-semibold text-indigo-600">Draft pitch →</span>
                <span className="text-xs font-semibold text-indigo-500">View →</span>
              </div>
            </div>
          </div>

          </div>

          {/* Right — numbers + goal */}
          <div className="space-y-4">

            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">MRR</p>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-bold text-gray-900 tabular-nums">£4,820</p>
                <span className="text-xs font-semibold mb-1 text-green-600">+8% MoM</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">+£340 last 7 days</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "ARR",         value: "£57,840", color: "text-gray-900" },
                { label: "ARPU",        value: "£79",     color: "text-gray-900" },
                { label: "NRR",         value: "112%",    color: "text-green-600" },
                { label: "Quick Ratio", value: "3.2",     color: "text-amber-500" },
              ].map((m) => (
                <div key={m.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{m.label}</p>
                  <p className={`text-lg font-bold tabular-nums ${m.color}`}>{m.value}</p>
                </div>
              ))}
            </div>

            {/* Goal */}
            <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
              <div className="flex justify-between items-center text-xs text-gray-400 mb-2">
                <span>Goal: £10,000</span>
                <span className="font-medium text-gray-500">48%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-indigo-500 transition-all duration-500" style={{ width: "48%" }} />
              </div>
            </div>

          </div>
        </div>

        {/* Analysis tabs */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-5 w-fit">
            {([
              { key: "momentum" as const, label: "Momentum" },
              { key: "mix"      as const, label: "Mix"      },
              { key: "churn"    as const, label: "Churn"    },
            ]).map(({ key, label }) => (
              <button key={key} onClick={() => setProseTab(key)}
                className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${proseTab === key ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-600"}`}>
                {label}
              </button>
            ))}
          </div>
          <p className="text-sm leading-relaxed text-gray-700">{PROSE[proseTab]}</p>
        </div>

        {/* Activity feed */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <p className="text-xs font-semibold text-gray-500 mb-5">Recent Activity</p>
          <ul>
            {EVENTS.map((event, i) => {
              const cfg = typeConfig[event.type];
              return (
                <li key={i} className={`flex items-center gap-4 py-3 pl-3 border-b border-gray-50 last:border-0 border-l-2 ${cfg.border}`}>
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800 truncate">{event.email}</span>
                    <span className={`shrink-0 text-[11px] font-medium px-1.5 py-0.5 rounded-full ${cfg.pill}`}>{cfg.label}</span>
                  </div>
                  <span className={`text-sm font-medium tabular-nums ${event.type === "churn" ? "text-red-400" : "text-gray-700"}`}>
                    {event.type === "churn" ? "−" : "+"}£{(event.amount / 100).toFixed(2)}
                  </span>
                  <span className="text-xs text-gray-300 w-16 text-right shrink-0">{event.date}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Bottom CTA */}
        <div className="bg-indigo-600 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-bold text-white mb-2">See this with your own revenue data.</h2>
          <p className="text-indigo-200 text-sm mb-6">Connect Stripe, Paddle, or Revolut in 30 seconds. We&apos;ll show you exactly where you&apos;re losing money.</p>
          <Link href="/login" className="inline-flex items-center gap-2 bg-white text-indigo-600 font-semibold px-6 py-3 rounded-xl hover:bg-indigo-50 transition-colors text-sm">
            Connect & Find Lost Revenue →
          </Link>
          <p className="text-xs text-indigo-400 mt-4">Free · no credit card required</p>
        </div>

      </div>
    </div>
  );
}
