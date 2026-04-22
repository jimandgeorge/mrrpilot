import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

async function getUser(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  return user;
}

export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabaseAdmin
    .from("public_pages")
    .select("slug, company_name, tagline, hide_revenue, is_enabled")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({ page: data ?? null });
}

export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { slug, company_name, tagline, hide_revenue, is_enabled } = body;

  const cleanSlug = (slug ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (!cleanSlug || cleanSlug.length < 2) {
    return NextResponse.json({ error: "Slug must be at least 2 characters (letters, numbers, hyphens)" }, { status: 400 });
  }

  // Check slug not taken by another user
  const { data: existing } = await supabaseAdmin
    .from("public_pages")
    .select("user_id")
    .eq("slug", cleanSlug)
    .maybeSingle();

  if (existing && existing.user_id !== user.id) {
    return NextResponse.json({ error: "That URL is already taken — try another" }, { status: 409 });
  }

  const { data, error } = await supabaseAdmin
    .from("public_pages")
    .upsert(
      {
        user_id: user.id,
        slug: cleanSlug,
        company_name: (company_name ?? "").trim(),
        tagline: (tagline ?? "").trim(),
        hide_revenue: hide_revenue ?? false,
        is_enabled: is_enabled ?? true,
      },
      { onConflict: "user_id" }
    )
    .select("slug, company_name, tagline, hide_revenue, is_enabled")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ page: data });
}

export async function DELETE(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await supabaseAdmin.from("public_pages").delete().eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
