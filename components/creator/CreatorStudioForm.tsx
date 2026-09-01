"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  CREATOR_EFFECTS,
  isCreatorEffect,
  normalizeCreatorMessage,
  normalizeCreatorTitle,
  type CreativeProfileFeatures,
  type CreatorEffectId,
} from "@/lib/creator";
import { CreativeProfileSpotlight } from "@/components/profile/CreativeProfileSpotlight";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { cn } from "@/lib/cn";

type Props = {
  features: CreativeProfileFeatures;
};

export function CreatorStudioForm({ features }: Props) {
  const router = useRouter();
  const initialEffect = isCreatorEffect(features.profile_effect)
    ? features.profile_effect
    : "aurora";
  const [title, setTitle] = useState(features.spotlight_title);
  const [message, setMessage] = useState(features.spotlight_message);
  const [effect, setEffect] = useState<CreatorEffectId>(initialEffect);
  const [saved, setSaved] = useState({
    title: features.spotlight_title,
    message: features.spotlight_message,
    effect: initialEffect,
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const normalizedTitle = normalizeCreatorTitle(title);
  const normalizedMessage = normalizeCreatorMessage(message);
  const dirty =
    normalizedTitle !== saved.title ||
    normalizedMessage !== saved.message ||
    effect !== saved.effect;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (normalizedTitle.length < 3) {
      setError("Dispatch title must be at least 3 characters.");
      return;
    }
    if (!normalizedMessage) {
      setError("Add a message before publishing your dispatch.");
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.rpc("update_creator_profile", {
      p_spotlight_title: normalizedTitle,
      p_spotlight_message: normalizedMessage,
      p_profile_effect: effect,
    });
    setPending(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setTitle(normalizedTitle);
    setMessage(normalizedMessage);
    setSaved({ title: normalizedTitle, message: normalizedMessage, effect });
    setSuccess("Creative dispatch is live.");
    router.refresh();
  }

  const preview: CreativeProfileFeatures = {
    ...features,
    spotlight_title: normalizedTitle || "Your dispatch title",
    spotlight_message: normalizedMessage || "Your message will appear here.",
    profile_effect: effect,
  };

  return (
    <section className="space-y-5" aria-labelledby="dispatch-controls-title">
      <div>
        <p className="eyebrow">Exclusive profile control</p>
        <h2
          id="dispatch-controls-title"
          className="font-display mt-2 text-2xl font-semibold tracking-[-0.03em] text-white"
        >
          Creative dispatch
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Write a public note and choose the profile signal visitors see first.
        </p>
      </div>

      <CreativeProfileSpotlight features={preview} />

      <form onSubmit={onSubmit} className="surface-card space-y-6 rounded-[22px] p-5 sm:p-7">
        <Field label="Dispatch title" hint={`${title.length}/48 characters`}>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={48}
            placeholder="From the Captain's Desk"
          />
        </Field>

        <Field label="Public message" hint={`${message.length}/240 characters`}>
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={240}
            rows={4}
            className="min-h-28"
            placeholder="What are you collecting, creating, or chasing next?"
          />
        </Field>

        <fieldset>
          <legend className="text-xs font-medium tracking-wide text-zinc-300">
            Profile signal
          </legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            {CREATOR_EFFECTS.map((option) => {
              const selected = effect === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setEffect(option.id)}
                  className={cn(
                    "rounded-[16px] border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40",
                    selected
                      ? "border-amber-400/55 bg-amber-500/10"
                      : "border-zinc-800 bg-zinc-950/45 hover:border-zinc-600",
                  )}
                >
                  <span className="text-sm font-semibold text-zinc-100">{option.label}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-zinc-500">
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {error ? (
          <p role="alert" className="text-sm text-red-300">{error}</p>
        ) : success ? (
          <p role="status" className="text-sm text-emerald-300">{success}</p>
        ) : null}

        <Button type="submit" loading={pending} disabled={pending || !dirty}>
          {pending ? "Publishing…" : "Publish dispatch"}
        </Button>
      </form>
    </section>
  );
}
