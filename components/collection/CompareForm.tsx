import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

type Props = { defaultA?: string; defaultB?: string };

export function CompareForm({ defaultA = "", defaultB = "" }: Props) {
  return (
    <form
      key={`${defaultA}\u001f${defaultB}`}
      method="get"
      action="/compare"
      autoComplete="off"
      className="surface-card flex flex-col gap-4 rounded-[20px] p-5 sm:flex-row sm:items-end"
    >
      <Field label="Collector A" className="flex-1 text-xs">
        <Input
          name="a"
          defaultValue={defaultA}
          required
          placeholder="username"
          className="py-1.5 text-sm"
        />
      </Field>
      <Field label="Collector B" className="flex-1 text-xs">
        <Input
          name="b"
          defaultValue={defaultB}
          required
          placeholder="username"
          className="py-1.5 text-sm"
        />
      </Field>
      <Button type="submit" size="md" className="sm:min-w-28">
        Compare
      </Button>
    </form>
  );
}
