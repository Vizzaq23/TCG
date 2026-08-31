import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

type Props = { q?: string };

export function CollectorSearchForm({ q = "" }: Props) {
  return (
    <form
      className="surface-card flex flex-col gap-4 rounded-[18px] p-5 sm:flex-row sm:items-end"
      method="get"
      action="/social"
    >
      <label className="flex min-w-[12rem] flex-1 flex-col gap-2 text-xs font-medium text-zinc-300">
        Search collectors
        <Input
          name="q"
          defaultValue={q}
          placeholder="@username or display name"
          className="placeholder:text-zinc-600"
          autoComplete="off"
        />
      </label>
      <Button type="submit" size="md">
        Search
      </Button>
    </form>
  );
}
