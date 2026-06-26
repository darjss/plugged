import type { ParentProps } from "solid-js";
import { cn } from "@/lib/utils";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";

/**
 * Admin shell layout: grunge-styled but restrained — functional, not chaotic.
 * Sidebar collapses to an off-canvas sheet on mobile (<768px). The Astro
 * page already enforced the admin guard server-side; this layout assumes
 * the user is an authenticated admin.
 */
export default function DashboardLayout(props: ParentProps) {
  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset class="min-h-svh bg-newsprint">
        <AdminTopbar />
        <main
          class={cn(
            "flex-1 overflow-y-auto p-4 md:p-6 lg:p-8",
            // Subtle grid texture keeps the zine feel without overpowering admin chrome.
            "bg-grid-subtle",
          )}
          aria-label="Admin workspace"
        >
          {props.children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
