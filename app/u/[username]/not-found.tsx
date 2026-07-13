import { Button } from "@/components/ui/Button";
import { PageContainer } from "@/components/ui/PageContainer";

export default function PublicProfileNotFound() {
  return (
    <PageContainer
      as="main"
      className="flex flex-col items-center justify-center gap-4 py-24 text-center"
    >
      <h1 className="text-2xl font-semibold tracking-tight text-white">
        Collector not found
      </h1>
      <p className="max-w-md text-sm text-zinc-400">
        This public shelf does not exist, or the username was mistyped.
      </p>
      <Button href="/browse">Browse cards</Button>
    </PageContainer>
  );
}
