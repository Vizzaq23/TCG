import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const controlClass =
  "rounded-[12px] border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none transition focus-visible:border-amber-500/60 focus-visible:ring-2 focus-visible:ring-amber-500/25 disabled:opacity-50";

type FieldProps = {
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
  className?: string;
};

export function Field({ label, hint, error, children, className }: FieldProps) {
  return (
    <label className={cn("flex flex-col gap-1.5 text-sm", className)}>
      <span className="text-zinc-400">{label}</span>
      {children}
      {hint && !error ? <span className="text-xs text-zinc-500">{hint}</span> : null}
      {error ? <span className="text-xs text-red-300">{error}</span> : null}
    </label>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return <input className={cn(controlClass, className)} {...props} />;
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select className={cn(controlClass, className)} {...props}>
      {children}
    </select>
  );
}
