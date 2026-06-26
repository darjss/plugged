import { Show } from "solid-js";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

/**
 * Header auth cluster. Reads the Better Auth session atom and renders
 * either a "Sign In" stamp link (unauthenticated) or the customer's
 * phone suffix + "Profile" + "Logout" links (authenticated).
 *
 * `client:idle` so the SSR output shows the signed-out state and the
 * real state appears after hydration without a session mismatch.
 */
export default function HeaderAuth() {
  const session = authClient.useSession();
  const phone = () => session()?.data?.user?.phoneNumber ?? null;
  const phoneSuffix = () => (phone() ? phone()!.slice(-4) : "");

  async function handleSignOut() {
    await authClient.signOut();
    window.location.assign("/");
  }

  return (
    <div class="flex items-center gap-2">
      {/* Signed out */}
      <Show when={!session()?.data}>
        <a
          href="/auth/sign-in"
          class={cn(
            "hidden items-center border-2 border-ink bg-orange px-3 py-2 font-mono text-caption font-black uppercase tracking-wide text-ink shadow-hard-sm sm:flex",
            "transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none",
          )}
        >
          Sign in
        </a>
        {/* Mobile: icon-only stamp */}
        <a
          href="/auth/sign-in"
          aria-label="Sign in"
          class={cn(
            "flex size-11 items-center justify-center border-2 border-ink bg-orange font-display text-lg font-black text-ink shadow-hard-sm sm:hidden",
            "transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none",
          )}
        >
          →
        </a>
      </Show>

      {/* Signed in */}
      <Show when={session()?.data}>
        <a
          href="/profile"
          class={cn(
            "hidden items-center gap-2 border-2 border-ink bg-card px-3 py-2 font-mono text-caption font-black uppercase tracking-wide text-ink shadow-hard-sm sm:flex",
            "transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none",
          )}
          aria-label="Profile"
        >
          <span class="text-orange">{phoneSuffix()}</span>
          <span>Profile</span>
        </a>
        {/* Mobile: profile icon stamp */}
        <a
          href="/profile"
          aria-label="Profile"
          class={cn(
            "flex size-11 items-center justify-center border-2 border-ink bg-card font-display text-lg font-black text-ink shadow-hard-sm sm:hidden",
            "transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none",
          )}
        >
          {phoneSuffix().slice(0, 2)}
        </a>
        <button
          type="button"
          onClick={handleSignOut}
          aria-label="Log out"
          class={cn(
            "flex size-11 items-center justify-center border-2 border-ink bg-pink font-display text-lg font-black text-newsprint shadow-hard-sm",
            "transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none",
          )}
        >
          ×
        </button>
      </Show>
    </div>
  );
}
