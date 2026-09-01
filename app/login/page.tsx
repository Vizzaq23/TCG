import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { isSupabaseConfigured } from "@/lib/env";
import { safeNextPath } from "@/lib/auth/safe-next";
import { createClient } from "@/lib/supabase/server";
import {
  firstSearchParam,
  type SearchParamValue,
} from "@/lib/search-params";

type Props = {
  searchParams: Promise<{
    next?: SearchParamValue;
    error?: SearchParamValue;
  }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const nextPath = safeNextPath(firstSearchParam(params.next));
  const error = firstSearchParam(params.error);
  const signupHref = `/signup?next=${encodeURIComponent(nextPath)}`;

  if (!isSupabaseConfigured()) {
    return (
      <main className="page-ambient mx-auto w-full max-w-md flex-1 px-4 py-16 sm:px-6">
        <p className="rounded-[14px] border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect(nextPath);
  }

  return (
    <main className="page-ambient flex flex-1 items-center justify-center px-4 py-12 sm:px-6 sm:py-20">
      <section className="surface-card w-full max-w-md rounded-[24px] p-6 sm:p-8">
      <div className="mb-8 space-y-3">
        <p className="eyebrow">Welcome back</p>
        <h1 className="font-display text-3xl font-semibold tracking-[-0.04em] text-white">Sign in to your shelf</h1>
        <p className="mt-2 text-sm text-zinc-400">
          New here?{" "}
          <Link
            href={signupHref}
            className="font-medium text-amber-400 underline-offset-4 hover:text-amber-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
          >
            Create an account
          </Link>
        </p>
      </div>
      {error && (
        <p className="mb-5 rounded-[12px] border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}
      <LoginForm nextPath={nextPath} />
      </section>
    </main>
  );
}
