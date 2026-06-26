import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";

import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center border-2 border-ink px-3 py-1 text-xs font-black uppercase tracking-wide shadow-hard-sm transition-all",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        stamp: "bg-pink text-destructive-foreground rotate-[-2deg]",
        tape: "bg-tape text-ink border-transparent shadow-none",
        highlighter: "bg-accent text-accent-foreground border-transparent shadow-none",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "bg-background text-foreground",
        success: "bg-success text-success-foreground",
        warning: "bg-warning text-warning-foreground",
        destructive: "bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type BadgeProps = ComponentProps<"div"> & VariantProps<typeof badgeVariants>;

const Badge = (props: BadgeProps) => {
  const [local, others] = splitProps(props, ["class", "variant"]);
  return <div class={cn(badgeVariants({ variant: local.variant }), local.class)} {...others} />;
};

export { Badge, badgeVariants };
export type { BadgeProps };
