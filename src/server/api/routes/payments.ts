import { Elysia } from "elysia";
import { commerceQueries } from "../../commerce/queries";
import { captureServerEvent } from "../../integrations/posthog";
import { checkQpayInvoice, verifyQpayWebhook } from "../../integrations/qpay";
import { authPlugin } from "../plugins/auth";
import { parseInput } from "../validation";
import { createPaymentInputSchema } from "../../commerce/validation";

/**
 * QPay payment routes: invoice creation (checkout) and the webhook that
 * confirms payments. Webhook authentication is handled by
 * `verifyQpayWebhook` in the qpay integration module.
 */
export const paymentRoutes = new Elysia({ name: "payment-routes" })
  .use(authPlugin)
  .post("/checkout/create-payment", async ({ body }) => {
    const input = parseInput(createPaymentInputSchema, body);
    return commerceQueries.payments.createQpayInvoiceForOrder(input.orderNumber);
  })
  .post("/qpay/webhook", async ({ query, request, status }) => {
    const paymentNumber = typeof query.id === "string" ? query.id : null;
    if (!paymentNumber) return status(200, { ok: true });

    // Webhook authentication: shared secret in the `x-qpay-webhook-secret`
    // header (set in QPAY_CALLBACK_URL delivery config). On rejection we
    // still return 200 to avoid QPay retry storms, but do not process.
    const auth = verifyQpayWebhook(request.headers);
    if (!auth.accepted) {
      console.warn("qpay webhook rejected", { paymentNumber, reason: auth.reason });
      return status(200, { ok: true });
    }

    try {
      const targetPayment = await commerceQueries.payments.getPaymentByNumber(paymentNumber);
      if (!targetPayment.qpayInvoiceId) return status(200, { ok: true });

      const invoiceStatus = await checkQpayInvoice(targetPayment.qpayInvoiceId);
      if (invoiceStatus.paid) {
        await commerceQueries.payments.confirmQpayPayment(
          targetPayment.id,
          invoiceStatus.paidAmountMnt,
        );
        // Server-side order_completed event — uses order id (not phone) as
        // distinct_id to avoid sending PII to PostHog. This is the canonical
        // source; the client-side confirmation page does NOT re-capture.
        await captureServerEvent(targetPayment.orderId, "order_completed", {
          order_number: targetPayment.order.orderNumber,
          total: targetPayment.order.totalMnt,
          payment_method: targetPayment.provider,
        });
      }
    } catch (error) {
      // QPay-API failure (network, 5xx): return 502 so QPay retries the
      // webhook. Returning 200 unconditionally would silently drop
      // confirmations when QPay's /payment/check is down at delivery time.
      console.error("qpay webhook failed", { paymentNumber, error: String(error) });
      return status(502, { ok: false });
    }

    return status(200, { ok: true });
  });
