import type { VariantProps } from "class-variance-authority";
import type { badgeVariants } from "@/components/ui/badge";
import { orderStatuses, paymentStatuses } from "@/server/db/schema";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

export const orderStatusBadgeVariant: Record<(typeof orderStatuses)[number], BadgeVariant> = {
  pending: "warning",
  paid: "success",
  shipped: "highlighter",
  delivered: "success",
  cancelled: "destructive",
  refunded: "secondary",
};

export const paymentStatusBadgeVariant: Record<(typeof paymentStatuses)[number], BadgeVariant> = {
  pending: "warning",
  customer_claimed_paid: "highlighter",
  success: "success",
  failed: "destructive",
};

export const ORDER_STATUS_OPTIONS = orderStatuses.map((value) => ({
  value,
  label: value.replace(/_/g, " "),
}));

export const PAYMENT_STATUS_OPTIONS = paymentStatuses.map((value) => ({
  value,
  label: value.replace(/_/g, " "),
}));
