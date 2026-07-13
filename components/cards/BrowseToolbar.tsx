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
      className="flex flex-col gap-3 rounded-[14px] border border-zinc-800/80 bg-zinc-900/30 p-4 sm:flex-row sm:flex-wrap sm:items-end"
      method="get"
      action="/browse"
    >
      <label className="flex min-w-[12rem] flex-1 flex-col gap-1.5 text-xs text-zinc-400">
        Search name
        <Input
          name="q"
          defaultValue={q}
          placeholder="Luffy, Shanks…"
          className="placeholder:text-zinc-600"
        />
      </label>
      <label className="flex min-w-[9rem] flex-col gap-1.5 text-xs text-zinc-400">
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
      <label className="flex min-w-[8rem] flex-col gap-1.5 text-xs text-zinc-400">
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
      <label className="flex min-w-[8rem] flex-col gap-1.5 text-xs text-zinc-400">
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
      <label className="flex min-w-[8rem] flex-col gap-1.5 text-xs text-zinc-400">
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
      <div className="flex gap-2">
        <Button type="submit" size="md">
          Apply
        </Button>
        <Button href="/browse" variant="secondary" size="md">
          Reset
        </Button>
      </div>
    </form>
  );
}
