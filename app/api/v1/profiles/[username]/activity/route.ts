import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { ActivityEventRpcRow } from "@/lib/types/database";

type Ctx = { params: Promise<{ username: string }> };

export async function GET(request: Request, context: Ctx) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const { username } = await context.params;
  const slug = decodeURIComponent(username).toLowerCase();
  const url = new URL(request.url);
  const limit = Number.parseInt(url.searchParams.get("limit") ?? "20", 10);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_activity", {
    target_username: slug,
    p_limit: Number.isFinite(limit) ? limit : 20,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    username: slug,
    events: (data ?? []) as ActivityEventRpcRow[],
  });
}
