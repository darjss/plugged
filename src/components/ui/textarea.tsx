import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "@/lib/utils";

type TextareaProps = ComponentProps<"textarea">;

const Textarea = (props: TextareaProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <textarea
      data-slot="textarea"
      class={cn(
        "flex min-h-20 w-full bg-newsprint-2 px-3 py-2 text-sm font-mono border-2 border-ink shadow-hard-sm transition-all placeholder:text-ink-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:shadow-hard disabled:cursor-not-allowed disabled:opacity-50",
        local.class,
      )}
      {...others}
    />
  );
};

export { Textarea, type TextareaProps };
