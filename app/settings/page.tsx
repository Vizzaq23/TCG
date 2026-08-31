import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { isProfileAccent } from "@/lib/profile";
import { ProfileSettingsForm } from "@/components/profile/ProfileSettingsForm";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/Button";

export default async function SettingsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <PageContainer as="main" className="py-10">
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          Configure Supabase environment variables to customize your profile.
        </p>
      </PageContainer>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/settings");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url, bio, accent")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return (
      <PageContainer as="main" className="py-10">
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {profileError?.message ?? "Profile not found. Try signing out and back in."}
        </p>
      </PageContainer>
    );
  }

  return (
    <PageContainer as="main" className="flex flex-col gap-10 py-10 sm:py-14">
      <div className="space-y-3">
      <p className="eyebrow">Your account</p>
      <SectionHeader
        as="h1"
        title="Account settings"
        description="Customize how your public shelf looks — photo, name, bio, and accent."
        actions={
          <>
            <Button
              href={`/u/${encodeURIComponent(profile.username)}`}
              size="md"
              variant="secondary"
            >
              View public shelf
            </Button>
            <Button href="/collection" size="md" variant="ghost">
              Back to collection
            </Button>
          </>
        }
      />
      </div>

      <ProfileSettingsForm
        profile={{
          username: profile.username,
          displayName: profile.display_name,
          avatarUrl: profile.avatar_url,
          bio: profile.bio,
          accent: isProfileAccent(profile.accent) ? profile.accent : "amber",
        }}
      />
    </PageContainer>
  );
}
