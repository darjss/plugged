import { useLocation } from "@solidjs/router";
import { createQuery } from "@tanstack/solid-query";
import { LogOut, User } from "lucide-solid";
import { Show } from "solid-js";
import { api } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";

const ROUTE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/products": "Products",
  "/orders": "Orders",
  "/analytics": "Analytics",
  "/settings": "Settings",
};

function routeTitle(pathname: string) {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];
  const top = `/${pathname.split("/").filter(Boolean)[0] ?? ""}`;
  return ROUTE_TITLES[top] ?? "Admin";
}

export default function AdminTopbar() {
  const location = useLocation();
  // Reuse the same queryKey as AdminSidebar so TanStack Query dedups
  // the session fetch across both components (the previous
  // createResource here issued an independent second request).
  const session = createQuery(() => ({
    queryKey: ["dashboard", "session"],
    queryFn: async () => {
      const { data, error } = await api.dashboard.session.get();
      if (error || !data) return null;
      // Eden treaty infers dashboard/session as the error shape; cast at
      // the fetch boundary (documented escape hatch).
      const user = (data as { user?: { name: string; email: string } }).user;
      return user ?? null;
    },
  }));

  return (
    <header
      class={cn(
        "sticky top-0 z-20 flex h-16 items-center gap-3 border-b-2 border-ink bg-newsprint/95 px-4 backdrop-blur",
        "shadow-hard-sm",
      )}
    >
      <SidebarTrigger />

      <h1 class="flex-1 truncate font-display text-2xl uppercase leading-none text-ink">
        {routeTitle(location.pathname)}
      </h1>

      <Show when={session.data}>
        {(user) => (
          <DropdownMenu>
            <DropdownMenuTrigger
              as={Button}
              variant="outline"
              size="icon-sm"
              class="rounded-none"
              aria-label="Account menu"
            >
              <User class="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent class="w-56">
              <DropdownMenuLabel class="font-heading uppercase">{user().name}</DropdownMenuLabel>
              <div class="px-2 pb-1 font-mono text-xs text-muted-foreground">{user().email}</div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                class="cursor-pointer font-heading uppercase text-pink"
                onClick={() =>
                  void authClient.signOut({
                    fetchOptions: {
                      onSuccess: () => window.location.assign("/dashboard/login"),
                    },
                  })
                }
              >
                <LogOut class="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </Show>
    </header>
  );
}
