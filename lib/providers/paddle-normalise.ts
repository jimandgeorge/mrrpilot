import type { NormalisedInvoice, NormalisedEvent } from "./types";

export function paddleToMonthly(amount: number, interval: string, frequency: number): number {
  if (interval === "year")  return Math.round(amount / (12 * frequency));
  if (interval === "week")  return Math.round((amount * 52) / (12 * frequency));
  if (interval === "day")   return Math.round((amount * 365) / (12 * frequency));
  return Math.round(amount / frequency); // month
}

// seenCustomers is mutated — first occurrence per customer becomes "subscription_create"
export function normalisePaddleTransaction(
  txn: any,
  customerEmail: string | null,
  seenCustomers: Set<string>
): NormalisedInvoice {
  const item = txn.items?.[0];
  const total = parseInt(txn.details?.totals?.total ?? "0", 10);
  const billingCycle = item?.price?.billing_cycle;
  const interval = billingCycle?.interval ?? "month";
  const frequency = billingCycle?.frequency ?? 1;

  const isFirst = !seenCustomers.has(txn.customer_id);
  if (txn.customer_id) seenCustomers.add(txn.customer_id);

  const billingReason = isFirst ? "subscription_create"
    : txn.origin === "subscription_update" ? "subscription_update"
    : "subscription_cycle";

  return {
    id: txn.id,
    customerId: txn.customer_id ?? "",
    customerEmail,
    amountPaid: total,
    monthlyAmount: paddleToMonthly(total, interval, frequency),
    created: Math.floor(new Date(txn.billed_at ?? txn.created_at).getTime() / 1000),
    billingReason,
  };
}

export function normalisePaddleCancellation(sub: any, customerEmail: string | null): NormalisedEvent {
  const item = sub.items?.[0];
  const unitAmount = parseInt(item?.price?.unit_price?.amount ?? "0", 10) * (item?.quantity ?? 1);
  const interval = sub.billing_cycle?.interval ?? "month";
  const frequency = sub.billing_cycle?.frequency ?? 1;
  return {
    id: sub.id,
    type: "customer.subscription.deleted",
    customerId: sub.customer_id ?? "",
    created: Math.floor(new Date(sub.canceled_at ?? sub.updated_at ?? Date.now()).getTime() / 1000),
    monthlyAmount: paddleToMonthly(unitAmount, interval, frequency),
  };
}
