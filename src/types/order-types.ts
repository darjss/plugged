// Hand-written because Eden infers the success body as `unknown` due to the
// server's dynamic `.onError()` status codes (see src/lib/api-client.ts).
// The shapes mirror the public columns returned by `GET /orders?phone=` so
// the order-history and order-tracking islands share one type.

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  unitPriceMnt: number;
  quantity: number;
  lineTotalMnt: number;
  createdAt: Date;
}

export interface OrderPayment {
  id: string;
  orderId: string;
  paymentNumber: string;
  provider: string;
  status: string;
  amountMnt: number;
  qpayInvoiceId: string | null;
  qpayQrText: string | null;
  qpayQrImage: string | null;
  qpayUrlsJson: string | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderRow {
  id: string;
  orderNumber: string;
  userId: string | null;
  customerPhone: string;
  customerName: string | null;
  status: string;
  subtotalMnt: number;
  deliveryFeeMnt: number;
  totalMnt: number;
  address: string;
  deliveryProvider: string;
  notes: string | null;
  checkoutToken: string;
  orderedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt: Date | null;
  items: OrderItem[];
  payments: OrderPayment[];
}

export type OrdersResponse = { orders: OrderRow[] };

export const statusVariant: Record<
  string,
  "default" | "stamp" | "success" | "warning" | "destructive" | "secondary"
> = {
  pending: "warning",
  shipped: "default",
  delivered: "success",
  cancelled: "destructive",
  refunded: "secondary",
};

export const statusLabel: Record<string, string> = {
  pending: "Pending",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export const paymentStatusLabel: Record<string, string> = {
  pending: "Pending",
  customer_claimed_paid: "Marked as paid",
  success: "Successful",
  failed: "Failed",
};
