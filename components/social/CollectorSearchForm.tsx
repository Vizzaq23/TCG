import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

type Props = { q?: string };

export function CollectorSearchForm({ q = "" }: Props) {
  return (
    <form
      className="flex flex-col gap-3 rounded-[14px] border border-zinc-800/80 bg-zinc-900/30 p-4 sm:flex-row sm:items-end"
      method="get"
      action="/social"
    >
      <label className="flex min-w-[12rem] flex-1 flex-col gap-1.5 text-xs text-zinc-400">
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
