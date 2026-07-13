import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

/**
 * Authenticated write: create a trade offer on a for-trade collection entry.
 * Body: { target_collection_id: string, message?: string }
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { target_collection_id?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const targetId = body.target_collection_id?.trim();
  if (!targetId) {
    return NextResponse.json(
      { error: "target_collection_id is required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase.rpc("create_trade_offer", {
    p_target_collection_id: targetId,
    p_message: body.message?.trim() || null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ id: data as string, status: "pending" }, { status: 201 });
}
