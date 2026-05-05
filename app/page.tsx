import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-4 py-16 sm:px-6">
      <div className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-widest text-amber-500">
          Collector-first MVP
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Your One Piece card shelf, online.
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-zinc-400">
          Browse the catalog, log what you own with quantity and condition, then
          share a clean public link so friends and traders can see your
          collection.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/browse"
          className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400"
        >
          Browse cards
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
