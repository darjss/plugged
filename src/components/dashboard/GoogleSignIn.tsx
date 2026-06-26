import { createSignal, Show } from "solid-js";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Google OAuth sign-in button for the admin login page.
 *
 * Uses Better Auth's SolidJS client `signIn.social` which redirects to
 * Google and back to `callbackURL` on success. The Astro `dashboard/index`
 * page re-runs `requireAdmin` on return, so non-admins land on 403 and
 * admins see the SPA.
 */
export default function GoogleSignIn(props: { next?: string }) {
  const [pending, setPending] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const callbackURL = props.next ?? "/dashboard";

  const signIn = async () => {
    setPending(true);
    setError(null);
    const { error: signInError } = await authClient.signIn.social({
      provider: "google",
      callbackURL,
    });
    setPending(false);
    if (signInError) {
      setError(signInError.message ?? "Google sign-in failed");
    }
  };

  return (
    <div class="flex flex-col items-center gap-4">
      <Button
        variant="default"
        size="lg"
        class={cn("w-full max-w-sm")}
        disabled={pending()}
        onClick={() => void signIn()}
      >
        <GoogleIcon />
        {pending() ? "Redirecting to Google…" : "Sign in with Google"}
      </Button>
      <Show when={error()}>
        {(msg) => (
          <p class="max-w-sm border-2 border-pink bg-pink/10 px-3 py-2 font-mono text-xs text-pink">
            {msg()}
          </p>
        )}
      </Show>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg class="size-5" viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}
