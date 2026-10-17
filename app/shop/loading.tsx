import { PageContainer } from "@/components/ui/PageContainer";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <PageContainer as="main" className="space-y-6 py-8 sm:py-10">
      <p role="status" className="text-sm text-zinc-400">Loading shop…</p>
      <Skeleton className="h-48 w-full" rounded="lg" />
    </PageContainer>
  );
}
