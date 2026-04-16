import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Returns the active Stripe secret key for a user.
 * Uses user_billing.active_stripe_connection_id if set, otherwise falls back
 * to the first (oldest) connection.
 */
export async function getActiveStripeKey(userId: string): Promise<string | null> {
  const { data: billing } = await supabaseAdmin
    .from("user_billing")
    .select("active_stripe_connection_id")
    .eq("user_id", userId)
    .single();

  if (billing?.active_stripe_connection_id) {
    const { data: conn } = await supabaseAdmin
      .from("stripe_connections")
      .select("stripe_secret_key")
      .eq("id", billing.active_stripe_connection_id)
      .eq("user_id", userId)
      .single();
    if (conn?.stripe_secret_key) return conn.stripe_secret_key;
  }

  // Fallback: oldest connection
  const { data: conn } = await supabaseAdmin
    .from("stripe_connections")
    .select("stripe_secret_key")
    .eq("user_id", userId)
    .order("connected_at", { ascending: true })
    .limit(1)
    .single();

  return conn?.stripe_secret_key ?? null;
}
