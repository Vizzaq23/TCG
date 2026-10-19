import { PageContainer } from "@/components/ui/PageContainer";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <PageContainer as="main" className="space-y-8 py-8 sm:py-10">
      <p role="status" className="text-sm text-zinc-400">Loading cart…</p>
      <div className="grid gap-8 lg:grid-cols-[1fr_minmax(0,320px)]">
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" rounded="lg" />
          <Skeleton className="h-32 w-full" rounded="lg" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" rounded="lg" />
          <Skeleton className="h-12 w-full" rounded="lg" />
          <Skeleton className="h-10 w-full" rounded="lg" />
        </div>
      </div>
    </PageContainer>
  );
}
