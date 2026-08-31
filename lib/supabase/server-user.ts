import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/supabase/verified-user";

/** Deduplicate verified identity checks across one Server Component render. */
export const getVerifiedServerUser = cache(async () => {
  const supabase = await createClient();
  return getVerifiedUser(supabase);
});
