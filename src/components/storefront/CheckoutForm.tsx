import { Loader2, MapPin, Phone, StickyNote, User } from "lucide-solid";
import * as v from "valibot";
import { createMemo, createSignal, For, Match, Show, Switch, type JSX } from "solid-js";
import { toast } from "solid-sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { cart } from "@/store/cart";
import { api } from "@/lib/api-client";
import { formatMnt, MONGOLIAN_PHONE_REGEX } from "@/lib/utils";
import { deliveryFeeMnt } from "@/server/db/schema";
import QpayQR from "./QpayQR";

interface CheckoutUser {
  phoneNumber: string | null;
  name: string | null;
}

interface FormErrors {
  customerPhone?: string;
  customerName?: string;
  address?: string;
  notes?: string;
}

interface QpayData {
  orderNumber: string;
  paymentNumber: string;
  qrImage: string;
  shortUrl: string;
  totalMnt: number;
}

// Eden infers the 200 type as the error envelope for these routes because the
// server's `.onError()` uses a dynamic status code (see server/api/app.ts).
// The runtime shapes are correct, so we cast to these minimal local types.
interface CheckoutOrder {
  orderNumber: string;
  totalMnt: number;
  payments: { provider: string; paymentNumber: string }[];
}

interface QpayInvoice {
  invoiceId: string;
  paymentNumber: string;
  qrImage: string;
  qrText: string;
  shortUrl: string;
}

interface ErrorEnvelope {
  error: { code: string; message: string; details?: Record<string, unknown> };
}

/** Pull the human-readable message out of an Eden error (typed as unknown). */
function edErrorMessage(error: { value: unknown } | null | undefined, fallback: string): string {
  const envelope = error?.value as ErrorEnvelope | undefined;
  return envelope?.error?.message ?? fallback;
}

// Client-side form schema — mirrors the customer-facing fields of
// checkoutInputSchema. The full payload (items, deliveryProvider) is
// assembled at submit time.
const formSchema = v.object({
  customerPhone: v.pipe(
    v.string(),
    v.regex(MONGOLIAN_PHONE_REGEX, "Use +976 followed by 8 digits"),
  ),
  customerName: v.optional(v.nullable(v.string())),
  address: v.pipe(v.string(), v.minLength(10, "Full address needs at least 10 characters")),
  notes: v.optional(v.nullable(v.string())),
});

type FormValues = v.InferOutput<typeof formSchema>;

/**
 * Checkout form island. `client:only="solid-js"` so it can read the cart
 * store (localStorage) without SSR mismatch. Handles the full single-page
 * flow: customer info → order creation → inline QPay QR → polling.
 */
export default function CheckoutForm(props: { user: CheckoutUser | null }) {
  const [values, setValues] = createSignal<FormValues>({
    customerPhone: props.user?.phoneNumber ?? "",
    customerName: props.user?.name ?? "",
    address: "",
    notes: "",
  });
  const [errors, setErrors] = createSignal<FormErrors>({});
  const [submitting, setSubmitting] = createSignal(false);
  const [qpay, setQpay] = createSignal<QpayData | null>(null);
  const [submitError, setSubmitError] = createSignal<string | null>(null);

  const items = createMemo(() => cart.items());
  const isEmpty = createMemo(() => cart.isHydrated() && items().length === 0);
  const subtotal = createMemo(() => cart.total());
  const total = createMemo(() => subtotal() + deliveryFeeMnt);

  const update = (field: keyof FormValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const result = v.safeParse(formSchema, values());
    if (result.success) {
      setErrors({});
      return true;
    }
    const next: FormErrors = {};
    for (const issue of result.issues) {
      const key = v.getDotPath(issue) as keyof FormErrors;
      if (!next[key]) next[key] = issue.message;
    }
    setErrors(next);
    return false;
  };

  const redirectToProducts = () => {
    toast.error("Your cart is empty", {
      description: "Grab some gear before checking out.",
    });
    window.location.href = "/products";
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setSubmitError(null);

    if (items().length === 0) {
      redirectToProducts();
      return;
    }

    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        items: items().map((item) => ({
          variantId: String(item.variantId),
          quantity: item.quantity,
        })),
        customerPhone: values().customerPhone,
        customerName: values().customerName ?? null,
        address: values().address,
        notes: values().notes ?? null,
        deliveryProvider: "tu-delivery" as const,
        paymentProvider: "qpay" as const,
      };

      const { data: orderData, error: orderError } = await api.checkout.post(payload);
      if (orderError || !orderData) {
        const message = edErrorMessage(orderError, "Could not create your order.");
        setSubmitError(message);
        toast.error("Order failed", { description: message });
        return;
      }
      const order = orderData as unknown as CheckoutOrder;

      const qpayPayment = order.payments.find((p) => p.provider === "qpay");
      if (!qpayPayment) {
        setSubmitError("No QPay payment was created for this order.");
        return;
      }

      const { data: invoiceData, error: invoiceError } = await api.checkout["create-payment"].post({
        orderNumber: order.orderNumber,
      });
      if (invoiceError || !invoiceData) {
        const message = edErrorMessage(invoiceError, "Could not create QPay invoice.");
        setSubmitError(message);
        toast.error("QPay invoice failed", { description: message });
        return;
      }
      const invoice = invoiceData as unknown as QpayInvoice;

      setQpay({
        orderNumber: order.orderNumber,
        paymentNumber: invoice.paymentNumber,
        qrImage: invoice.qrImage,
        shortUrl: invoice.shortUrl,
        totalMnt: order.totalMnt,
      });

      toast.success("Order placed", {
        description: "Scan the QR to pay with QPay.",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setSubmitError(message);
      toast.error("Order failed", { description: message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuccess = () => {
    window.location.href = `/order/confirm/${qpay()?.orderNumber}`;
  };

  const handleRetry = () => {
    // Re-request an invoice for the same order. The server creates a fresh
    // QPay invoice and returns new QR data.
    setSubmitting(true);
    setSubmitError(null);
    const orderNumber = qpay()?.orderNumber;
    if (!orderNumber) return;
    void api.checkout["create-payment"]
      .post({ orderNumber })
      .then(({ data, error }) => {
        if (error || !data) {
          const message = edErrorMessage(error, "Could not create a new invoice.");
          setSubmitError(message);
          toast.error("Retry failed", { description: message });
          return;
        }
        const invoice = data as unknown as QpayInvoice;
        setQpay((prev) =>
          prev
            ? {
                ...prev,
                qrImage: invoice.qrImage,
                shortUrl: invoice.shortUrl,
                paymentNumber: invoice.paymentNumber,
              }
            : prev,
        );
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <Switch>
      <Match when={!cart.isHydrated()}>
        <div class="flex min-h-[60vh] items-center justify-center">
          <Spinner class="size-8 text-ink" />
        </div>
      </Match>
      <Match when={isEmpty()}>
        <div class="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 text-center">
          <div class="flex size-20 items-center justify-center border-4 border-ink bg-newsprint-dark shadow-hard">
            <span class="font-display text-3xl font-black text-ink-muted">0</span>
          </div>
          <h2 class="font-display text-2xl font-black uppercase tracking-tight text-ink">
            Your cart is empty
          </h2>
          <p class="text-sm font-bold text-muted-foreground">No pocket audio yet. Go find some.</p>
          <Button variant="default" size="lg" as="a" href="/products">
            Browse products
          </Button>
        </div>
      </Match>
      <Match when={!qpay()}>
        <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          {/* Customer info form */}
          <form
            onSubmit={handleSubmit}
            class="flex flex-col gap-5 border-2 border-ink bg-card p-5 shadow-hard-lg"
            novalidate
          >
            <div class="-m-5 mb-1 flex items-center gap-2 border-b-4 border-ink bg-ink px-5 py-3">
              <span class="font-display text-xl font-black uppercase tracking-tight text-newsprint">
                Customer info
              </span>
              <span class="ml-auto rotate-1 border-2 border-ink bg-orange px-2 py-0.5 font-mono text-micro font-black text-ink shadow-hard-sm">
                Step 1 / 2
              </span>
            </div>

            {/* Phone */}
            <Field
              label="Phone number"
              icon={<Phone class="size-3.5" />}
              error={errors().customerPhone}
              required
            >
              <Input
                type="tel"
                placeholder="+97688123456"
                value={values().customerPhone}
                onInput={(e) => update("customerPhone", e.currentTarget.value)}
                aria-invalid={Boolean(errors().customerPhone)}
              />
            </Field>

            {/* Name */}
            <Field label="Name (optional)" icon={<User class="size-3.5" />}>
              <Input
                type="text"
                placeholder="Your name"
                value={values().customerName ?? ""}
                onInput={(e) => update("customerName", e.currentTarget.value)}
              />
            </Field>

            {/* Address */}
            <Field
              label="Delivery address"
              icon={<MapPin class="size-3.5" />}
              error={errors().address}
              required
            >
              <Textarea
                placeholder="District, khoroo, building, apartment, door"
                value={values().address}
                onInput={(e) => update("address", e.currentTarget.value)}
                aria-invalid={Boolean(errors().address)}
              />
            </Field>

            {/* Notes */}
            <Field label="Notes (optional)" icon={<StickyNote class="size-3.5" />}>
              <Textarea
                placeholder="Gate code, leave with guard, etc."
                value={values().notes ?? ""}
                onInput={(e) => update("notes", e.currentTarget.value)}
              />
            </Field>

            <Show when={submitError()}>
              <p class="border-2 border-ink bg-pink px-3 py-2 text-sm font-bold text-newsprint shadow-hard-sm">
                {submitError()}
              </p>
            </Show>

            <Button
              type="submit"
              variant="hazard"
              size="lg"
              class="mt-2 w-full"
              disabled={submitting()}
            >
              <Show when={submitting()} fallback={<>Place order → pay</>}>
                <Loader2 class="size-4 animate-spin" />
                Placing order…
              </Show>
            </Button>
          </form>

          {/* Order summary */}
          <aside class="border-2 border-ink bg-newsprint-2 p-4 shadow-hard-lg lg:sticky lg:top-24">
            <div class="mb-3 flex items-center justify-between border-b-2 border-ink pb-2">
              <span class="font-display text-lg font-black uppercase tracking-tight text-ink">
                Your stash
              </span>
              <span class="border-2 border-ink bg-yellow px-2 py-0.5 font-mono text-micro font-black text-ink shadow-hard-sm">
                {cart.count()} items
              </span>
            </div>

            <ul class="flex flex-col gap-2">
              <For each={items()}>
                {(item) => (
                  <li class="flex items-center gap-3 border-2 border-ink bg-newsprint p-2 shadow-hard-sm">
                    <div class="size-12 shrink-0 overflow-hidden border-2 border-ink bg-newsprint-dark">
                      <img
                        src={item.image}
                        alt={item.name}
                        class="size-full object-cover"
                        style={{ filter: "grayscale(0.3) contrast(1.1)" }}
                      />
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-xs font-black uppercase leading-tight text-ink">
                        {item.name}
                      </p>
                      <p class="font-mono text-micro font-bold text-muted-foreground">
                        {formatMnt(item.price)} × {item.quantity}
                      </p>
                    </div>
                    <span class="rotate-1 border-2 border-ink bg-yellow px-1.5 py-0.5 font-mono text-micro font-black text-ink shadow-hard-sm">
                      {formatMnt(item.price * item.quantity)}
                    </span>
                  </li>
                )}
              </For>
            </ul>

            <div class="mt-3 space-y-1.5 border-t-2 border-ink pt-3">
              <Row label="Subtotal" value={formatMnt(subtotal())} />
              <Row label="Delivery" value={formatMnt(deliveryFeeMnt)} />
              <div class="flex items-center justify-between border-t-2 border-ink pt-2">
                <span class="font-black uppercase tracking-wide text-ink">Total</span>
                <span class="rotate-1 border-2 border-ink bg-pink px-3 py-1.5 font-mono text-heading font-black text-newsprint shadow-hard-sm">
                  {formatMnt(total())}
                </span>
              </div>
            </div>
          </aside>
        </div>
      </Match>
      <Match when={qpay()}>
        <div class="mx-auto max-w-md">
          <div class="-mt-2 mb-4 flex items-center gap-2">
            <span class="rotate-1 border-2 border-ink bg-orange px-2 py-0.5 font-mono text-micro font-black text-ink shadow-hard-sm">
              Step 2 / 2
            </span>
            <span class="font-display text-xl font-black uppercase tracking-tight text-ink">
              Pay with QPay
            </span>
          </div>
          <Show when={qpay()}>
            {(qr) => (
              <QpayQR
                orderNumber={qr().orderNumber}
                paymentNumber={qr().paymentNumber}
                qrImage={qr().qrImage}
                shortUrl={qr().shortUrl}
                totalMnt={qr().totalMnt}
                onSuccess={handleSuccess}
                onRetry={handleRetry}
              />
            )}
          </Show>
          <Show when={submitting()}>
            <p class="mt-3 flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
              <Spinner class="size-3.5" /> Reissuing invoice…
            </p>
          </Show>
        </div>
      </Match>
    </Switch>
  );
}

function Field(props: {
  label: string;
  icon: JSX.Element;
  error?: string;
  required?: boolean;
  children: JSX.Element;
}) {
  return (
    <div class="flex flex-col gap-1.5">
      <Label class="flex items-center gap-1.5 text-ink">
        <span class="text-orange">{props.icon}</span>
        {props.label}
        <Show when={props.required}>
          <span class="text-pink">*</span>
        </Show>
      </Label>
      {props.children}
      <Show when={props.error}>
        <p class="text-xs font-bold text-pink">{props.error}</p>
      </Show>
    </div>
  );
}

function Row(props: { label: string; value: string }) {
  return (
    <div class="flex items-center justify-between">
      <span class="text-xs font-black uppercase tracking-wide text-muted-foreground">
        {props.label}
      </span>
      <span class="font-mono text-sm font-bold text-ink">{props.value}</span>
    </div>
  );
}
