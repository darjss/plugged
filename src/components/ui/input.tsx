import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "@/lib/utils";

type InputProps = ComponentProps<"input">;

const Input = (props: InputProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <input
      data-slot="input"
      class={cn(
        "flex h-11 w-full min-w-0 bg-newsprint-2 px-3 py-2 text-sm font-mono border-2 border-ink shadow-hard-sm transition-all placeholder:text-ink-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:shadow-hard disabled:cursor-not-allowed disabled:opacity-50 file:border-0 file:bg-transparent file:text-sm file:font-mono",
        local.class,
      )}
      {...others}
    />
  );
};

export { Input, type InputProps };
