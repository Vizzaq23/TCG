"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

type Props = { listingId: string; status: string };

export function ListingStatusButtons({ listingId, status }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(next: "active" | "draft" | "archived") {
    setPending(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.from("shop_listings").update({ status: next }).eq("id", listingId);
      if (updateError) {
        setError(/insufficient_collection_stock|listing_collection/.test(updateError.message)
          ? "There are not enough unallocated copies on your shelf. Review this collection before activating."
          : /listing_has_pending_checkout/.test(updateError.message)
            ? "This listing has a pending checkout. Wait for it to finish before archiving."
            : "The listing could not be updated. Please retry.");
        return;
      }
      router.refresh();
    } catch {
      setError("The listing could not be updated. Please retry.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {error ? <p role="alert" className="w-full text-sm text-red-300">{error}</p> : null}
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
