import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

export async function GET() {
  try {
    // 📡 Fetch Stripe data
    const [subscriptions, invoices, events] = await Promise.all([
      stripe.subscriptions.list({ limit: 50 }),
      stripe.invoices.list({ limit: 100 }),
      stripe.events.list({ limit: 50 }),
    ]);

    // 🧠 Build customers from invoices
    const customerMap: Record<string, any> = {};

    invoices.data.forEach((inv: any) => {
      const email = inv.customer_email || "Unknown";

      if (!customerMap[email]) {
        customerMap[email] = {
          email,
          total: 0,
          payments: 0,
          lastPayment: null,
          churned: false,
        };
      }

      customerMap[email].total += inv.amount_paid || 0;
      customerMap[email].payments += 1;

      const date = new Date(inv.created * 1000);

      if (
        !customerMap[email].lastPayment ||
        date > customerMap[email].lastPayment
      ) {
        customerMap[email].lastPayment = date;
      }
    });

    // 💀 Auto churn detection (no payment in 30+ days)
    const now = new Date();

    Object.values(customerMap).forEach((c: any) => {
      const last = new Date(c.lastPayment);

      const daysSince =
        (now.getTime() - last.getTime()) /
        (1000 * 60 * 60 * 24);

      if (daysSince > 30) {
        c.churned = true;
      }
    });

    const customers = Object.values(customerMap);

    // 🧪 TEST DATA (remove later)
    customers.push({
      email: "test1@example.com",
      total: 500,
      payments: 1,
      lastPayment: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
      churned: true,
    });

    customers.push({
      email: "vip@example.com",
      total: 10000,
      payments: 5,
      lastPayment: new Date(),
      churned: false,
    });

    // 📤 Return data
    return NextResponse.json({
      subscriptions: subscriptions.data,
      invoices: invoices.data,
      events: events.data,
      customers,
    });

  } catch (error) {
    console.error("Stripe API error:", error);

    return NextResponse.json({
      subscriptions: [],
      invoices: [],
      events: [],
      customers: [],
    });
  }
}