import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getActiveStripeKey } from "@/lib/get-stripe-key";
import MrrChart from "./chart";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };
type MrrPoint = { month: string; mrr: number };

async function getPageData(slug: string) {
  const { data: page } = await supabaseAdmin
    .from("public_pages")
    .select("user_id, company_name, tagline, hide_revenue, is_enabled")
    .eq("slug", slug)
    .maybeSingle();

  if (!page || !page.is_enabled) return null;

  const stripeKey = await getActiveStripeKey(page.user_id);
  if (!stripeKey) return null;

  const stripe = new Stripe(stripeKey, { apiVersion: "2026-03-25.dahlia" });

  const [invoices, subs] = await Promise.all([
    stripe.invoices.list({ limit: 100 }).autoPagingToArray({ limit: 10000 }),
    stripe.subscriptions.list({ status: "active", limit: 100, expand: ["data.items.data.price"] }).autoPagingToArray({ limit: 10000 }),
  ]);

  // Current MRR from active subscriptions
  let currentMrr = 0;
  for (const sub of subs) {
    for (const item of sub.items.data) {
      const price = item.price as Stripe.Price;
      const amount = price.unit_amount ?? 0;
      const interval = price.recurring?.interval;
      const ic = price.recurring?.interval_count ?? 1;
      let monthly = amount * (item.quantity ?? 1);
      if (interval === "year") monthly = Math.round(monthly / (12 * ic));
      else if (interval === "week") monthly = Math.round((monthly * 52) / (12 * ic));
      else monthly = Math.round(monthly / ic);
      currentMrr += monthly;
    }
  }

  // Monthly MRR history from paid invoices
  const byMonth: Record<string, number> = {};
  for (const inv of invoices) {
    if (!inv.amount_paid || inv.amount_paid <= 0) continue;
    const d = new Date(inv.created * 1000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const line = inv.lines?.data?.[0] as any;
    const interval = line?.price?.recurring?.interval;
    const ic = line?.price?.recurring?.interval_count || 1;
    let monthly = inv.amount_paid;
    if (interval === "year") monthly = Math.round(monthly / (12 * ic));
    else if (interval === "week") monthly = Math.round((monthly * 52) / (12 * ic));
    else monthly = Math.round(monthly / ic);
    byMonth[key] = (byMonth[key] ?? 0) + monthly;
  }

  const history: MrrPoint[] = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([key, val]) => ({
      month: new Date(key + "-01").toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
      mrr: Math.round(val / 100),
    }));

  // Override last point with live subscription MRR
  if (history.length > 0) {
    history[history.length - 1].mrr = Math.round(currentMrr / 100);
  }

  const prevMrr = history.length >= 2 ? history[history.length - 2].mrr : null;
  const currentMrrPounds = Math.round(currentMrr / 100);
  const momPct = prevMrr && prevMrr > 0
    ? Math.round(((currentMrrPounds - prevMrr) / prevMrr) * 100)
    : null;

  return {
    companyName: page.company_name || slug,
    tagline: page.tagline || "",
    hideRevenue: page.hide_revenue,
    currentMrr: currentMrrPounds,
    arr: currentMrrPounds * 12,
    customers: subs.length,
    momPct,
    history,
    updatedAt: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const d = await getPageData(slug);
  if (!d) return { title: "Revenue Dashboard" };

  const title = `${d.companyName} — Live Revenue`;
  const desc = d.tagline
    || `${d.companyName}'s live MRR dashboard. ${d.momPct !== null && d.momPct > 0 ? `Growing ${d.momPct}% month-over-month.` : ""}`;

  return {
    title,
    description: desc,
    openGraph: { title, description: desc, type: "website" },
    twitter: { card: "summary", title, description: desc },
  };
}

export default async function PublicRevenuePage({ params }: Props) {
  const { slug } = await params;
  const d = await getPageData(slug);
  if (!d) notFound();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col">

      {/* Header */}
      <header className="border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center justify-between max-w-3xl mx-auto w-full">
        <div>
          <p className="text-base font-bold text-gray-900 dark:text-gray-100">{d.companyName}</p>
          {d.tagline && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{d.tagline}</p>}
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          Live from Stripe
        </span>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12 space-y-8">

        {/* Hero number */}
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Monthly Recurring Revenue</p>
            {d.hideRevenue ? (
              <p className="text-5xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                {d.momPct !== null
                  ? <>{d.momPct >= 0 ? "+" : ""}{d.momPct}% <span className="text-2xl font-medium text-gray-400 dark:text-gray-500">MoM</span></>
                  : "Growing"}
              </p>
            ) : (
              <p className="text-5xl font-bold text-gray-900 dark:text-gray-100 tracking-tight tabular-nums">
                £{d.currentMrr.toLocaleString("en-GB")}
              </p>
            )}
          </div>
          {d.momPct !== null && !d.hideRevenue && (
            <span className={`mb-2 inline-flex items-center text-sm font-semibold px-3 py-1.5 rounded-full ${
              d.momPct >= 0 ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300" : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
            }`}>
              {d.momPct >= 0 ? "+" : ""}{d.momPct}% MoM
            </span>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: "ARR",
              value: d.hideRevenue ? "—" : `£${d.arr.toLocaleString("en-GB")}`,
            },
            {
              label: "Customers",
              value: String(d.customers),
            },
            {
              label: "MoM Growth",
              value: d.momPct !== null ? `${d.momPct >= 0 ? "+" : ""}${d.momPct}%` : "—",
              color: d.momPct !== null ? (d.momPct >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400") : "text-gray-400 dark:text-gray-500",
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-gray-50 dark:bg-gray-800 rounded-2xl px-5 py-4 border border-gray-100 dark:border-gray-700">
              <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">{stat.label}</p>
              <p className={`text-xl font-bold tabular-nums ${stat.color ?? "text-gray-900 dark:text-gray-100"}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Chart */}
        {d.history.length >= 2 && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-5">MRR History</p>
            <MrrChart data={d.history} hideRevenue={d.hideRevenue} />
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 dark:border-gray-800 px-6 py-5 max-w-3xl mx-auto w-full flex items-center justify-between">
        <p className="text-xs text-gray-400 dark:text-gray-500">Updated {d.updatedAt}</p>
        <Link
          href="/"
          className="text-xs text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1.5"
        >
          Powered by <span className="font-semibold text-gray-600 dark:text-gray-400">Revenue Intelligence</span>
        </Link>
      </footer>

    </div>
  );
}
