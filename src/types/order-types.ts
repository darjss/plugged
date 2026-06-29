/**
 * Storefront-facing order shape. Mirrors the public columns returned by
 * `GET /orders?phone=` so the order-history and order-tracking islands
 * share one type without hand-maintained DTOs.
 *
 * Kept as a structural interface (not imported from the server) so the
 * client bundle stays decoupled from Drizzle/Elysia inference. The
 * runtime shapes come from Eden Treaty but are cast locally because the
 * server's `.onError()` makes Eden infer the error envelope as the 200
 * type (see CheckoutForm.tsx for the same workaround).
 */
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

/** Badge variant per order status. Used by OrderHistory + OrderTracking. */
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

/** Mongolian label per order status. Used by OrderHistory + OrderTracking. */
export const statusLabel: Record<string, string> = {
  pending: "Хүлээгдэж буй",
  shipped: "Илгээгдсэн",
  delivered: "Хүргэгдсэн",
  cancelled: "Цуцлагдсан",
  refunded: "Буцаан олгосон",
};

/** Mongolian label per payment status. Used by OrderTracking. */
export const paymentStatusLabel: Record<string, string> = {
  pending: "Хүлээгдэж буй",
  customer_claimed_paid: "Төлсөн гэж мэдэгдсэн",
  success: "Амжилттай",
  failed: "Амжилтгүй",
};
