import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        muted: "bg-muted text-muted-foreground",
        outline: "border text-foreground",
        success: "bg-emerald-100 text-emerald-800",
        warning: "bg-gold-100 text-gold-600",
        danger: "bg-red-100 text-red-800",
        info: "bg-denim-100 text-denim-800",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export type BadgeProps = React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}