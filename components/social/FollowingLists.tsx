import { CollectorRow, type CollectorRowData } from "@/components/social/CollectorRow";
import { SectionHeader } from "@/components/ui/SectionHeader";

type Props = {
  following: CollectorRowData[];
  followers: CollectorRowData[];
};

function CollectorList({
  items,
  empty,
}: {
  items: CollectorRowData[];
  empty: string;
}) {
  if (!items.length) {
    return (
      <p className="empty-state px-4 py-7 text-center text-sm">
        {empty}
      </p>
    );
  }

  return (
    <ul className="surface-card divide-y divide-zinc-800/80 overflow-hidden rounded-[18px]">
      {items.map((c) => (
        <CollectorRow key={c.id} collector={c} />
      ))}
    </ul>
  );
}

export function FollowingLists({ following, followers }: Props) {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section className="space-y-3">
        <SectionHeader
          title="Following"
          description={`${following.length} collector${following.length === 1 ? "" : "s"}`}
        />
        <CollectorList
          items={following}
          empty="You’re not following anyone yet. Search above to find collectors."
        />
      </section>
      <section className="space-y-3">
        <SectionHeader
          title="Followers"
          description={`${followers.length} collector${followers.length === 1 ? "" : "s"}`}
        />
        <CollectorList
          items={followers}
          empty="No followers yet. Share your public shelf link."
        />
      </section>
    </div>
  );
}
