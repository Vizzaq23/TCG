import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";
import { isSupabaseConfigured } from "@/lib/env";

type Props = { searchParams: Promise<{ next?: string; error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;

  if (!isSupabaseConfigured()) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-16 sm:px-6">
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          Add{" "}
          <code className="rounded bg-zinc-900 px-1 py-0.5">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
          and{" "}
          <code className="rounded bg-zinc-900 px-1 py-0.5">
            NEXT_PUBLIC_SUPABASE_ANON_KEY
          </code>{" "}
          to <code className="rounded bg-zinc-900 px-1 py-0.5">.env.local</code>{" "}
          (see <code className="rounded bg-zinc-900 px-1 py-0.5">.env.local.example</code>
          ).
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 py-16 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Sign in</h1>
        <p className="mt-2 text-sm text-zinc-400">
          New here?{" "}
          <Link href="/signup" className="font-medium text-amber-400 hover:text-amber-300">
            Create an account
          </Link>
        </p>
      </div>
      {params.error && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {params.error}
        </p>
      )}
      <LoginForm nextPath={params.next ?? "/collection"} />
    </main>
  );
}
