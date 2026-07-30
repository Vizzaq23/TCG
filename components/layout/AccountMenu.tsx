"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { cn } from "@/lib/cn";

type Props = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  accentColor: string;
};

export function AccountMenu({
  username,
  displayName,
  avatarUrl,
  accentColor,
}: Props) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const label = displayName || username;

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function signOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.assign("/");
  }

  const itemClass =
    "flex w-full items-center rounded-[10px] px-3 py-2 text-left text-sm text-zinc-300 transition hover:bg-zinc-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40";

  return (
    <div ref={rootRef} className="relative ml-1 sm:ml-2">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex max-w-[11rem] items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 py-1 pl-1 pr-2.5 transition",
          "hover:border-amber-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40",
          open && "border-amber-500/40",
        )}
        title={`Account · @${username}`}
      >
        <ProfileAvatar
          src={avatarUrl}
          name={label}
          size="sm"
          accentColor={accentColor}
        />
        <span className="hidden truncate text-xs text-zinc-300 sm:inline">
          @{username}
        </span>
        <span
          aria-hidden
          className={cn(
            "hidden text-[10px] text-zinc-500 transition sm:inline",
            open && "rotate-180",
          )}
        >
          ▾
        </span>
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-[14px] border border-zinc-800 bg-zinc-950 py-1.5 shadow-2xl shadow-black/50"
        >
          <div className="border-b border-zinc-800 px-3 py-2.5">
            <p className="truncate text-sm font-medium text-white">{label}</p>
            <p className="truncate text-xs text-zinc-500">@{username}</p>
          </div>

          <div className="p-1.5">
            <Link
              role="menuitem"
              href={`/u/${encodeURIComponent(username)}`}
              className={itemClass}
              onClick={() => setOpen(false)}
            >
              View public shelf
            </Link>
            <Link
              role="menuitem"
              href="/settings"
              className={itemClass}
              onClick={() => setOpen(false)}
            >
              Customize profile
            </Link>
            <Link
              role="menuitem"
              href="/collection"
              className={itemClass}
              onClick={() => setOpen(false)}
            >
              My collection
            </Link>
            <Link
              role="menuitem"
              href="/social"
              className={itemClass}
              onClick={() => setOpen(false)}
            >
              Social
            </Link>
          </div>

          <div className="border-t border-zinc-800 p-1.5">
            <button
              type="button"
              role="menuitem"
              disabled={signingOut}
              onClick={signOut}
              className={cn(itemClass, "text-zinc-400 disabled:opacity-50")}
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
