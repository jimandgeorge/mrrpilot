import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getActiveStripeKey } from "@/lib/get-stripe-key";

export const runtime = "nodejs";

function toMonthKey(unixTs: number): string {
  const d = new Date(unixTs * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function addMonths(mk: string, n: number): string {
  const [y, m] = mk.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthsDiff(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

function fmtMonth(mk: string): string {
  return new Date(mk + "-01").toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

export async function GET(request: NextRequest) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stripeKey = await getActiveStripeKey(user.id);
  if (!stripeKey) return NextResponse.json({ error: "No Stripe key" }, { status: 400 });

  const stripe = new Stripe(stripeKey, { apiVersion: "2026-03-25.dahlia" });

  const invoices = await stripe.invoices.list({ status: "paid", limit: 100 })
    .autoPagingToArray({ limit: 2000 });

  // Build per-customer cohort and active-month sets
  const customerFirstMonth: Record<string, string> = {};
  const customerActiveMonths: Record<string, Set<string>> = {};

  for (const inv of invoices) {
    if (!inv.amount_paid || !inv.customer) continue;
    const cid = typeof inv.customer === "string" ? inv.customer : (inv.customer as any).id;
    const mk = toMonthKey(inv.created);

    if (!customerFirstMonth[cid] || mk < customerFirstMonth[cid]) {
      customerFirstMonth[cid] = mk;
    }
    if (!customerActiveMonths[cid]) customerActiveMonths[cid] = new Set();
    customerActiveMonths[cid].add(mk);
  }

  const currentMk = toMonthKey(Math.floor(Date.now() / 1000));
  const MAX_MONTHS = 12;

  // Group customers into cohorts
  const cohortMap: Record<string, string[]> = {};
  for (const [cid, month] of Object.entries(customerFirstMonth)) {
    if (!cohortMap[month]) cohortMap[month] = [];
    cohortMap[month].push(cid);
  }

  const cohorts = Object.entries(cohortMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mk, customers]) => {
      const monthsElapsed = Math.min(monthsDiff(mk, currentMk), MAX_MONTHS);
      const retention: (number | null)[] = [];

      for (let offset = 0; offset <= MAX_MONTHS; offset++) {
        if (offset > monthsElapsed) {
          retention.push(null); // future — no data yet
        } else {
          const targetMk = addMonths(mk, offset);
          const active = customers.filter((cid) => customerActiveMonths[cid]?.has(targetMk)).length;
          retention.push(Math.round((active / customers.length) * 100));
        }
      }

      return { month: fmtMonth(mk), size: customers.length, retention };
    });

  return NextResponse.json({ cohorts, maxMonths: MAX_MONTHS });
}
