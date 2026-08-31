import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

export type VerifiedUser = {
  id: string;
  email?: string;
};

/**
 * Verify the session JWT without requiring an Auth API request for signed-out
 * visitors. Supabase verifies asymmetric tokens locally (using cached JWKS)
 * and falls back to the Auth service for legacy symmetric tokens.
 */
export async function getVerifiedUser(
  supabase: SupabaseClient<Database>,
): Promise<VerifiedUser | null> {
  try {
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims.sub) return null;
    return {
      id: data.claims.sub,
      ...(typeof data.claims.email === "string"
        ? { email: data.claims.email }
        : {}),
    };
  } catch {
    return null;
  }
}
