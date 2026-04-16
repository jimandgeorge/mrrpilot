/**
 * Upgrades alice@example.com from Basic to Pro
 * Usage: STRIPE_KEY=sk_test_... node scripts/upgrade-alice.js
 */
const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_KEY);

async function run() {
  // Find alice
  const customers = await stripe.customers.list({ email: "alice@example.com", limit: 1 });
  const alice = customers.data[0];
  if (!alice) { console.error("alice@example.com not found"); process.exit(1); }

  // Get her active subscription
  const subs = await stripe.subscriptions.list({ customer: alice.id, status: "active", limit: 1 });
  const sub = subs.data[0];
  if (!sub) { console.error("No active subscription found"); process.exit(1); }

  // Find the Pro price
  const prices = await stripe.prices.list({ active: true });
  const pro = prices.data.find(p => p.nickname === "Pro");
  if (!pro) { console.error("Pro price not found — run seed first"); process.exit(1); }

  // Upgrade
  await stripe.subscriptions.update(sub.id, {
    items: [{ id: sub.items.data[0].id, price: pro.id }],
    proration_behavior: "create_prorations",
  });

  console.log(`✓ alice@example.com upgraded to Pro (£${(pro.unit_amount / 100).toFixed(0)}/mo)`);
  console.log("  Refresh RevInt — MRR should increase from £415 to £465");
}

run().catch(e => { console.error(e.message); process.exit(1); });
