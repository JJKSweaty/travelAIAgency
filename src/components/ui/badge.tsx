import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold transition", {
  variants: {
    variant: {
      default: "bg-reef/10 text-reef",
      secondary: "bg-ink/6 text-ink/60",
      coral: "bg-coral/10 text-coral",
      gold: "bg-gold/15 text-ink/70",
      dark: "bg-ink text-paper"
    }
  },
  defaultVariants: {
    variant: "default"
  }
});

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
