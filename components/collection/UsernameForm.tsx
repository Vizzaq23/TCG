"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isValidUsername, normalizeUsername } from "@/lib/validators/username";

type Props = { currentUsername: string };

export function UsernameForm({ currentUsername }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(currentUsername);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const normalized = normalizeUsername(value);
    if (!isValidUsername(normalized)) {
      setError("Use 3–24 characters: lowercase letters, numbers, underscores.");
      return;
    }
    setPending(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setPending(false);
      setError("You are not signed in.");
      return;
    }
    const { error: upError } = await supabase
      .from("profiles")
      .update({ username: normalized })
      .eq("id", user.id);
    setPending(false);
    if (upError) {
      setError(
        upError.code === "23505"
          ? "That username is taken."
          : upError.message,
      );
      return;
    }
    setValue(normalized);
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 sm:flex-row sm:items-end"
    >
      <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-zinc-400">
        Public username
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-amber-500/60"
          autoComplete="username"
        />
        <span className="text-[11px] text-zinc-500">
          Your share link: /u/{value || "…"}
        </span>
      </label>
      <button
        type="submit"
        disabled={pending || value === currentUsername}
        className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-white disabled:opacity-40"
      >
        {pending ? "Saving…" : "Save username"}
      </button>
      {error && (
        <p className="text-sm text-red-300 sm:col-span-2 sm:w-full">{error}</p>
      )}
    </form>
  );
}
