import { QueryClientProvider } from "@tanstack/solid-query";
import type { ParentProps } from "solid-js";
import { Toaster } from "@/components/ui/sonner";
import { queryClient } from "../../lib/query-client";

export default function DashboardProviders(props: ParentProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {props.children}
      <Toaster />
    </QueryClientProvider>
  );
}
