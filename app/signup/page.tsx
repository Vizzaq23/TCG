import Link from "next/link";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/SignupForm";
import { isSupabaseConfigured } from "@/lib/env";
import { safeNextPath } from "@/lib/auth/safe-next";
import { createClient } from "@/lib/supabase/server";

type Props = { searchParams: Promise<{ next?: string }> };

export default async function SignupPage({ searchParams }: Props) {
  const params = await searchParams;
  const nextPath = safeNextPath(params.next);
  const loginHref = `/login?next=${encodeURIComponent(nextPath)}`;

  if (!isSupabaseConfigured()) {
    return (
      <main className="page-ambient mx-auto w-full max-w-md flex-1 px-4 py-16 sm:px-6">
        <p className="rounded-[14px] border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          Configure Supabase environment variables to enable sign up. See{" "}
          <code className="rounded bg-zinc-900 px-1 py-0.5">.env.local.example</code>.
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
    <main className="page-ambient mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 py-16 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Create account</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Already have an account?{" "}
          <Link
            href={loginHref}
            className="font-medium text-amber-400 underline-offset-4 hover:text-amber-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
          >
            Sign in
          </Link>
        </p>
      </div>
      <SignupForm nextPath={nextPath} />
    </main>
  );
}
