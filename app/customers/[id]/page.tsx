"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Invoice = {
  id: string;
  created: number;
  amount_paid: number;
  amount_due: number;
  status: string;
  billing_reason: string | null;
  hosted_invoice_url: string | null;
  lines: { data: any[] };
};

type Subscription = {
  id: string;
  status: string;
  created: number;
  current_period_end: number;
  items: { data: any[] };
  cancellation_details?: { reason?: string; feedback?: string } | null;
};

function monthlyAmount(inv: Invoice): number {
  const line = inv.lines?.data?.[0];
  const interval = line?.price?.recurring?.interval;
  const intervalCount = line?.price?.recurring?.interval_count || 1;
  const amount = inv.amount_paid || 0;
  if (interval === "year") return Math.round(amount / (12 * intervalCount));
  if (interval === "week") return Math.round((amount * 52) / (12 * intervalCount));
  return Math.round(amount / intervalCount);
}

function billingType(inv: Invoice, isFirst: boolean): { label: string; pill: string } {
  if (isFirst) return { label: "New", pill: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-100 dark:border-green-900/50" };
  if (inv.billing_reason === "subscription_update") return { label: "Upgrade", pill: "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-900/50" };
  return { label: "Renewal", pill: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50" };
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [customerEmail, setCustomerEmail] = useState("");
  const [note, setNote] = useState("");
  const [editingNote, setEditingNote] = useState(false);
  const [noteInput, setNoteInput] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const token = session?.access_token ?? "";

      fetch("/api/notes", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => { if (d.notes?.[id]) setNote(d.notes[id]); });

      fetch(`/api/customer/${id}`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((data) => {
          if (data.error) { setError(data.error); setLoading(false); return; }
          const sorted: Invoice[] = [...(data.invoices || [])].sort((a, b) => a.created - b.created);
          setInvoices(sorted);
          setSubscriptions(data.subscriptions || []);
          setCustomerEmail(data.customer?.email || "Unknown");
          setLoading(false);
        })
        .catch(() => { setError("Failed to load customer."); setLoading(false); });
    });
  }, [id]);

  async function saveNote() {
    const trimmed = noteInput.trim();
    setNote(trimmed);
    setEditingNote(false);
    setNoteInput("");
    const { data: { session } } = await supabase.auth.getSession();
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
      body: JSON.stringify({ stripeCustomerId: id, note: trimmed }),
    });
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-6 space-y-5">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-7 animate-pulse flex gap-5 items-start">
          <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 animate-pulse space-y-2">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-6">
        <a href="/customers" className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">← Customers</a>
        <p className="mt-6 text-sm text-red-500 dark:text-red-400">{error}</p>
      </div>
    );
  }

  // Metrics
  const total = invoices.reduce((s, inv) => s + (inv.amount_paid || 0), 0);
  const paidInvoices = invoices.filter((inv) => inv.amount_paid > 0);
  const firstPayment = paidInvoices[0] ? new Date(paidInvoices[0].created * 1000) : null;
  const lastPayment = paidInvoices[paidInvoices.length - 1] ? new Date(paidInvoices[paidInvoices.length - 1].created * 1000) : null;
  const avgPayment = paidInvoices.length > 0 ? total / paidInvoices.length : 0;
  const latestPaid = paidInvoices[paidInvoices.length - 1];
  const mrr = latestPaid ? monthlyAmount(latestPaid) : 0;
  const tenureMonths = firstPayment && lastPayment
    ? Math.max(1, Math.round((lastPayment.getTime() - firstPayment.getTime()) / (1000 * 60 * 60 * 24 * 30)))
    : 0;

  // Subscription status — match main dashboard: churned only if canceled AND last invoice >35 days ago
  const activeSub = subscriptions.find((s) => s.status === "active" || s.status === "trialing");
  const hasCanceledSub = subscriptions.some((s) => s.status === "canceled");
  const latestInvoiceAt = paidInvoices.length > 0 ? paidInvoices[paidInvoices.length - 1].created : 0;
  const thirtyFiveDaysAgo = Math.floor(Date.now() / 1000) - 35 * 24 * 60 * 60;
  const isChurned = !activeSub && hasCanceledSub && latestInvoiceAt < thirtyFiveDaysAgo;

  // Avatar initial
  const initial = customerEmail?.[0]?.toUpperCase() ?? "?";

  // Invoice display
  const displayInvoices = [...invoices].reverse().map((inv) => ({
    inv,
    type: billingType(inv, paidInvoices[0]?.id === inv.id),
  }));

  return (
    <div className="max-w-4xl mx-auto py-8 px-6 space-y-5">

      {/* Back */}
      <a href="/customers" className="inline-flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
        <ArrowLeft size={13} /> Customers
      </a>

      {/* Profile header */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-7">
        <div className="flex items-start gap-5">

          {/* Avatar */}
          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shrink-0 ${
            isChurned ? "bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400" : "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
          }`}>
            {initial}
          </div>

          {/* Identity */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 truncate">{customerEmail}</h1>
              {isChurned ? (
                <span className="text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 px-2.5 py-0.5 rounded-full shrink-0">Churned</span>
              ) : activeSub ? (
                <span className="text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-100 dark:border-green-900/50 px-2.5 py-0.5 rounded-full shrink-0">Active</span>
              ) : (
                <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2.5 py-0.5 rounded-full shrink-0">No subscription</span>
              )}
            </div>

            <div className="flex items-center gap-4 mt-1.5 flex-wrap">
              <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">{id}</span>
              {activeSub && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  Renews {new Date(activeSub.current_period_end * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              )}
              {firstPayment && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  Customer since {firstPayment.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                </span>
              )}
            </div>

            {/* Note */}
            <div className="mt-3">
              {editingNote ? (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveNote(); if (e.key === "Escape") { setEditingNote(false); setNoteInput(""); } }}
                    placeholder="Add a note about this customer…"
                    className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-600 bg-white dark:bg-gray-800"
                  />
                  <button onClick={saveNote} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700">Save</button>
                  <button onClick={() => { setEditingNote(false); setNoteInput(""); }} className="text-xs text-gray-400 dark:text-gray-500 px-2">✕</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {note && <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg px-3 py-1.5 italic">"{note}"</p>}
                  <button
                    onClick={() => { setEditingNote(true); setNoteInput(note); }}
                    className="text-xs text-gray-300 dark:text-gray-600 hover:text-indigo-500 transition-colors"
                  >
                    {note ? "Edit note" : "+ Add note"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-sm transition-shadow">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Total Revenue</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">£{(total / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          {paidInvoices.length > 0 && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{paidInvoices.length} payment{paidInvoices.length !== 1 ? "s" : ""}</p>}
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-sm transition-shadow">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">MRR</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">£{(mrr / 100).toLocaleString("en-GB", { maximumFractionDigits: 0 })}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">per month</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-sm transition-shadow">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Avg Payment</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">£{(avgPayment / 100).toFixed(2)}</p>
          {lastPayment && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Last {lastPayment.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>}
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-sm transition-shadow">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Tenure</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{tenureMonths > 0 ? `${tenureMonths}mo` : "—"}</p>
          {firstPayment && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">since {firstPayment.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}</p>}
        </div>
      </div>

      {/* Invoice history */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-6 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/60">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Date</p>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Type</p>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">Amount</p>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-4" />
        </div>

        {displayInvoices.length === 0 ? (
          <p className="px-6 py-10 text-sm text-gray-400 dark:text-gray-500 text-center">No invoices found.</p>
        ) : (
          <ul>
            {displayInvoices.map(({ inv, type }) => (
              <li key={inv.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-6 py-3.5 border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-800 transition-colors">
                <span className="text-sm text-gray-700 dark:text-gray-300 tabular-nums">
                  {new Date(inv.created * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${type.pill}`}>
                  {type.label}
                </span>
                <span className={`text-sm font-semibold tabular-nums text-right ${inv.amount_paid > 0 ? "text-gray-800 dark:text-gray-200" : "text-gray-400 dark:text-gray-500"}`}>
                  £{(inv.amount_paid / 100).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                </span>
                <span className="w-4 flex justify-end">
                  {inv.hosted_invoice_url ? (
                    <a
                      href={inv.hosted_invoice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-300 dark:text-gray-600 hover:text-indigo-500 transition-colors"
                    >
                      <ExternalLink size={13} />
                    </a>
                  ) : <span />}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

    </div>
  );
}
