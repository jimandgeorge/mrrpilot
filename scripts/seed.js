/**
 * RevInt test data seeder
 * Usage: STRIPE_KEY=sk_test_... node scripts/seed.js
 *
 * Creates predictable subscriptions so you know exactly what RevInt should show.
 *
 * Expected output after running:
 *   Active customers : 5
 *   MRR              : £415/mo
 *   Churned          : 1 (carol@example.com)
 *   At-risk          : 0 (unless you manually mark a sub past_due in Stripe)
 */

const Stripe = require("stripe");

const key = process.env.STRIPE_KEY;
if (!key || !key.startsWith("sk_test_")) {
  console.error("Set STRIPE_KEY=sk_test_... before running");
  process.exit(1);
}

const stripe = new Stripe(key, { apiVersion: "2026-03-25.dahlia" });

async function run() {
  console.log("Creating products...");

  const product = await stripe.products.create({ name: "RevInt Test App" });

  const [basic, pro, enterprise] = await Promise.all([
    stripe.prices.create({ product: product.id, currency: "gbp", unit_amount: 2900, recurring: { interval: "month" }, nickname: "Basic" }),
    stripe.prices.create({ product: product.id, currency: "gbp", unit_amount: 7900, recurring: { interval: "month" }, nickname: "Pro" }),
    stripe.prices.create({ product: product.id, currency: "gbp", unit_amount: 19900, recurring: { interval: "month" }, nickname: "Enterprise" }),
  ]);

  console.log("Creating customers...");

  // Helper — creates customer + payment method + subscription
  async function subscribe(email, name, price, backdateTs) {
    const customer = await stripe.customers.create({ email, name });
    const pm = await stripe.paymentMethods.create({ type: "card", card: { token: "tok_visa" } });
    await stripe.paymentMethods.attach(pm.id, { customer: customer.id });
    await stripe.customers.update(customer.id, { invoice_settings: { default_payment_method: pm.id } });
    const params = { customer: customer.id, items: [{ price: price.id }], default_payment_method: pm.id };
    if (backdateTs) params.backdate_start_date = backdateTs;
    const sub = await stripe.subscriptions.create(params);
    return { customer, sub };
  }

  // Dec 2025 cohort — 4 months of history
  const { customer: alice } = await subscribe("alice@example.com",   "Alice Johnson",  basic,      1764547200); // 2025-12-01
  const { customer: bob }   = await subscribe("bob@example.com",     "Bob Smith",      pro,        1764547200);

  // Carol — Enterprise, then churned
  const { customer: carol, sub: carolSub } = await subscribe("carol@example.com", "Carol White", enterprise, 1764547200);
  await stripe.subscriptions.cancel(carolSub.id);

  // Jan 2026 cohort
  const { customer: dave } = await subscribe("dave@example.com", "Dave Brown", basic, 1767225600); // 2026-01-01
  const { customer: eve }  = await subscribe("eve@example.com",  "Eve Davis",  pro,   1767225600);

  // Mar 2026 — new this month
  const { customer: henry } = await subscribe("henry@example.com", "Henry Clark", enterprise);

  console.log("\n✓ Done. Expected RevInt values:");
  console.log("  Active customers : 5  (alice, bob, dave, eve, henry)");
  console.log("  Churned          : 1  (carol)");
  console.log("  MRR              : £415/mo  (£29 + £79 + £29 + £79 + £199)");
  console.log("  New this month   : 1  (henry, £199)");
  console.log("  At-risk          : 0  (none past_due)");
  console.log("\nCustomer IDs:");
  console.log("  alice :", alice.id);
  console.log("  bob   :", bob.id);
  console.log("  carol :", carol.id, "(churned)");
  console.log("  dave  :", dave.id);
  console.log("  eve   :", eve.id);
  console.log("  henry :", henry.id);
}

run().catch((err) => { console.error(err.message); process.exit(1); });
