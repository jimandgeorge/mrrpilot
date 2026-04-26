import { supabaseAdmin } from "@/lib/supabase-admin";

export async function getActiveRevolutKey(userId: string): Promise<{ key: string; isSandbox: boolean } | null> {
  const { data: billing } = await supabaseAdmin
    .from("user_billing")
    .select("active_revolut_connection_id")
    .eq("user_id", userId)
    .single();

  if (billing?.active_revolut_connection_id) {
    const { data: conn } = await supabaseAdmin
      .from("revolut_connections")
      .select("revolut_api_key, is_sandbox")
      .eq("id", billing.active_revolut_connection_id)
      .eq("user_id", userId)
      .single();
    if (conn?.revolut_api_key) return { key: conn.revolut_api_key, isSandbox: conn.is_sandbox };
  }

  const { data: conn } = await supabaseAdmin
    .from("revolut_connections")
    .select("revolut_api_key, is_sandbox")
    .eq("user_id", userId)
    .order("connected_at", { ascending: true })
    .limit(1)
    .single();

  return conn ? { key: conn.revolut_api_key, isSandbox: conn.is_sandbox } : null;
}
