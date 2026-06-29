import type { ParentProps } from "solid-js";
import { cn } from "@/lib/utils";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";

export default function DashboardLayout(props: ParentProps) {
  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset class="min-h-svh bg-newsprint">
        <AdminTopbar />
        <main
          class={cn("flex-1 overflow-y-auto p-4 md:p-6 lg:p-8", "bg-grid-subtle")}
          aria-label="Admin workspace"
        >
          {props.children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
