import { createEffect, createSignal, onCleanup, Show } from "solid-js";
import { authClient } from "@/lib/auth-client";
import { cn, MONGOLIAN_PHONE_REGEX } from "@/lib/utils";
import { trackAnalytics } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Step = "phone" | "otp";

/**
 * Customer sign-in via Better Auth phone-number OTP.
 *
 * Step 1: enter 8-digit Mongolian phone → send OTP via
 *   `authClient.phoneNumber.sendOtp({ phoneNumber: "+976XXXXXXXX" })`.
 * Step 2: enter 4-digit OTP → verify via
 *   `authClient.phoneNumber.verify({ phoneNumber, code })`.
 *   On success the session cookie is set and we redirect to `next` or `/`.
 *
 * Server-side rate limiting is handled by the phone-number plugin
 * (allowedAttempts: 5, expiresIn: 300s). OTP length is 4 (server config).
 */
export default function SignInForm(props: { next?: string }) {
  const [step, setStep] = createSignal<Step>("phone");
  const [phoneDigits, setPhoneDigits] = createSignal("");
  const [otp, setOtp] = createSignal("");
  const [error, setError] = createSignal<string | null>(null);
  const [sending, setSending] = createSignal(false);
  const [verifying, setVerifying] = createSignal(false);
  // Two independent clocks: `resendTimer` is a 60s cooldown before the
  // user may request another SMS (cost control); the 300s code EXPIRY
  // mirrors the server's OTP validity window (src/server/lib/auth.ts:43)
  // and is tracked internally (not rendered) — only its terminal
  // `expired` flag drives UI. They must not be conflated: submitting
  // must stay enabled for the full 61-299s window.
  const RESEND_COOLDOWN_S = 60;
  const CODE_EXPIRY_S = 300;
  const [resendTimer, setResendTimer] = createSignal(0);
  const [expired, setExpired] = createSignal(false);

  let interval: ReturnType<typeof setInterval> | undefined;
  let expirySecondsLeft = 0;

  const fullPhone = () => `+976${phoneDigits()}`;
  const phoneValid = () => MONGOLIAN_PHONE_REGEX.test(fullPhone());
  const next = () => props.next || "/";

  function startTimer() {
    if (interval) clearInterval(interval);
    setExpired(false);
    setResendTimer(RESEND_COOLDOWN_S);
    expirySecondsLeft = CODE_EXPIRY_S;
    interval = setInterval(() => {
      setResendTimer((t) => (t <= 1 ? 0 : t - 1));
      expirySecondsLeft -= 1;
      if (expirySecondsLeft <= 0) {
        if (interval) clearInterval(interval);
        setExpired(true);
      }
    }, 1000);
  }

  onCleanup(() => {
    if (interval) clearInterval(interval);
  });

  async function handleSendOtp(e: Event) {
    e.preventDefault();
    setError(null);
    if (!phoneValid()) {
      setError("Phone number must be 8 digits (starting with 6-9).");
      return;
    }
    setSending(true);
    const { error: sendError } = await authClient.phoneNumber.sendOtp({
      phoneNumber: fullPhone(),
    });
    setSending(false);
    if (sendError) {
      setError(sendError.message ?? "Failed to send code.");
      return;
    }
    setStep("otp");
    startTimer();
    setOtp("");
  }

  async function handleVerifyOtp(code: string) {
    setError(null);
    setVerifying(true);
    const { error: verifyError } = await authClient.phoneNumber.verify({
      phoneNumber: fullPhone(),
      code,
    });
    setVerifying(false);
    if (verifyError) {
      setError(verifyError.message ?? "Invalid verification code.");
      setOtp("");
      return;
    }
    trackAnalytics("sign_in_completed", { method: "phone_otp" });
    // Session cookie is now set; redirect to next.
    window.location.assign(next());
  }

  // Auto-submit when OTP reaches 4 digits (server otpLength). Gated on
  // `!expired()` so a stale code sitting in the field after the 300s
  // server-side expiry doesn't fire a verify against an expired OTP.
  createEffect(() => {
    if (otp().length === 4 && !verifying() && !expired()) {
      void handleVerifyOtp(otp());
    }
  });

  async function handleResend() {
    if (resendTimer() > 0) return;
    setError(null);
    setSending(true);
    const { error: sendError } = await authClient.phoneNumber.sendOtp({
      phoneNumber: fullPhone(),
    });
    setSending(false);
    if (sendError) {
      setError(sendError.message ?? "Failed to resend code.");
      return;
    }
    startTimer();
    setOtp("");
  }

  return (
    <div class="space-y-6">
      <Show when={step() === "phone"}>
        <form onSubmit={handleSendOtp} class="space-y-5" novalidate>
          <div class="space-y-2">
            <Label for="phone" class="text-orange">
              Phone number
            </Label>
            <div class="flex items-stretch gap-2">
              <span
                class={cn(
                  "flex items-center border-2 border-ink bg-newsprint-dark px-3",
                  "font-mono text-sm font-black text-ink shadow-hard-sm",
                )}
              >
                +976
              </span>
              <Input
                id="phone"
                type="tel"
                inputmode="numeric"
                autocomplete="tel-national"
                placeholder="88889999"
                maxlength={8}
                value={phoneDigits()}
                onInput={(e) =>
                  setPhoneDigits(e.currentTarget.value.replace(/\D/g, "").slice(0, 8))
                }
                class="font-mono text-lg tracking-wider"
                required
              />
            </div>
            <p class="text-micro font-bold uppercase tracking-wider text-ink-muted">
              8 digits, starting with 6-9
            </p>
          </div>

          <Show when={error()}>
            <p class="border-2 border-pink bg-pink/10 p-3 font-mono text-xs font-black uppercase text-pink shadow-hard-sm">
              {error()}
            </p>
          </Show>

          <Button
            type="submit"
            variant="default"
            size="lg"
            class="w-full"
            disabled={sending() || !phoneValid()}
          >
            {sending() ? "SENDING…" : "GET CODE"}
          </Button>
        </form>
      </Show>

      <Show when={step() === "otp"}>
        <div class="space-y-5">
          <div class="space-y-1 text-center">
            <p class="font-mono text-xs uppercase tracking-widest text-ink-muted">Code sent to</p>
            <p class="font-mono text-sm font-black text-ink">{fullPhone()}</p>
          </div>

          {/* OTP input — single stamped field, large tracking for digit separation */}
          <input
            type="text"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength={4}
            value={otp()}
            autofocus
            onInput={(e) => setOtp(e.currentTarget.value.replace(/\D/g, "").slice(0, 4))}
            class={cn(
              "flex h-16 w-full justify-center border-2 border-ink bg-newsprint-2 px-3 py-2",
              "font-mono text-3xl font-black tracking-[0.5em] text-center text-ink shadow-hard-sm",
              "transition-all placeholder:text-ink-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:shadow-hard",
            )}
            placeholder="----"
            aria-label="Verification code"
          />

          <Show when={error()}>
            <p class="border-2 border-pink bg-pink/10 p-3 text-center font-mono text-xs font-black uppercase text-pink shadow-hard-sm">
              {error()}
            </p>
          </Show>

          {/* Expired OTP state — grunge stamp banner + prominent resend */}
          <Show when={expired()}>
            <div class="flex flex-col gap-3 border-2 border-ink bg-pink p-4 shadow-hard-sm">
              <div class="flex items-center gap-2">
                <span class="rotate-[-3deg] border-2 border-ink bg-newsprint px-2 py-0.5 font-mono text-micro font-black uppercase tracking-wider text-pink shadow-hard-sm">
                  Expired
                </span>
                <span class="font-display text-lg font-black uppercase tracking-tight text-newsprint">
                  Code expired
                </span>
              </div>
              <p class="font-mono text-xs font-bold text-newsprint/90">
                The verification code has expired. Press the button below to get a new one.
              </p>
              <Button
                type="button"
                variant="hazard"
                size="lg"
                class="w-full"
                disabled={sending()}
                onClick={handleResend}
              >
                {sending() ? "SENDING…" : "↻ Get new code"}
              </Button>
            </div>
          </Show>

          <Button
            type="button"
            variant="default"
            size="lg"
            class="w-full"
            disabled={verifying() || otp().length !== 4 || expired()}
            onClick={() => void handleVerifyOtp(otp())}
          >
            {verifying() ? "VERIFYING…" : "SIGN IN"}
          </Button>

          <div class="flex items-center justify-between gap-2">
            <button
              type="button"
              class="font-mono text-xs font-black uppercase tracking-wider text-ink-muted underline decoration-2 underline-offset-4 hover:text-ink"
              onClick={() => {
                setStep("phone");
                setError(null);
                setOtp("");
                if (interval) clearInterval(interval);
              }}
            >
              ← Back
            </button>
            <Show
              when={resendTimer() > 0}
              fallback={
                <button
                  type="button"
                  disabled={sending()}
                  onClick={handleResend}
                  class="font-mono text-xs font-black uppercase tracking-wider text-orange underline decoration-2 underline-offset-4 hover:text-orange-dark disabled:opacity-50"
                >
                  {sending() ? "SENDING…" : "RESEND CODE"}
                </button>
              }
            >
              <span class="font-mono text-xs font-black uppercase tracking-wider text-ink-muted">
                Resend in: {resendTimer()}s
              </span>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  );
}
