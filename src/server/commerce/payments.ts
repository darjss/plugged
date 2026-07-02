import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { order, payment } from "../db/schema";
import { ConflictError, NotFoundError } from "../lib/errors";
import { now } from "../lib/datetime";
import { checkQpayInvoice, createQpayInvoice } from "../integrations/qpay";

// QPay's payment/check endpoint reports payments against an invoice but
// not the invoice's own liveness, and our invoices are created without an
// explicit expiry. Treat a stored unpaid invoice as "live" only within
// this window (matches the storefront's 5-minute QR polling timeout in
// QpayQR.tsx — after the client shows "expired" and the user retries,
// the stored invoice is past this window and a fresh one is minted).
const QPAY_INVOICE_FRESH_MS = 5 * 60 * 1000;

/**
 * Fetch a payment (with its order) by payment number.
 */
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

/**
 * Idempotent, atomic payment confirmation. Used by the QPay webhook.
 *
 * - Re-reads the payment row. If already `success`, heals the
 *   order status to `paid` if it's still `pending` (covers the
 *   crash window where a previous confirmation updated the payment
 *   but crashed before the order update committed) then returns
 *   `{ confirmed: false }`.
 * - Verifies the paid amount covers the invoice amount before
 *   confirming (defends against partial-payment "PAID" markers).
 * - Updates payment → `success` AND order → `paid` in a SINGLE
 *   `db.batch()` so the two writes can never diverge. The
 *   conditional `WHERE status = 'pending'` on the payment update
 *   makes confirmation idempotent by construction: if another
 *   worker already flipped the payment, `rowsAffected === 0` and
 *   the order update is skipped (the already-success heal path
 *   above covers the crash-window case).
 *
 * Returns `{ confirmed: true }` when this call did the confirmation,
 * or `{ confirmed: false }` when the payment was already settled
 * (no-op or heal-only).
 */
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

/**
 * Create a QPay invoice for an order's outstanding payment and persist
 * the invoice id + QR data on the payment record. Returns the QR data
 * for the client to render.
 *
 * Idempotent: if a QPay invoice is already attached, returns the
 * existing QR data instead of minting a new one (prevents orphaned
 * invoices when the route is called twice).
 */
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

  // Idempotency: if a QPay invoice is already attached, prefer returning
  // the existing QR data — re-minting would orphan the first invoice and
  // break any client already showing the first QR. But an unpaid invoice
  // does not stay payable forever: on retry, verify it before re-serving.
  if (targetPayment.qpayInvoiceId && targetPayment.qpayQrText) {
    const cached = {
      invoiceId: targetPayment.qpayInvoiceId,
      paymentNumber: targetPayment.paymentNumber,
      qrImage: targetPayment.qpayQrImage ?? "",
      qrText: targetPayment.qpayQrText,
      shortUrl: targetPayment.qpayUrlsJson ?? "",
    };

    // Settled payments never mint again.
    if (targetPayment.status !== "pending") return cached;

    // Ask QPay whether the stored invoice was already paid (covers a
    // lost/late webhook — the poller will pick the confirmation up).
    // A check failure is treated as "unknown", falling through to the
    // freshness window below rather than blocking the retry.
    const invoiceStatus = await checkQpayInvoice(targetPayment.qpayInvoiceId).catch(() => null);
    if (invoiceStatus?.paid) return cached;

    // Unpaid: stay idempotent while the invoice is fresh (a rapid
    // double-click must not mint two invoices). `updatedAt` is the mint
    // time — nothing else touches a pending qpay payment row. Past the
    // window the QR the customer holds is expired/dead, so fall through
    // and mint a fresh invoice (the single UPDATE below atomically
    // replaces the stored invoice id + QR data).
    const invoiceAgeMs = Date.now() - targetPayment.updatedAt.getTime();
    if (invoiceAgeMs < QPAY_INVOICE_FRESH_MS) return cached;
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
