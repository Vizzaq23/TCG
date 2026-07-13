"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isValidUsername, normalizeUsername } from "@/lib/validators/username";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { safeNextPath } from "@/lib/auth/safe-next";

type Props = { nextPath?: string };

export function SignupForm({ nextPath = "/collection" }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const normalized = normalizeUsername(username);
    if (username.trim() && !isValidUsername(normalized)) {
      setError(
        "Username must be 3–24 characters: lowercase letters, numbers, and underscores only.",
      );
      return;
    }

    const destination = safeNextPath(nextPath);
    setPending(true);
    const supabase = createClient();
    const { data, error: signError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`,
      },
    });
    if (signError) {
      setPending(false);
      setError(signError.message);
      return;
    }

    const uid = data.user?.id;
    if (uid && normalized && data.session) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ username: normalized })
        .eq("id", uid);
      if (profileError) {
        setPending(false);
        setError(
          profileError.code === "23505"
            ? "That username is already taken. Pick another or leave blank for a generated name."
            : profileError.message,
        );
        return;
      }
    }

    setPending(false);

    if (data.session) {
      window.location.assign(destination);
      return;
    }

    setInfo(
      "Check your email to confirm your account, then sign in. After your first login, set your public username on the collection page.",
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error && (
        <p className="rounded-[12px] border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}
      {info && (
        <p className="rounded-[12px] border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
          {info}
        </p>
      )}
      <Field
        label="Public username (optional)"
        hint="Used in your public link: /u/yourname"
      >
        <Input
          type="text"
          autoComplete="username"
          placeholder="e.g. east_blue_collector"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </Field>
      <Field label="Email">
        <Input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <Field label="Password">
        <Input
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <Button type="submit" loading={pending} disabled={pending} className="mt-1 w-full" size="lg">
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
