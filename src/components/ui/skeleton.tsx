import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "@/lib/utils";

const Skeleton = (props: ComponentProps<"div">) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      class={cn("animate-pulse bg-newsprint-dark border-2 border-ink/20", local.class)}
      data-slot="skeleton"
      {...others}
    />
  );
};

export { Skeleton };
