import { Button } from "@/components/ui/Button";
import { PageContainer } from "@/components/ui/PageContainer";

export default function PublicProfileNotFound() {
  return (
    <PageContainer
      as="main"
      className="flex flex-col items-center justify-center gap-4 py-24 text-center"
    >
      <p className="eyebrow">Public shelf</p>
      <h1 className="font-display text-4xl font-semibold tracking-[-0.04em] text-white">
        Collector not found
      </h1>
      <p className="max-w-md text-sm text-zinc-400">
        This public shelf does not exist, or the username was mistyped.
      </p>
      <Button href="/browse">Browse cards</Button>
    </PageContainer>
  );
}
