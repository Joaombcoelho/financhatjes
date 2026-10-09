import { Info } from "lucide-react";
import type { ReactNode } from "react";

export function Notice({ children }: { children: ReactNode }) {
  return (
    <div
      role="note"
      className="flex items-start gap-3 rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-secondary-foreground"
    >
      <Info className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
