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

function selectClassName() {
  return "rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm text-white outline-none focus:border-amber-500/60";
}

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
      className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
      method="get"
      action="/browse"
    >
      <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs text-zinc-400">
        Search name
        <input
          name="q"
          defaultValue={q}
          placeholder="Luffy, Shanks…"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-amber-500/60"
        />
      </label>
      <label className="flex min-w-[9rem] flex-col gap-1 text-xs text-zinc-400">
        Set
        <select name="set_name" defaultValue={setName} className={selectClassName()}>
          <option value="">All sets</option>
          {setOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-w-[8rem] flex-col gap-1 text-xs text-zinc-400">
        Rarity
        <select name="rarity" defaultValue={rarity} className={selectClassName()}>
          <option value="">All</option>
          {rarityOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-w-[8rem] flex-col gap-1 text-xs text-zinc-400">
        Color
        <select name="color" defaultValue={color} className={selectClassName()}>
          <option value="">All</option>
          {colorOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-w-[8rem] flex-col gap-1 text-xs text-zinc-400">
        Type
        <select name="type" defaultValue={type} className={selectClassName()}>
          <option value="">All</option>
          {typeOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
        >
          Apply
        </button>
        <a
          href="/browse"
          className="inline-flex items-center rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:border-zinc-500"
        >
          Reset
        </a>
      </div>
    </form>
  );
}
