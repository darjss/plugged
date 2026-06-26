import { QueryClientProvider } from "@tanstack/solid-query";
import type { ParentProps } from "solid-js";
import { queryClient } from "../../lib/query-client";
import { Toaster } from "../ui/sonner";

export default function DashboardProviders(props: ParentProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {props.children}
      <Toaster />
    </QueryClientProvider>
  );
}
