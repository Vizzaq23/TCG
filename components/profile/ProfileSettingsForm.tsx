"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isValidUsername, normalizeUsername } from "@/lib/validators/username";
import {
  PROFILE_ACCENTS,
  getProfileAccent,
  isProfileAccent,
  normalizeBio,
  normalizeDisplayName,
  type ProfileAccentId,
} from "@/lib/profile";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { AvatarDropzone } from "@/components/profile/AvatarDropzone";
import { cn } from "@/lib/cn";

export type ProfileSettingsValues = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  accent: ProfileAccentId;
};

type Props = {
  profile: ProfileSettingsValues;
};

export function ProfileSettingsForm({ profile }: Props) {
  // Remount when server profile changes after save/refresh so local state stays in sync.
  const syncKey = [
    profile.username,
    profile.displayName ?? "",
    profile.avatarUrl ?? "",
    profile.bio ?? "",
    profile.accent,
  ].join("|");

  return <ProfileSettingsFormInner key={syncKey} profile={profile} />;
}

function ProfileSettingsFormInner({ profile }: Props) {
  const router = useRouter();
  const [username, setUsername] = useState(profile.username);
  const [displayName, setDisplayName] = useState(profile.displayName ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [accent, setAccent] = useState<ProfileAccentId>(
    isProfileAccent(profile.accent) ? profile.accent : "amber",
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const accentMeta = getProfileAccent(accent);
  const previewName = displayName.trim() || username;
  const previewSrc = localPreview || avatarUrl;

  const dirty =
    normalizeUsername(username) !== profile.username ||
    (normalizeDisplayName(displayName) ?? null) !== (profile.displayName ?? null) ||
    (normalizeBio(bio) ?? null) !== (profile.bio ?? null) ||
    accent !== profile.accent;

  async function uploadAvatar(file: File) {
    setError(null);
    setSuccess(null);
    if (localPreview) URL.revokeObjectURL(localPreview);
    const preview = URL.createObjectURL(file);
    setLocalPreview(preview);
    setUploading(true);

    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/avatar", { method: "POST", body });
      const data = (await res.json()) as { avatarUrl?: string; error?: string };
      if (!res.ok || !data.avatarUrl) {
        throw new Error(data.error || "Upload failed.");
      }
      setAvatarUrl(data.avatarUrl);
      URL.revokeObjectURL(preview);
      setLocalPreview(null);
      setSuccess("Profile photo updated.");
      router.refresh();
    } catch (err) {
      URL.revokeObjectURL(preview);
      setLocalPreview(null);
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function clearAvatar() {
    setError(null);
    setSuccess(null);
    setUploading(true);
    try {
      const res = await fetch("/api/avatar", { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Could not remove photo.");
      }
      if (localPreview) URL.revokeObjectURL(localPreview);
      setLocalPreview(null);
      setAvatarUrl(null);
      setSuccess("Profile photo removed.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove photo.");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const normalizedUser = normalizeUsername(username);
    if (!isValidUsername(normalizedUser)) {
      setError("Username: use 3–24 characters — lowercase letters, numbers, underscores.");
      return;
    }

    if (bio.trim().length > 280) {
      setError("Bio must be 280 characters or fewer.");
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
      .update({
        username: normalizedUser,
        display_name: normalizeDisplayName(displayName),
        bio: normalizeBio(bio),
        accent,
      })
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

    setUsername(normalizedUser);
    setSuccess("Profile saved.");
    router.refresh();
  }

  return (
    <div className="surface-card space-y-8 rounded-[22px] p-5 sm:p-7">
      <div className="space-y-2">
        <p className="font-display text-lg font-semibold text-zinc-100">Profile photo</p>
        <AvatarDropzone
          previewSrc={previewSrc}
          name={previewName}
          accentColor={accentMeta.swatch}
          disabled={pending}
          uploading={uploading}
          onFile={uploadAvatar}
          onClear={clearAvatar}
          onError={(message) => {
            setSuccess(null);
            setError(message);
          }}
        />
        <p className="text-[11px] text-zinc-600">
          Photos upload immediately and appear in the header and public shelf.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Public username"
            hint={`Share link: /u/${username || "…"}`}
            className="text-sm"
          >
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </Field>
          <Field
            label="Display name"
            hint="Shown on your public shelf (optional)"
            className="text-sm"
          >
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={40}
              placeholder="e.g. East Blue Captain"
            />
          </Field>
        </div>

        <Field
          label="Bio"
          hint={`${bio.length}/280 — appears on your public profile`}
          className="text-sm"
        >
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={280}
            rows={3}
            placeholder="What you collect, trade for, or hunt…"
            className="min-h-28 rounded-[12px] border border-zinc-700 bg-zinc-950/80 px-3.5 py-3 text-sm text-white outline-none transition focus-visible:border-amber-500/60 focus-visible:ring-2 focus-visible:ring-amber-500/25"
          />
        </Field>

        <fieldset>
          <legend className="mb-2 text-sm text-zinc-400">Shelf accent</legend>
          <div className="flex flex-wrap gap-2">
            {PROFILE_ACCENTS.map((option) => {
              const selected = accent === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setAccent(option.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40",
                    selected
                      ? "border-transparent text-zinc-950"
                      : "border-zinc-700 text-zinc-300 hover:border-zinc-500",
                  )}
                  style={selected ? { backgroundColor: option.swatch } : undefined}
                  aria-pressed={selected}
                >
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 rounded-full ring-1 ring-black/20"
                    style={{ backgroundColor: option.swatch }}
                  />
                  {option.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        {error ? (
          <p className="text-sm text-red-300">{error}</p>
        ) : success ? (
          <p className="text-sm text-emerald-300">{success}</p>
        ) : null}

        <Button
          type="submit"
          variant="secondary"
          loading={pending}
          disabled={pending || uploading || !dirty}
        >
          {pending ? "Saving…" : "Save profile details"}
        </Button>
      </form>
    </div>
  );
}
