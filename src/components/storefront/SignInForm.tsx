import { createEffect, createSignal, onCleanup, Show } from "solid-js";
import { authClient } from "@/lib/auth-client";
import { cn, MONGOLIAN_PHONE_REGEX } from "@/lib/utils";
import { trackAnalytics } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import PhoneInput from "./PhoneInput";

type Step = "phone" | "otp";

export default function SignInForm(props: { next?: string }) {
  const [step, setStep] = createSignal<Step>("phone");
  const [phoneDigits, setPhoneDigits] = createSignal("");
  const [otp, setOtp] = createSignal("");
  const [error, setError] = createSignal<string | null>(null);
  const [sending, setSending] = createSignal(false);
  const [verifying, setVerifying] = createSignal(false);
  const [timer, setTimer] = createSignal(0);
  const [expired, setExpired] = createSignal(false);

  let interval: ReturnType<typeof setInterval> | undefined;

  const fullPhone = () => `+976${phoneDigits()}`;
  const phoneValid = () => MONGOLIAN_PHONE_REGEX.test(fullPhone());
  const next = () => props.next || "/";

  function startTimer(seconds: number) {
    if (interval) clearInterval(interval);
    setExpired(false);
    setTimer(seconds);
    interval = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          if (interval) clearInterval(interval);
          setExpired(true);
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
    trackAnalytics("sign_in_completed", { method: "phone_otp" });
    window.location.assign(next());
  }

  // Auto-submit when OTP reaches 4 digits (server otpLength). Gated on
  // `!expired()` so a stale code sitting in the field after the 60s timer
  // ran out doesn't fire a verify against an expired OTP.
  createEffect(() => {
    if (otp().length === 4 && !verifying() && !expired()) {
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
            <PhoneInput id="phone" value={phoneDigits()} onInput={setPhoneDigits} required />
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

          <Show when={expired()}>
            <div class="flex flex-col gap-3 border-2 border-ink bg-pink p-4 shadow-hard-sm">
              <div class="flex items-center gap-2">
                <span class="rotate-[-3deg] border-2 border-ink bg-newsprint px-2 py-0.5 font-mono text-micro font-black uppercase tracking-wider text-pink shadow-hard-sm">
                  Expired
                </span>
                <span class="font-display text-lg font-black uppercase tracking-tight text-newsprint">
                  Код хүчингүй болсон
                </span>
              </div>
              <p class="font-mono text-xs font-bold text-newsprint/90">
                Баталгаажуулах кодын хүчинтэй хугацаа дууссан. Шинэ код авахын тулд доорх товчийг
                дарна уу.
              </p>
              <Button
                type="button"
                variant="hazard"
                size="lg"
                class="w-full"
                disabled={sending()}
                onClick={handleResend}
              >
                {sending() ? "ИЛГЭЭЖ БАЙНА…" : "↻ Шинэ код авах"}
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
