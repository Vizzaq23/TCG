type Props = {
  fetchedAt: string | null | undefined;
  className?: string;
};

export function PriceLastUpdated({ fetchedAt, className }: Props) {
  if (!fetchedAt) {
    return (
      <p className={className ?? "text-[10px] text-zinc-600"}>Market not synced yet</p>
    );
  }
  const d = new Date(fetchedAt);
  if (!Number.isFinite(d.getTime())) {
    return <p className={className ?? "text-[10px] text-zinc-600"}>Updated unknown</p>;
  }
  return (
    <p className={className ?? "text-[10px] text-zinc-500"}>
      Updated{" "}
      {d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })}
    </p>
  );
}
