"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isValidUsername, normalizeUsername } from "@/lib/validators/username";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

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
    <details className="group rounded-[14px] border border-zinc-800/80 bg-zinc-950/40 open:bg-zinc-900/30">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-zinc-400 transition hover:text-zinc-200 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-3">
          <span>
            Profile settings
            <span className="ml-2 font-normal text-zinc-600">@{currentUsername}</span>
          </span>
          <span className="text-xs text-zinc-600 group-open:hidden">Edit</span>
          <span className="hidden text-xs text-zinc-600 group-open:inline">Close</span>
        </span>
      </summary>
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-3 border-t border-zinc-800/80 px-4 py-4 sm:flex-row sm:items-end"
      >
        <Field
          label="Public username"
          hint={`Your share link: /u/${value || "…"}`}
          error={error}
          className="min-w-0 flex-1"
        >
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoComplete="username"
          />
        </Field>
        <Button
          type="submit"
          variant="secondary"
          loading={pending}
          disabled={pending || value === currentUsername}
        >
          {pending ? "Saving…" : "Save username"}
        </Button>
      </form>
    </details>
  );
}
