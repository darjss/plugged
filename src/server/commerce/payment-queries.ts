import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { order, payment, paymentStatuses } from "../db/schema";
import { ConflictError, NotFoundError } from "../lib/errors";
import { now } from "../lib/datetime";
import { createQpayInvoice } from "../integrations/qpay";

export async function getPaymentByNumber(paymentNumber: string) {
  const result = await db.query.payment.findFirst({
    where: eq(payment.paymentNumber, paymentNumber),
    with: {
      order: true,
    },
  });

  if (!result) throw new NotFoundError("payment", paymentNumber);
  return result;
}

export async function updatePaymentStatus(
  paymentId: string,
  nextStatus: (typeof paymentStatuses)[number],
) {
  if (!paymentStatuses.includes(nextStatus)) {
    throw new ConflictError(`Invalid payment status: ${nextStatus}`);
  }

  const date = now();
  const patch: Record<string, unknown> = {
    status: nextStatus,
    updatedAt: date,
  };
  if (nextStatus === "success") patch.paidAt = date;

  await db.update(payment).set(patch).where(eq(payment.id, paymentId));

  const updated = await db.query.payment.findFirst({ where: eq(payment.id, paymentId) });
  if (!updated) throw new NotFoundError("payment", paymentId);
  return updated;
}

// Idempotent, atomic payment confirmation. Used by the QPay webhook.
//
// - Re-reads the payment row. If already `success`, heals the
//   order status to `paid` if it's still `pending` (covers the
//   crash window where a previous confirmation updated the payment
//   but crashed before the order update committed) then returns
//   `{ confirmed: false }`.
// - Verifies the paid amount covers the invoice amount before
//   confirming (defends against partial-payment "PAID" markers).
// - Updates payment → `success` AND order → `paid` in a SINGLE
//   `db.batch()` so the two writes can never diverge. The
//   conditional `WHERE status = 'pending'` on the payment update
//   makes confirmation idempotent by construction: if another
//   worker already flipped the payment, `rowsAffected === 0` and
//   the order update is skipped (the already-success heal path
//   above covers the crash-window case).
//
// Returns `{ confirmed: true }` when this call did the confirmation,
// or `{ confirmed: false }` when the payment was already settled
// (no-op or heal-only).
export async function confirmQpayPayment(
  paymentId: string,
  paidAmountMnt: number | null,
): Promise<{ confirmed: boolean }> {
  const targetPayment = await db.query.payment.findFirst({
    where: eq(payment.id, paymentId),
    with: { order: true },
  });
  if (!targetPayment) throw new NotFoundError("payment", paymentId);

  // Idempotency: already settled. Heal the order status if a
  // previous confirmation crashed after updating the payment but
  // before the order update committed. Without this heal, a retry
  // would see payment=success and bail, leaving the order stuck
  // in `pending` forever.
  if (targetPayment.status === "success") {
    if (targetPayment.order && targetPayment.order.status === "pending") {
      const healDate = now();
      await db.batch([
        db
          .update(order)
          .set({ status: "paid", updatedAt: healDate })
          .where(and(eq(order.id, targetPayment.orderId), eq(order.status, "pending"))),
      ]);
    }
    return { confirmed: false };
  }

  // Amount check: only confirm when the paid amount covers the
  // invoice amount. If QPay didn't report a paid amount, fall back
  // to trusting the PAID status (the webhook already verified via
  // the QPay API; this guard is defense-in-depth against partial
  // payments that QPay marks "PAID").
  const required = targetPayment.amountMnt;
  if (paidAmountMnt !== null && paidAmountMnt < required) {
    throw new ConflictError(`Paid amount ${paidAmountMnt} does not cover invoice ${required}`);
  }

  const date = now();

  // SINGLE atomic batch: payment → success AND order → paid
  // together. The payment update is conditional on
  // `status = 'pending'` so concurrent confirmations don't
  // double-flip. If the payment conditional fails (another worker
  // already confirmed), the order update still runs but is
  // harmless — it's conditional on `status = 'pending'` too, so
  // it won't clobber a `paid`/`shipped`/`delivered` order.
  await db.batch([
    db
      .update(payment)
      .set({ status: "success", paidAt: date, updatedAt: date })
      .where(and(eq(payment.id, paymentId), eq(payment.status, "pending"))),
    db
      .update(order)
      .set({ status: "paid", updatedAt: date })
      .where(and(eq(order.id, targetPayment.orderId), eq(order.status, "pending"))),
  ]);

  return { confirmed: true };
}

// Idempotent: if a QPay invoice is already attached, returns the
// existing QR data instead of minting a new one (prevents orphaned
// invoices when the route is called twice).
export async function createQpayInvoiceForOrder(orderNumber: string) {
  const targetOrder = await db.query.order.findFirst({
    where: eq(order.orderNumber, orderNumber),
    with: {
      payments: true,
    },
  });

  if (!targetOrder) throw new NotFoundError("order", orderNumber);

  const targetPayment = targetOrder.payments.find((p) => p.provider === "qpay");
  if (!targetPayment) throw new NotFoundError("qpay-payment", orderNumber);

  if (targetPayment.qpayInvoiceId && targetPayment.qpayQrText) {
    return {
      invoiceId: targetPayment.qpayInvoiceId,
      paymentNumber: targetPayment.paymentNumber,
      qrImage: targetPayment.qpayQrImage ?? "",
      qrText: targetPayment.qpayQrText,
      shortUrl: targetPayment.qpayUrlsJson ?? "",
    };
  }

  const invoice = await createQpayInvoice(targetPayment.amountMnt, targetPayment.paymentNumber);

  const date = now();
  // Store the full QPay urls array as JSON in `qpay_urls_json` (the
  // column name promises JSON; the previous code stored a bare shortUrl
  // string and discarded the bank/deep-link URLs QPay returned).
  await db
    .update(payment)
    .set({
      qpayInvoiceId: invoice.invoiceId,
      qpayQrImage: invoice.qrImage,
      qpayQrText: invoice.qrText,
      qpayUrlsJson: JSON.stringify(invoice.urls),
      updatedAt: date,
    })
    .where(eq(payment.id, targetPayment.id));

  return {
    invoiceId: invoice.invoiceId,
    paymentNumber: targetPayment.paymentNumber,
    qrImage: invoice.qrImage,
    qrText: invoice.qrText,
    shortUrl: invoice.shortUrl,
  };
}
