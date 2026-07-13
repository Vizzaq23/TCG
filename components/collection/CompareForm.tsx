"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

type Props = { defaultA?: string; defaultB?: string };

export function CompareForm({ defaultA = "", defaultB = "" }: Props) {
  const router = useRouter();
  const [a, setA] = useState(defaultA);
  const [b, setB] = useState(defaultB);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const qa = a.trim().replace(/^@/, "");
    const qb = b.trim().replace(/^@/, "");
    if (!qa || !qb) return;
    router.push(`/compare?a=${encodeURIComponent(qa)}&b=${encodeURIComponent(qb)}`);
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-[14px] border border-zinc-800 bg-zinc-900/40 p-4 sm:flex-row sm:items-end"
    >
      <Field label="Collector A" className="flex-1 text-xs">
        <Input
          value={a}
          onChange={(e) => setA(e.target.value)}
          placeholder="username"
          className="py-1.5 text-sm"
        />
      </Field>
      <Field label="Collector B" className="flex-1 text-xs">
        <Input
          value={b}
          onChange={(e) => setB(e.target.value)}
          placeholder="username"
          className="py-1.5 text-sm"
        />
      </Field>
      <Button type="submit" size="sm">
        Compare
      </Button>
    </form>
  );
}
