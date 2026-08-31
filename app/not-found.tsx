import { Button } from "@/components/ui/Button";
import { PageContainer } from "@/components/ui/PageContainer";

export default function NotFound() {
  return (
    <PageContainer
      as="main"
      className="flex flex-col items-center justify-center gap-4 py-24 text-center"
    >
      <p className="eyebrow">404 error</p>
      <h1 className="font-display text-4xl font-semibold tracking-[-0.04em] text-white">Page not found</h1>
      <p className="max-w-md text-sm text-zinc-400">
        That route does not exist. Head back to the catalog or your collection.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button href="/browse">Browse cards</Button>
        <Button href="/" variant="secondary">
          Home
        </Button>
      </div>
    </PageContainer>
  );
}
