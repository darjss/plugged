import { createSignal } from "solid-js";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

// `client:only` to avoid SSR/localStorage session mismatch.
export default function LogoutButton() {
  const [pending, setPending] = createSignal(false);

  async function handleSignOut() {
    setPending(true);
    await authClient.signOut();
    window.location.assign("/");
  }

  return (
    <button
      type="button"
      disabled={pending()}
      onClick={handleSignOut}
      class={cn(
        "border-2 border-ink bg-pink px-5 py-2.5 font-mono text-xs font-black uppercase tracking-wider text-newsprint shadow-hard-sm",
        "transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none",
        "disabled:opacity-50",
      )}
    >
      {pending() ? "LEAVING…" : "LOG OUT"}
    </button>
  );
}
