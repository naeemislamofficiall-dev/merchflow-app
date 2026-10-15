import * as React from "react";
import { cn } from "@/lib/utils";

// সাধারণ ব্রাউজারের select (মোবাইলে ভালো চলে)
export function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}