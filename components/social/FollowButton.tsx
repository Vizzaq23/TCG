"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

type Props = {
  username: string;
  initiallyFollowing: boolean;
  size?: "sm" | "md";
};

export function FollowButton({
  username,
  initiallyFollowing,
  size = "sm",
}: Props) {
  const router = useRouter();
  const [following, setFollowing] = useState(initiallyFollowing);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setError(null);
    setPending(true);
    const supabase = createClient();
    const rpc = following ? "unfollow_user" : "follow_user";
    const { error: rpcError } = await supabase.rpc(rpc, {
      target_username: username,
    });
    setPending(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setFollowing(!following);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size={size}
        variant={following ? "secondary" : "primary"}
        loading={pending}
        onClick={toggle}
      >
        {following ? "Following" : "Follow"}
      </Button>
      {error ? <p className="text-[11px] text-red-300">{error}</p> : null}
    </div>
  );
}
