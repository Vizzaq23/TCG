import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  children: ReactNode;
  className?: string;
  as?: "main" | "div" | "section";
};

export function PageContainer({ children, className, as: Tag = "div" }: Props) {
  return (
    <Tag
      className={cn(
        "mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
