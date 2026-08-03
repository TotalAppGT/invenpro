import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline:
          "text-foreground border-white/10",
        success:
          "border-transparent bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30",
        warning:
          "border-transparent bg-amber-500/20 text-amber-400 hover:bg-amber-500/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

const StatusBadge = React.forwardRef<
  HTMLDivElement,
  BadgeProps & { status?: string }
>(({ className, variant, status, children, ...props }, ref) => {
  const statusVariant: Record<string, VariantProps<typeof badgeVariants>["variant"]> = {
    active: "success",
    activo: "success",
    completed: "success",
    paid: "success",
    pending: "warning",
    pendiente: "warning",
    overdue: "destructive",
    cancelled: "destructive",
    cancelado: "destructive",
    draft: "secondary",
    borrador: "secondary",
    inactive: "outline",
    inactivo: "outline",
  };

  const resolvedVariant =
    variant || (status ? statusVariant[status.toLowerCase()] ?? "default" : "default");

  return (
    <Badge
      ref={ref}
      variant={resolvedVariant}
      className={className}
      {...props}
    >
      {children}
    </Badge>
  );
});
StatusBadge.displayName = "StatusBadge";

export { Badge, badgeVariants, StatusBadge };
