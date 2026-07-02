import { ExternalLink, RefreshCw, ScanLine, X } from "lucide-solid";
import { createEffect, createSignal, onCleanup, Show } from "solid-js";
import { toast } from "solid-sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api-client";
import { cn, formatMnt } from "@/lib/utils";

type PollState = "polling" | "success" | "failed" | "expired";

interface QpayQRProps {
  orderNumber: string;
  paymentNumber: string;
  qrImage: string;
  shortUrl: string;
  totalMnt: number;
  /** Called when payment succeeds — parent decides navigation. */
  onSuccess: () => void;
  /** Called when the user clicks "retry payment". */
  onRetry: () => void;
}

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Inline QPay QR display + payment status polling. Renders the QR image,
 * short URL, and a polling spinner. On `success` calls `onSuccess`; on
 * `failed` or 5-minute timeout shows a grunge error state with retry.
 */
export default function QpayQR(props: QpayQRProps) {
  const [state, setState] = createSignal<PollState>("polling");
  const [elapsed, setElapsed] = createSignal(0);
  let timer: ReturnType<typeof setInterval> | undefined;
  let startedAt = 0;

  const stopPolling = () => {
    if (timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };

  const poll = async () => {
    const { data, error } = await api.payments({ paymentNumber: props.paymentNumber }).status.get();

    if (error) {
      // Network/API blip — keep polling, don't fail on a single error.
      return;
    }

    const status = data?.status;
    if (status === "success") {
      stopPolling();
      setState("success");
      toast.success("Payment received", { description: "Redirecting to your order…" });
      props.onSuccess();
    } else if (status === "failed") {
      stopPolling();
      setState("failed");
    }
  };

  const startPolling = () => {
    stopPolling();
    setState("polling");
    setElapsed(0);
    startedAt = Date.now();
    timer = setInterval(async () => {
      const elapsedMs = Date.now() - startedAt;
      setElapsed(elapsedMs);
      if (elapsedMs >= POLL_TIMEOUT_MS) {
        stopPolling();
        setState("expired");
        return;
      }
      await poll();
    }, POLL_INTERVAL_MS);
    // Fire immediately so the user doesn't wait 3s for the first check.
    void poll();
  };

  createEffect(() => {
    startPolling();
  });

  onCleanup(stopPolling);

  const remainingSeconds = () => Math.max(0, Math.ceil((POLL_TIMEOUT_MS - elapsed()) / 1000));

  return (
    <Show
      when={state() !== "success"}
      fallback={
        <div class="flex flex-col items-center gap-3 border-2 border-ink bg-success p-6 text-center shadow-hard-lg">
          <span class="font-display text-2xl font-black uppercase tracking-tight text-success-foreground">
            Paid
          </span>
          <p class="text-sm font-bold uppercase text-success-foreground">
            Redirecting to confirmation…
          </p>
          <Spinner class="size-6 text-success-foreground" />
        </div>
      }
    >
      <div class="flex flex-col gap-4 border-2 border-ink bg-card p-5 shadow-hard-lg">
        {/* Header strip */}
        <div class="-m-5 mb-1 flex items-center justify-between border-b-4 border-ink bg-hazard-stripes px-5 py-3">
          <div class="flex items-center gap-2">
            <ScanLine class="size-5 text-ink" />
            <span class="font-display text-lg font-black uppercase tracking-tight text-ink">
              Scan to pay
            </span>
          </div>
          <span class="rotate-1 border-2 border-ink bg-newsprint px-2 py-0.5 font-mono text-micro font-black text-ink shadow-hard-sm">
            QPAY
          </span>
        </div>

        <Show
          when={state() === "polling"}
          fallback={
            <FailedState
              state={state()}
              onRetry={() => {
                props.onRetry();
                startPolling();
              }}
            />
          }
        >
          {/* QR image */}
          <div class="flex flex-col items-center gap-3">
            <div class="border-2 border-ink bg-newsprint p-3 shadow-hard">
              <img
                src={props.qrImage}
                alt="QPay QR code"
                class="size-56 object-contain"
                style={{ "image-rendering": "pixelated" }}
              />
            </div>

            <a
              href={props.shortUrl}
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center gap-1.5 border-2 border-ink bg-orange px-3 py-2 font-mono text-xs font-black uppercase tracking-wide text-ink shadow-hard-sm transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
            >
              <ExternalLink class="size-3.5" />
              Open in QPay app
            </a>

            <p class="max-w-xs text-center text-xs font-bold uppercase leading-tight text-muted-foreground">
              Open the QPay app and scan this code, or tap the link above.
            </p>
          </div>

          {/* Polling indicator */}
          <div class="flex items-center justify-between border-t-2 border-ink pt-3">
            <div class="flex items-center gap-2">
              <Spinner class="size-4 text-ink" />
              <span class="font-mono text-xs font-black uppercase tracking-wide text-ink">
                Waiting for payment
              </span>
            </div>
            <span class="font-mono text-xs font-bold text-muted-foreground">
              {remainingSeconds()}s left
            </span>
          </div>

          {/* Total stamp */}
          <div class="flex items-center justify-between">
            <span class="text-xs font-black uppercase tracking-wide text-muted-foreground">
              Total due
            </span>
            <span class="rotate-1 border-2 border-ink bg-pink px-3 py-1.5 font-mono text-heading font-black text-newsprint shadow-hard-sm">
              {formatMnt(props.totalMnt)}
            </span>
          </div>
        </Show>
      </div>
    </Show>
  );
}

function FailedState(props: { state: PollState; onRetry: () => void }) {
  const isExpired = () => props.state === "expired";
  const headline = () => (isExpired() ? "Payment expired" : "Payment failed");
  const body = () =>
    isExpired()
      ? "The QR code timed out after 5 minutes. Try again to get a fresh code."
      : "The payment was declined or cancelled. You can retry or reach out to support.";

  return (
    <div class="flex flex-col gap-4">
      <div class={cn("flex items-start gap-3 border-2 border-ink bg-pink p-4 shadow-hard-sm")}>
        <X class="mt-0.5 size-5 shrink-0 text-newsprint" />
        <div class="flex flex-col gap-1">
          <span class="font-display text-xl font-black uppercase tracking-tight text-newsprint">
            {headline()}
          </span>
          <p class="text-sm font-bold text-newsprint/90">{body()}</p>
        </div>
      </div>

      <div class="flex flex-col gap-2 sm:flex-row">
        <Button variant="hazard" size="lg" class="flex-1" onClick={() => props.onRetry()}>
          <RefreshCw class="size-4" />
          Retry payment
        </Button>
        <Button
          variant="outline"
          size="lg"
          as="a"
          href="mailto:support@pluggedaudio.store"
          class="flex-1"
        >
          Contact support
        </Button>
      </div>
    </div>
  );
}
