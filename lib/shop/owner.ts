import { createClient } from "@/lib/supabase/server";
import { getShopOwnerUserId, isShopOwner } from "@/lib/shop/config";

export async function requireShopOwner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isShopOwner(user.id)) {
    return { supabase, user: null as null, isOwner: false as const };
  }
  return { supabase, user, isOwner: true as const };
}

export async function ensureShopSettings(ownerUserId: string) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("shop_settings")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .maybeSingle();
  if (existing) return existing;

  const { data, error } = await supabase
    .from("shop_settings")
    .insert({
      owner_user_id: ownerUserId,
      store_name: "One Piece TCG Shop",
      shipping_cents: 500,
      is_live: true,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function getPublicShopSettings() {
  const supabase = await createClient();
  const ownerId = getShopOwnerUserId();
  let q = supabase.from("shop_settings").select("*").eq("is_live", true);
  if (ownerId) q = q.eq("owner_user_id", ownerId);
  const { data } = await q.maybeSingle();
  return data;
}
