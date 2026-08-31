import { createClient } from "@/lib/supabase/server";
import { getShopOwnerUserId } from "@/lib/shop/config";

export async function ensureShopSettings(ownerUserId: string) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("shop_settings")
    .select(
      "id, owner_user_id, store_name, support_email, shipping_cents, currency, is_live, launch_ready_at, created_at, updated_at",
    )
    .eq("owner_user_id", ownerUserId)
    .maybeSingle();
  if (existing) return existing;

  const { data, error } = await supabase
    .from("shop_settings")
    .insert({
      owner_user_id: ownerUserId,
      store_name: "One Piece TCG Shop",
      shipping_cents: null,
      is_live: false,
    })
    .select(
      "id, owner_user_id, store_name, support_email, shipping_cents, currency, is_live, launch_ready_at, created_at, updated_at",
    )
    .single();

  if (error) throw error;
  return data;
}

export async function getPublicShopSettings() {
  const supabase = await createClient();
  const ownerId = getShopOwnerUserId();
  let q = supabase
    .from("shop_settings")
    .select("store_name, support_email, shipping_cents, currency, is_live, launch_ready_at")
    .eq("is_live", true)
    .not("launch_ready_at", "is", null);
  if (ownerId) q = q.eq("owner_user_id", ownerId);
  const { data } = await q.maybeSingle();
  return data;
}
