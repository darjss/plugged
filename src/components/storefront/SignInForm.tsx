import { createEffect, createSignal, onCleanup, Show } from "solid-js";
import { authClient } from "@/lib/auth-client";
import { cn, MONGOLIAN_PHONE_REGEX } from "@/lib/utils";
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
  const [timer, setTimer] = createSignal(0);

  let interval: ReturnType<typeof setInterval> | undefined;

  const fullPhone = () => `+976${phoneDigits()}`;
  const phoneValid = () => MONGOLIAN_PHONE_REGEX.test(fullPhone());
  const next = () => props.next || "/";

  function startTimer(seconds: number) {
    if (interval) clearInterval(interval);
    setTimer(seconds);
    interval = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          if (interval) clearInterval(interval);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  onCleanup(() => {
    if (interval) clearInterval(interval);
  });

  async function handleSendOtp(e: Event) {
    e.preventDefault();
    setError(null);
    if (!phoneValid()) {
      setError("Утасны дугаар 8 оронтой байх ёстой (6-9-өөр эхлэх).");
      return;
    }
    setSending(true);
    const { error: sendError } = await authClient.phoneNumber.sendOtp({
      phoneNumber: fullPhone(),
    });
    setSending(false);
    if (sendError) {
      setError(sendError.message ?? "Код илгээхэд алдаа гарлаа.");
      return;
    }
    setStep("otp");
    startTimer(60);
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
      setError(verifyError.message ?? "Баталгаажуулах код буруу байна.");
      setOtp("");
      return;
    }
    // Session cookie is now set; redirect to next.
    window.location.assign(next());
  }

  // Auto-submit when OTP reaches 4 digits (server otpLength).
  createEffect(() => {
    if (otp().length === 4 && !verifying()) {
      void handleVerifyOtp(otp());
    }
  });

  async function handleResend() {
    if (timer() > 0) return;
    setError(null);
    setSending(true);
    const { error: sendError } = await authClient.phoneNumber.sendOtp({
      phoneNumber: fullPhone(),
    });
    setSending(false);
    if (sendError) {
      setError(sendError.message ?? "Код дахин илгээхэд алдаа гарлаа.");
      return;
    }
    startTimer(60);
    setOtp("");
  }

  return (
    <div class="space-y-6">
      <Show when={step() === "phone"}>
        <form onSubmit={handleSendOtp} class="space-y-5" novalidate>
          <div class="space-y-2">
            <Label for="phone" class="text-orange">
              Утасны дугаар
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
              8 оронтой, 6-9-өөр эхлэх ёстой
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
            {sending() ? "ИЛГЭЭЖ БАЙНА…" : "КОД АВАХ"}
          </Button>
        </form>
      </Show>

      <Show when={step() === "otp"}>
        <div class="space-y-5">
          <div class="space-y-1 text-center">
            <p class="font-mono text-xs uppercase tracking-widest text-ink-muted">Код илгээгдсэн</p>
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
            aria-label="Баталгаажуулах код"
          />

          <Show when={error()}>
            <p class="border-2 border-pink bg-pink/10 p-3 text-center font-mono text-xs font-black uppercase text-pink shadow-hard-sm">
              {error()}
            </p>
          </Show>

          <Button
            type="button"
            variant="default"
            size="lg"
            class="w-full"
            disabled={verifying() || otp().length !== 4}
            onClick={() => void handleVerifyOtp(otp())}
          >
            {verifying() ? "БАТАЛГААЖУУЛЖ БАЙНА…" : "НЭВТРЭХ"}
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
              ← Буцах
            </button>
            <Show
              when={timer() > 0}
              fallback={
                <button
                  type="button"
                  disabled={sending()}
                  onClick={handleResend}
                  class="font-mono text-xs font-black uppercase tracking-wider text-orange underline decoration-2 underline-offset-4 hover:text-orange-dark disabled:opacity-50"
                >
                  {sending() ? "ИЛГЭЭЖ БАЙНА…" : "КОД ДАХИН ИЛГЭЭХ"}
                </button>
              }
            >
              <span class="font-mono text-xs font-black uppercase tracking-wider text-ink-muted">
                Дахин илгээх: {timer()}с
              </span>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  );
}
