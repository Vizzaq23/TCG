import Link from "next/link";
import {
  creatorEffectClass,
  type CreativeProfileFeatures,
} from "@/lib/creator";
import { cn } from "@/lib/cn";

type Props = {
  features: CreativeProfileFeatures;
  isOwner?: boolean;
};

export function CreativeBadge({ label }: { label: string }) {
  return (
    <span className="creator-badge" title="Verified account entitlement">
      <span aria-hidden>✦</span>
      {label}
    </span>
  );
}

export function CreativeProfileSpotlight({ features, isOwner = false }: Props) {
  return (
    <section
      className={cn(
        "creator-spotlight",
        creatorEffectClass(features.profile_effect),
      )}
      aria-labelledby="creator-spotlight-title"
    >
      <div className="creator-spotlight__wash" aria-hidden />
      <div className="relative z-[1] flex flex-col gap-5 p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CreativeBadge label={features.badge_label} />
          <p className="creator-signal" aria-label="Creative account feature active">
            <span aria-hidden /> Creator signal live
          </p>
        </div>
        <div className="max-w-3xl space-y-2">
          <p className="creator-kicker">A dispatch from the New World</p>
          <h2
            id="creator-spotlight-title"
            className="font-display text-2xl font-semibold tracking-[-0.035em] text-white sm:text-3xl"
          >
            {features.spotlight_title}
          </h2>
          <p className="text-sm leading-7 text-zinc-200 sm:text-base">
            {features.spotlight_message}
          </p>
        </div>
        {isOwner ? (
          <Link href="/creator-studio" className="creator-studio-link">
            Open Creator Studio <span aria-hidden>→</span>
          </Link>
        ) : null}
      </div>
    </section>
  );
}
