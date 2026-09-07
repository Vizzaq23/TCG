import { catalogResolveSearchPath, resolveCatalogPath } from "@/lib/catalog-resolve";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const input = { number: params.get("number"), product: params.get("product") };
  let path = catalogResolveSearchPath(input.number);

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      path = await resolveCatalogPath(input, {
        async byProduct(productId) {
          const { data, error } = await supabase.from("cards")
            .select("id, card_number, tcgplayer_product_id")
            .eq("tcgplayer_product_id", productId)
            .order("id", { ascending: true });
          if (error) throw error;
          return data ?? [];
        },
        async byNumber(cardNumber) {
          const { data, error } = await supabase.from("cards")
            .select("id, card_number, tcgplayer_product_id")
            .eq("card_number", cardNumber)
            .order("id", { ascending: true });
          if (error) throw error;
          return data ?? [];
        },
      });
    } catch {
      // Missing credentials, session setup, or query failures fall back to search.
    }
  }

  // Relative, constructed destinations cannot redirect to a caller-supplied host.
  return new Response(null, { status: 307, headers: { Location: path, "Cache-Control": "no-store" } });
}
