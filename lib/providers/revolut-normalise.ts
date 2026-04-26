import type { NormalisedInvoice, NormalisedEvent } from "./types";

// Revolut billing_cycle.unit values are uppercase: "MONTH", "YEAR", "WEEK", "DAY"
export function revToMonthly(amount: number, unit: string, period: number): number {
  const u = unit.toUpperCase();
  if (u === "YEAR") return Math.round(amount / (12 * period));
  if (u === "WEEK") return Math.round((amount * 52) / (12 * period));
  if (u === "DAY")  return Math.round((amount * 365) / (12 * period));
  return Math.round(amount / period); // MONTH
}

// seenCustomers is mutated — first occurrence per customer becomes "subscription_create"
// subBillingMap: subscription_id → { unit, period } for monthly normalisation
export function normaliseRevolutOrder(
  order: any,
  seenCustomers: Set<string>,
  subBillingMap: Map<string, { unit: string; period: number }>
): NormalisedInvoice {
  const customerId = order.email ?? order.customer_id ?? order.id;
  const isFirst = !seenCustomers.has(customerId);
  seenCustomers.add(customerId);

  const billing = subBillingMap.get(order.subscription_id) ?? { unit: "MONTH", period: 1 };
  const billingReason = isFirst ? "subscription_create"
    : order.type === "SUBSCRIPTION_CHANGE" ? "subscription_update"
    : "subscription_cycle";

  return {
    id: order.id,
    customerId,
    customerEmail: order.email ?? null,
    amountPaid: order.amount ?? 0,
    monthlyAmount: revToMonthly(order.amount ?? 0, billing.unit, billing.period),
    created: Math.floor(new Date(order.created_at).getTime() / 1000),
    billingReason,
  };
}

export function normaliseRevolutCancellation(sub: any): NormalisedEvent {
  const unit = sub.billing_cycle?.unit ?? "MONTH";
  const period = sub.billing_cycle?.period ?? 1;
  return {
    id: sub.id,
    type: "customer.subscription.deleted",
    customerId: sub.email ?? sub.id,
    created: Math.floor(new Date(sub.cancelled_at ?? sub.updated_at ?? Date.now()).getTime() / 1000),
    monthlyAmount: revToMonthly(sub.amount ?? 0, unit, period),
  };
}
