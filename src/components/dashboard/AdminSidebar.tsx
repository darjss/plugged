import { A, useLocation } from "@solidjs/router";
import { createQuery } from "@tanstack/solid-query";
import { BarChart3, Box, Home, LogOut, Package, Settings } from "lucide-solid";
import { For, Show, type Component, type JSX } from "solid-js";
import { authClient } from "@/lib/auth-client";
import { adminSessionApi, adminSessionKeys } from "@/lib/admin-api";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

type NavItem = {
  title: string;
  href: string;
  icon: Component<{ class?: string }>;
};

const NAV_ITEMS: NavItem[] = [
  { title: "Home", href: "/", icon: Home },
  { title: "Products", href: "/products", icon: Package },
  { title: "Orders", href: "/orders", icon: Box },
  { title: "Analytics", href: "/analytics", icon: BarChart3 },
  { title: "Settings", href: "/settings", icon: Settings },
];

export default function AdminSidebar() {
  const location = useLocation();

  const session = createQuery(() => ({
    queryKey: adminSessionKeys.detail,
    queryFn: () => adminSessionApi.me(),
  }));

  const isActive = (href: string) =>
    href === "/" ? location.pathname === "/" : location.pathname.startsWith(href);

  return (
    <Sidebar collapsible="offcanvas" class="bg-ink">
      <SidebarHeader class="border-b-2 border-newsprint/15 p-4">
        <a href="/dashboard" class="block font-display text-2xl uppercase leading-none text-orange">
          Plugged
          <span class="block font-mono text-[0.6rem] uppercase tracking-widest text-newsprint/60">
            Admin Console
          </span>
        </a>
      </SidebarHeader>

      <SidebarContent class="p-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <For each={NAV_ITEMS}>
                {(item) => (
                  <SidebarMenuItem>
                    <A href={item.href} class="block" end={item.href === "/"}>
                      <SidebarMenuButton isActive={isActive(item.href)}>
                        <item.icon class="size-5 shrink-0" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </A>
                  </SidebarMenuItem>
                )}
              </For>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter class="border-t-2 border-newsprint/15 p-3">
        <Show when={session.data}>
          {(user) => (
            <div class="flex items-center gap-3 px-2 py-2">
              <div
                class={cn(
                  "flex size-9 shrink-0 items-center justify-center border-2 border-orange bg-orange/20",
                  "font-display text-sm uppercase text-orange",
                )}
              >
                {user().name.slice(0, 2).toUpperCase()}
              </div>
              <div class="min-w-0 flex-1">
                <div class="truncate font-heading text-sm text-newsprint">{user().name}</div>
                <div class="truncate font-mono text-[0.7rem] text-newsprint/60">{user().email}</div>
              </div>
            </div>
          )}
        </Show>
        <Show when={session.isLoading && !session.data}>
          <div class="px-2 py-2 font-mono text-xs text-newsprint/50">Loading session…</div>
        </Show>
        <Button
          variant="ghost"
          size="sm"
          class="mt-2 justify-start border-newsprint/20 text-newsprint/70 hover:border-pink hover:bg-pink hover:text-ink"
          onClick={() =>
            void authClient.signOut({
              fetchOptions: { onSuccess: () => window.location.assign("/dashboard/login") },
            })
          }
        >
          <LogOut class="size-4" />
          Sign out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

// Re-export for layout consumers that want the nav list (e.g. mobile drawer).
export { NAV_ITEMS };
export type { NavItem };
export type AdminSidebarProps = { children?: JSX.Element };
