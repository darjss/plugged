import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "@/lib/utils";

type AspectRatioProps = ComponentProps<"div"> & {
  ratio: number;
  class?: string | undefined;
};

const AspectRatio = (props: AspectRatioProps) => {
  const [local, others] = splitProps(props, ["class", "ratio"]);

  return (
    <div
      data-slot="aspect-ratio"
      class={cn("relative w-full", local.class)}
      style={{ "padding-bottom": `${(1 / local.ratio) * 100}%` }}
      {...others}
    >
      <div class="absolute inset-0" data-slot="aspect-ratio-content">
        {others.children}
      </div>
    </div>
  );
};

export { AspectRatio };
