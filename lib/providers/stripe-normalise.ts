import type Stripe from "stripe";
import type { NormalisedInvoice, NormalisedEvent } from "./types";

function toMonthly(amount: number, interval: string | null | undefined, intervalCount: number): number {
  if (interval === "year") return Math.round(amount / (12 * intervalCount));
  if (interval === "week") return Math.round((amount * 52) / (12 * intervalCount));
  return Math.round(amount / intervalCount);
}

export function normaliseStripeInvoice(inv: Stripe.Invoice): NormalisedInvoice {
  const line = inv.lines?.data?.[0] as any;
  const interval: string | undefined = line?.price?.recurring?.interval;
  const ic: number = line?.price?.recurring?.interval_count || 1;
  return {
    id: inv.id,
    customerId: typeof inv.customer === "string" ? inv.customer : (inv.customer as any)?.id ?? "",
    customerEmail: inv.customer_email ?? null,
    amountPaid: inv.amount_paid ?? 0,
    monthlyAmount: inv.amount_paid ? toMonthly(inv.amount_paid, interval, ic) : 0,
    created: inv.created,
    billingReason: inv.billing_reason ?? "manual",
  };
}

export function normaliseStripeEvent(evt: Stripe.Event): NormalisedEvent {
  const obj = evt.data.object as any;
  const customerId = typeof obj.customer === "string" ? obj.customer : obj.customer?.id ?? "";
  let monthlyAmount = 0;
  if (evt.type === "customer.subscription.deleted") {
    const item = obj.items?.data?.[0];
    const unitAmount = (item?.price?.unit_amount ?? 0) * (item?.quantity ?? 1);
    monthlyAmount = toMonthly(unitAmount, item?.price?.recurring?.interval, item?.price?.recurring?.interval_count || 1);
  }
  return { id: evt.id, type: evt.type, customerId, created: evt.created, monthlyAmount };
}
