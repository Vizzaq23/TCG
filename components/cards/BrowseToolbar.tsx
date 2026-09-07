import { Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

type Option = { value: string; label: string };

type Props = {
  q?: string;
  setName?: string;
  rarity?: string;
  color?: string;
  type?: string;
  setOptions: Option[];
  rarityOptions: Option[];
  colorOptions: Option[];
  typeOptions: Option[];
};

export function BrowseToolbar({
  q = "",
  setName = "",
  rarity = "",
  color = "",
  type = "",
  setOptions,
  rarityOptions,
  colorOptions,
  typeOptions,
}: Props) {
  return (
    <form
      className="surface-card grid gap-4 rounded-[20px] p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-[minmax(15rem,1.7fr)_repeat(4,minmax(7rem,1fr))_auto] lg:items-end"
      method="get"
      action="/browse"
    >
      <label className="flex min-w-0 flex-col gap-2 text-xs font-medium text-zinc-300">
        Name, card number, or set
        <Input
          name="q"
          defaultValue={q}
          placeholder="Luffy, OP17, P-123, promos…"
          className="placeholder:text-zinc-600"
        />
      </label>
      <label className="flex min-w-0 flex-col gap-2 text-xs font-medium text-zinc-300">
        Set
        <Select name="set_name" defaultValue={setName}>
          <option value="">All sets</option>
          {setOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </label>
      <label className="flex min-w-0 flex-col gap-2 text-xs font-medium text-zinc-300">
        Rarity
        <Select name="rarity" defaultValue={rarity}>
          <option value="">All</option>
          {rarityOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </label>
      <label className="flex min-w-0 flex-col gap-2 text-xs font-medium text-zinc-300">
        Color
        <Select name="color" defaultValue={color}>
          <option value="">All</option>
          {colorOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </label>
      <label className="flex min-w-0 flex-col gap-2 text-xs font-medium text-zinc-300">
        Type
        <Select name="type" defaultValue={type}>
          <option value="">All</option>
          {typeOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </label>
      <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
        <Button type="submit" size="md" className="flex-1 lg:flex-none">
          Apply filters
        </Button>
        <Button href="/browse" variant="ghost" size="md">
          Reset
        </Button>
      </div>
    </form>
  );
}
