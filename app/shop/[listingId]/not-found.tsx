import { Button } from "@/components/ui/Button";
import { PageContainer } from "@/components/ui/PageContainer";

export default function ListingNotFound() {
  return (
    <PageContainer as="main" className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <h1 className="text-2xl font-semibold text-white">Listing unavailable</h1>
      <p className="max-w-md text-sm text-zinc-400">This listing may no longer be available, or the link may be incorrect.</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button href="/shop">Browse available listings</Button>
        <Button href="/cart" variant="secondary">View cart</Button>
      </div>
    </PageContainer>
  );
}
