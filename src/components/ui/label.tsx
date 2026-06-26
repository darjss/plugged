import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "@/lib/utils";

type LabelProps = ComponentProps<"label">;

const Label = (props: LabelProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <label
      class={cn(
        "flex select-none items-center text-xs font-black uppercase tracking-wide text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        local.class,
      )}
      data-slot="label"
      {...others}
    />
  );
};

export { Label, type LabelProps };
