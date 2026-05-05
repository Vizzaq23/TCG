import Link from "next/link";
import { SignupForm } from "@/components/auth/SignupForm";
import { isSupabaseConfigured } from "@/lib/env";

export default function SignupPage() {
  if (!isSupabaseConfigured()) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-16 sm:px-6">
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          Configure Supabase environment variables to enable sign up. See{" "}
          <code className="rounded bg-zinc-900 px-1 py-0.5">.env.local.example</code>.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 py-16 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Create account</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-amber-400 hover:text-amber-300">
            Sign in
          </Link>
        </p>
      </div>
      <SignupForm />
    </main>
  );
}
