import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { PublicShowcaseRow } from "@/lib/types/database";

type Ctx = { params: Promise<{ username: string }> };

export async function GET(_request: Request, context: Ctx) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const { username } = await context.params;
  const slug = decodeURIComponent(username).toLowerCase();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_public_showcase", {
    target_username: slug,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    username: slug,
    showcase: (data ?? []) as PublicShowcaseRow[],
  });
}
