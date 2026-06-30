/**
 * Admin order response shaping — pure projection functions that map
 * Drizzle relational rows to the flat API shapes Eden Treaty infers
 * for the admin dashboard client.
 *
 * Extracted from `commerce/queries.ts` to keep that file under 1k lines
 * and separate the "fetch from Drizzle" concern from the "project to
 * API shape" concern. These functions have no DB access — they are
 * pure mappers.
 *
 * Explicit return types use `T["status"]` etc. so the Drizzle-inferred
 * union types (e.g. `"pending" | "paid" | ...`) flow through to the
 * Eden Treaty client instead of being widened to `string`.
 */

export function shapeAdminOrderListRow<
  const T extends {
    id: string;
    orderNumber: string;
    customerPhone: string;
    customerName: string | null;
    status: string;
    subtotalMnt: number;
    deliveryFeeMnt: number;
    totalMnt: number;
    orderedAt: Date;
    createdAt: Date;
    user: { email: string; name: string | null; phoneNumber: string | null } | null;
    payments: { status: string; provider: string; paymentNumber: string }[];
    items: {
      productName: string;
      product: {
        images: { url: string; alt: string | null }[];
      };
    }[];
  },
>(
  o: T,
): {
  id: T["id"];
  orderNumber: T["orderNumber"];
  customerPhone: T["customerPhone"];
  customerName: T["customerName"];
  status: T["status"];
  subtotalMnt: T["subtotalMnt"];
  deliveryFeeMnt: T["deliveryFeeMnt"];
  totalMnt: T["totalMnt"];
  orderedAt: T["orderedAt"];
  createdAt: T["createdAt"];
  user: { email: string; name: string | null; phoneNumber: string | null } | null;
  payment: {
    status: T["payments"][number]["status"];
    provider: T["payments"][number]["provider"];
    paymentNumber: T["payments"][number]["paymentNumber"];
  } | null;
  items: {
    productName: string;
    product: {
      image: { url: string; alt: string | null } | null;
    };
  }[];
} {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    customerPhone: o.customerPhone,
    customerName: o.customerName,
    status: o.status,
    subtotalMnt: o.subtotalMnt,
    deliveryFeeMnt: o.deliveryFeeMnt,
    totalMnt: o.totalMnt,
    orderedAt: o.orderedAt,
    createdAt: o.createdAt,
    user: o.user
      ? {
          email: o.user.email,
          name: o.user.name,
          phoneNumber: o.user.phoneNumber,
        }
      : null,
    payment: o.payments[0]
      ? {
          status: o.payments[0].status,
          provider: o.payments[0].provider,
          paymentNumber: o.payments[0].paymentNumber,
        }
      : null,
    items: o.items.map((item) => ({
      productName: item.productName,
      product: {
        image: item.product.images[0]
          ? {
              url: item.product.images[0].url,
              alt: item.product.images[0].alt,
            }
          : null,
      },
    })),
  };
}

export function shapeAdminOrderDetail<
  const T extends {
    id: string;
    orderNumber: string;
    customerPhone: string;
    customerName: string | null;
    status: string;
    subtotalMnt: number;
    deliveryFeeMnt: number;
    totalMnt: number;
    address: string | null;
    deliveryProvider: string | null;
    notes: string | null;
    orderedAt: Date;
    createdAt: Date;
    cancelledAt: Date | null;
    user: { email: string; name: string | null; phoneNumber: string | null } | null;
    items: {
      id: string;
      productName: string;
      variantName: string | null;
      sku: string | null;
      unitPriceMnt: number;
      quantity: number;
      lineTotalMnt: number;
      product: {
        slug: string;
        images: { url: string; alt: string | null }[];
      };
    }[];
    payments: {
      id: string;
      paymentNumber: string;
      provider: string;
      status: string;
      amountMnt: number;
      qpayInvoiceId: string | null;
      paidAt: Date | null;
    }[];
  },
>(
  result: T,
): {
  id: T["id"];
  orderNumber: T["orderNumber"];
  customerPhone: T["customerPhone"];
  customerName: T["customerName"];
  status: T["status"];
  subtotalMnt: T["subtotalMnt"];
  deliveryFeeMnt: T["deliveryFeeMnt"];
  totalMnt: T["totalMnt"];
  address: T["address"];
  deliveryProvider: T["deliveryProvider"];
  notes: T["notes"];
  orderedAt: T["orderedAt"];
  createdAt: T["createdAt"];
  cancelledAt: T["cancelledAt"];
  user: { email: string; name: string | null; phoneNumber: string | null } | null;
  items: {
    id: string;
    productName: string;
    variantName: string | null;
    sku: string | null;
    unitPriceMnt: number;
    quantity: number;
    lineTotalMnt: number;
    product: {
      slug: string;
      image: { url: string; alt: string | null } | null;
    };
  }[];
  payments: {
    id: string;
    paymentNumber: string;
    provider: T["payments"][number]["provider"];
    status: T["payments"][number]["status"];
    amountMnt: number;
    qpayInvoiceId: string | null;
    paidAt: Date | null;
  }[];
} {
  return {
    id: result.id,
    orderNumber: result.orderNumber,
    customerPhone: result.customerPhone,
    customerName: result.customerName,
    status: result.status,
    subtotalMnt: result.subtotalMnt,
    deliveryFeeMnt: result.deliveryFeeMnt,
    totalMnt: result.totalMnt,
    address: result.address,
    deliveryProvider: result.deliveryProvider,
    notes: result.notes,
    orderedAt: result.orderedAt,
    createdAt: result.createdAt,
    cancelledAt: result.cancelledAt,
    user: result.user
      ? {
          email: result.user.email,
          name: result.user.name,
          phoneNumber: result.user.phoneNumber,
        }
      : null,
    items: result.items.map((item) => ({
      id: item.id,
      productName: item.productName,
      variantName: item.variantName,
      sku: item.sku,
      unitPriceMnt: item.unitPriceMnt,
      quantity: item.quantity,
      lineTotalMnt: item.lineTotalMnt,
      product: {
        slug: item.product.slug,
        image: item.product.images[0]
          ? {
              url: item.product.images[0].url,
              alt: item.product.images[0].alt,
            }
          : null,
      },
    })),
    payments: result.payments.map((p) => ({
      id: p.id,
      paymentNumber: p.paymentNumber,
      provider: p.provider,
      status: p.status,
      amountMnt: p.amountMnt,
      qpayInvoiceId: p.qpayInvoiceId,
      paidAt: p.paidAt,
    })),
  };
}

export function shapeAdminOrderStatusPatch(
  id: string,
  status: string,
  cancelledAt: Date | null,
  updatedAt: Date,
) {
  return { id, status, cancelledAt, updatedAt };
}
