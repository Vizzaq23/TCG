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
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
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
  const router = useRouter();
  const [username, setUsername] = useState(profile.username);
  const [displayName, setDisplayName] = useState(profile.displayName ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [accent, setAccent] = useState<ProfileAccentId>(
    isProfileAccent(profile.accent) ? profile.accent : "amber",
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const accentMeta = getProfileAccent(accent);
  const previewName = displayName.trim() || username;
  const previewSrc = removeAvatar
    ? null
    : localPreview || avatarUrl || profile.avatarUrl;

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const dirty =
    normalizeUsername(username) !== profile.username ||
    (normalizeDisplayName(displayName) ?? null) !== (profile.displayName ?? null) ||
    (normalizeBio(bio) ?? null) !== (profile.bio ?? null) ||
    accent !== profile.accent ||
    avatarFile !== null ||
    removeAvatar;

  function handleAvatarFile(file: File) {
    setError(null);
    setSuccess(null);
    setRemoveAvatar(false);
    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalPreview(URL.createObjectURL(file));
    setAvatarFile(file);
  }

  function handleAvatarClear() {
    setError(null);
    setSuccess(null);
    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalPreview(null);
    setAvatarFile(null);
    setRemoveAvatar(true);
    setAvatarUrl(null);
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

    let nextAvatarUrl: string | null = removeAvatar
      ? null
      : avatarUrl ?? profile.avatarUrl;

    if (avatarFile) {
      const path = `${user.id}/avatar`;
      // Clear prior extension variants so only one object remains.
      await supabase.storage.from("avatars").remove([
        `${user.id}/avatar`,
        `${user.id}/avatar.jpg`,
        `${user.id}/avatar.jpeg`,
        `${user.id}/avatar.png`,
        `${user.id}/avatar.webp`,
        `${user.id}/avatar.gif`,
      ]);
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, {
          upsert: true,
          contentType: avatarFile.type,
          cacheControl: "3600",
        });
      if (uploadError) {
        setPending(false);
        setError(uploadError.message);
        return;
      }
      const { data: publicData } = supabase.storage.from("avatars").getPublicUrl(path);
      // Bust CDN/browser cache after replace
      nextAvatarUrl = `${publicData.publicUrl}?v=${Date.now()}`;
    }

    const { error: upError } = await supabase
      .from("profiles")
      .update({
        username: normalizedUser,
        display_name: normalizeDisplayName(displayName),
        avatar_url: nextAvatarUrl,
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
    setAvatarUrl(nextAvatarUrl);
    setAvatarFile(null);
    setRemoveAvatar(false);
    if (localPreview) {
      URL.revokeObjectURL(localPreview);
      setLocalPreview(null);
    }
    setSuccess("Profile saved.");
    router.refresh();
  }

  return (
    <details className="group rounded-[14px] border border-zinc-800/80 bg-zinc-950/40 open:bg-zinc-900/30">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-zinc-400 transition hover:text-zinc-200 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-3">
            <ProfileAvatar
              src={profile.avatarUrl}
              name={previewName}
              size="sm"
              accentColor={getProfileAccent(profile.accent).swatch}
            />
            <span>
              Profile customization
              <span className="ml-2 font-normal text-zinc-600">@{profile.username}</span>
            </span>
          </span>
          <span className="text-xs text-zinc-600 group-open:hidden">Edit</span>
          <span className="hidden text-xs text-zinc-600 group-open:inline">Close</span>
        </span>
      </summary>

      <form
        onSubmit={onSubmit}
        className="space-y-5 border-t border-zinc-800/80 px-4 py-5"
      >
        <div className="space-y-2">
          <p className="text-sm text-zinc-400">Profile photo</p>
          <AvatarDropzone
            previewSrc={previewSrc}
            name={previewName}
            accentColor={accentMeta.swatch}
            disabled={pending}
            onFile={handleAvatarFile}
            onClear={handleAvatarClear}
            onError={(message) => {
              setSuccess(null);
              setError(message);
            }}
          />
        </div>

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
            className="rounded-[12px] border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none transition focus-visible:border-amber-500/60 focus-visible:ring-2 focus-visible:ring-amber-500/25"
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
          disabled={pending || !dirty}
        >
          {pending ? "Saving…" : "Save profile"}
        </Button>
      </form>
    </details>
  );
}
