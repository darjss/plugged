import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import * as SwitchPrimitive from "@kobalte/core/switch";
import type { ComponentProps, ValidComponent } from "solid-js";
import { mergeProps, splitProps } from "solid-js";

import { cn } from "@/lib/utils";

type SwitchProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  SwitchPrimitive.SwitchRootProps<T>
> &
  Pick<ComponentProps<T>, "class" | "children"> & {
    size?: "sm" | "default";
  };

const Switch = <T extends ValidComponent = "div">(props: SwitchProps<T>) => {
  const mergedProps = mergeProps({ size: "default" as const }, props);
  const [local, others] = splitProps(mergedProps as SwitchProps, ["class", "size", "id"]);
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={local.size}
      class={cn(
        "peer relative inline-flex items-center outline-none transition-all data-disabled:cursor-not-allowed data-disabled:opacity-50",
        "data-[size=default]:h-6 data-[size=default]:w-11",
        "data-[size=sm]:h-5 data-[size=sm]:w-9",
        local.class,
      )}
      {...(others as any)}
    >
      <SwitchPrimitive.Input data-slot="switch-input" class="peer sr-only" id={local.id} />
      <SwitchPrimitive.Control
        data-slot="switch-control"
        class="absolute inset-0 flex cursor-pointer items-center border-2 border-ink bg-newsprint-2 transition-colors data-[checked]:bg-primary data-disabled:cursor-not-allowed"
        onClick={(e) => e.preventDefault()}
      >
        <SwitchPrimitive.Thumb
          data-slot="switch-thumb"
          class="pointer-events-none block size-4 bg-ink transition-transform data-[size=default]:translate-x-0.5 data-[size=default]:data-[checked]:translate-x-5 data-[size=sm]:size-3 data-[size=sm]:translate-x-0.5 data-[size=sm]:data-[checked]:translate-x-4"
        />
      </SwitchPrimitive.Control>
    </SwitchPrimitive.Root>
  );
};

export { Switch };
