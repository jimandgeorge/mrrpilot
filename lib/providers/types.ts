// Provider-agnostic data types. All monetary values in pence.

export type NormalisedInvoice = {
  id: string;
  customerId: string;
  customerEmail: string | null;
  amountPaid: number;      // pence — total charge on this invoice
  monthlyAmount: number;   // pence — normalised to per-month equivalent
  created: number;         // unix timestamp
  billingReason: string;   // "subscription_create" | "subscription_cycle" | "subscription_update" | ...
};

export type NormalisedEvent = {
  id: string;
  type: string;            // e.g. "customer.subscription.deleted"
  customerId: string;
  created: number;
  monthlyAmount: number;   // pence — MRR value of the event (e.g. MRR lost on deletion); 0 if not applicable
};
