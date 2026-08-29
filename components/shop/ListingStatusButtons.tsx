"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

type Props = { listingId: string; status: string };

export function ListingStatusButtons({ listingId, status }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function setStatus(next: "active" | "draft" | "archived") {
    setPending(true);
    const supabase = createClient();
    await supabase.from("shop_listings").update({ status: next }).eq("id", listingId);
    setPending(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "active" ? (
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => setStatus("active")}
        >
          Activate
        </Button>
      ) : null}
      {status === "active" ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => setStatus("draft")}
        >
          Unlist
        </Button>
      ) : null}
      {status !== "archived" ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => setStatus("archived")}
        >
          Archive
        </Button>
      ) : null}
    </div>
  );
}
