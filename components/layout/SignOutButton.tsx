"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

export function SignOutButton() {
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    // Full navigation avoids header flash from router.push + refresh race.
    window.location.assign("/");
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={signOut}
      loading={pending}
      disabled={pending}
      className="text-zinc-400"
    >
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
