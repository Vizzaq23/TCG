import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

const controlClass =
  "min-h-11 rounded-[12px] border border-zinc-700/90 bg-zinc-950/80 px-3.5 py-2.5 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] outline-none transition duration-150 placeholder:text-zinc-600 hover:border-zinc-600 focus-visible:border-amber-500/70 focus-visible:ring-2 focus-visible:ring-amber-500/20 disabled:opacity-50";

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
      <span className="text-xs font-medium tracking-wide text-zinc-300">{label}</span>
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

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(controlClass, "min-h-[4.5rem] resize-y", className)}
      {...props}
    />
  );
}
