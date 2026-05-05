import Link from "next/link";

export default function PublicProfileNotFound() {
  return (
    <main className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold text-white">Collector not found</h1>
      <p className="text-sm text-zinc-400">
        This public shelf does not exist, or the username was mistyped.
      </p>
      <Link
        href="/browse"
        className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
      >
        Browse cards
      </Link>
    </main>
  );
}
