import { supabaseAdmin } from "@/lib/supabase-admin";

export async function getActivePaddleKey(userId: string): Promise<string | null> {
  const { data: billing } = await supabaseAdmin
    .from("user_billing")
    .select("active_paddle_connection_id")
    .eq("user_id", userId)
    .single();

  if (billing?.active_paddle_connection_id) {
    const { data: conn } = await supabaseAdmin
      .from("paddle_connections")
      .select("paddle_api_key")
      .eq("id", billing.active_paddle_connection_id)
      .eq("user_id", userId)
      .single();
    if (conn?.paddle_api_key) return conn.paddle_api_key;
  }

  const { data: conn } = await supabaseAdmin
    .from("paddle_connections")
    .select("paddle_api_key")
    .eq("user_id", userId)
    .order("connected_at", { ascending: true })
    .limit(1)
    .single();

  return conn?.paddle_api_key ?? null;
}
