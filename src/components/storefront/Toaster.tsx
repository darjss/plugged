import { Toaster } from "@/components/ui/sonner";

/**
 * Toast container island. `client:only` so solid-sonner never touches
 * the DOM during SSR. Mounted once in the storefront layout.
 */
export default function ToasterIsland() {
  return <Toaster />;
}
