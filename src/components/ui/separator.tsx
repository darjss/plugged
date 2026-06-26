import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import { Separator as SeparatorPrimitive, type SeparatorRootProps } from "@kobalte/core/separator";
import type { ComponentProps, ValidComponent } from "solid-js";
import { mergeProps, splitProps } from "solid-js";

import { cn } from "@/lib/utils";

type SeparatorProps<T extends ValidComponent = "hr"> = PolymorphicProps<T, SeparatorRootProps<T>> &
  Pick<ComponentProps<T>, "class">;

const Separator = <T extends ValidComponent = "hr">(props: SeparatorProps<T>) => {
  const mergedProps = mergeProps({ orientation: "horizontal" } as const, props);
  const [local, others] = splitProps(mergedProps as SeparatorProps, ["class"]);
  return (
    <SeparatorPrimitive
      data-slot="separator"
      class={cn(
        "shrink-0 bg-ink data-[orientation=horizontal]:h-0.5 data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-0.5",
        local.class,
      )}
      {...(others as any)}
    />
  );
};

export { Separator, type SeparatorProps };
