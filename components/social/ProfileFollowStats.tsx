"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  CollectorRow,
  type CollectorRowData,
} from "@/components/social/CollectorRow";
import { cn } from "@/lib/cn";

type ListKind = "followers" | "following";

type Props = {
  username: string;
  followerCount: number;
  followingCount: number;
  isSignedIn: boolean;
  initialList?: ListKind | null;
};

type ListState = {
  kind: ListKind;
  rows: CollectorRowData[];
  error: string | null;
  pending: boolean;
};

function pendingList(kind: ListKind): ListState {
  return { kind, rows: [], error: null, pending: true };
}

export function ProfileFollowStats({
  username,
  followerCount,
  followingCount,
  isSignedIn,
  initialList = null,
}: Props) {
  const dialogId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState<ListKind | null>(initialList);
  const [list, setList] = useState<ListState | null>(() =>
    initialList && isSignedIn ? pendingList(initialList) : null,
  );

  function openList(kind: ListKind) {
    setOpen(kind);
    setList(isSignedIn ? pendingList(kind) : null);
  }

  useEffect(() => {
    if (!open || !isSignedIn) return;

    let cancelled = false;

    void (async () => {
      const supabase = createClient();
      const rpc =
        open === "followers" ? "get_profile_followers" : "get_profile_following";
      const { data, error: rpcError } = await supabase.rpc(rpc, {
        target_username: username,
        p_limit: 40,
        p_offset: 0,
      });
      if (cancelled) return;
      if (rpcError) {
        setList({
          kind: open,
          rows: [],
          error: rpcError.message,
          pending: false,
        });
        return;
      }
      setList({
        kind: open,
        rows: (data ?? []) as CollectorRowData[],
        error: null,
        pending: false,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [open, username, isSignedIn]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const title = open === "followers" ? "Followers" : "Following";
  const activeList = list && open && list.kind === open ? list : null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-400">
        <button
          type="button"
          onClick={() => openList("followers")}
          className="rounded-md transition hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
        >
          <span className="font-semibold text-zinc-200">{followerCount}</span>{" "}
          follower{followerCount === 1 ? "" : "s"}
        </button>
        <span aria-hidden className="text-zinc-700">
          ·
        </span>
        <button
          type="button"
          onClick={() => openList("following")}
          className="rounded-md transition hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
        >
          <span className="font-semibold text-zinc-200">{followingCount}</span>{" "}
          following
        </button>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogId}
            className="flex max-h-[min(32rem,80vh)] w-full max-w-md flex-col overflow-hidden rounded-[16px] border border-zinc-800 bg-zinc-950 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
              <h2 id={dialogId} className="text-sm font-semibold text-white">
                {title}
              </h2>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(null)}
                className="rounded-md px-2 py-1 text-xs text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
              >
                Close
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {!isSignedIn ? (
                <div className="space-y-3 px-4 py-8 text-center">
                  <p className="text-sm text-zinc-400">
                    Sign in to browse {title.toLowerCase()}.
                  </p>
                  <Link
                    href={`/login?next=${encodeURIComponent(`/u/${username}?social=${open}`)}`}
                    className={cn(
                      "inline-flex rounded-[14px] bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950",
                      "transition hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50",
                    )}
                  >
                    Sign in
                  </Link>
                </div>
              ) : !activeList || activeList.pending ? (
                <p className="px-4 py-8 text-center text-sm text-zinc-500">
                  Loading…
                </p>
              ) : activeList.error ? (
                <p className="px-4 py-8 text-center text-sm text-red-300">
                  {activeList.error}
                </p>
              ) : !activeList.rows.length ? (
                <p className="px-4 py-8 text-center text-sm text-zinc-500">
                  {open === "followers"
                    ? "No followers yet."
                    : "Not following anyone yet."}
                </p>
              ) : (
                <ul className="divide-y divide-zinc-800/80">
                  {activeList.rows.map((collector) => (
                    <CollectorRow key={collector.id} collector={collector} />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
