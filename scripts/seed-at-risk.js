/**
 * Creates an at-risk test subscription (incomplete — payment fails on first charge).
 * Usage: STRIPE_KEY=sk_test_... node scripts/seed-at-risk.js
 */

const Stripe = require("stripe");

const key = process.env.STRIPE_KEY;
if (!key || !key.startsWith("sk_test_")) {
  console.error("Set STRIPE_KEY=sk_test_... before running");
  process.exit(1);
}

const stripe = new Stripe(key);

async function run() {
  const prices = await stripe.prices.list({ active: true });
  const basic = prices.data.find((p) => p.nickname === "Basic");
  if (!basic) { console.error("Basic price not found — run seed.js first"); process.exit(1); }

  // Create a PaymentMethod with a card that fails at charge time (test mode allows raw card data)
  const pm = await stripe.paymentMethods.create({
    type: "card",
    card: { number: "4000000000009995", exp_month: 12, exp_year: 2030, cvc: "123" },
  });

  const customer = await stripe.customers.create({
    email: "frank@example.com",
    name: "Frank Miller",
  });

  await stripe.paymentMethods.attach(pm.id, { customer: customer.id });
  await stripe.customers.update(customer.id, {
    invoice_settings: { default_payment_method: pm.id },
  });

  const sub = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: basic.id }],
    payment_behavior: "allow_incomplete",
    default_payment_method: pm.id,
    expand: ["latest_invoice"],
  });

  console.log(`\n✓ frank@example.com created`);
  console.log(`  Subscription status : ${sub.status}`);
  console.log(`  Invoice status      : ${sub.latest_invoice?.status ?? "n/a"}`);
  console.log(`  Customer ID         : ${customer.id}`);
  console.log("\nRefresh RevInt — frank should appear in the at-risk section.");
}

run().catch((err) => { console.error(err.message); process.exit(1); });
