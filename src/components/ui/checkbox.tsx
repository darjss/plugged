import * as CheckboxPrimitive from "@kobalte/core/checkbox";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import { CheckIcon } from "lucide-solid";
import type { ComponentProps, JSX, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "@/lib/utils";

type CheckboxProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  CheckboxPrimitive.CheckboxRootProps<T>
> &
  Pick<ComponentProps<T>, "class" | "id" | "children">;

const Checkbox = <T extends ValidComponent = "div">(props: CheckboxProps<T>) => {
  const [local, others] = splitProps(props, ["class", "id", "children"]);
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      class="peer data-disabled:cursor-not-allowed data-disabled:opacity-50"
      {...(others as any)}
    >
      <CheckboxPrimitive.Input data-slot="checkbox-input" class="peer sr-only" id={local.id} />
      <CheckboxPrimitive.Control
        class={cn(
          "relative flex size-5 shrink-0 items-center justify-center border-2 border-ink bg-newsprint-2 outline-none transition-all after:absolute after:-inset-x-3 after:-inset-y-2 data-[checked]:bg-primary data-[checked]:text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring",
          local.class,
        )}
      >
        <CheckboxPrimitive.Indicator
          data-slot="checkbox-indicator"
          class="grid place-content-center text-current"
        >
          <CheckIcon class="size-3.5" />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Control>
      {local.children as JSX.Element}
    </CheckboxPrimitive.Root>
  );
};

type CheckboxLabelProps<T extends ValidComponent = "label"> = PolymorphicProps<
  T,
  CheckboxPrimitive.CheckboxLabelProps<T>
> &
  Pick<ComponentProps<T>, "class" | "children">;

const CheckboxLabel = <T extends ValidComponent = "label">(props: CheckboxLabelProps<T>) => {
  const [local, others] = splitProps(props, ["class", "children"]);
  return (
    <CheckboxPrimitive.Label
      data-slot="checkbox-label"
      class={cn(
        "text-sm font-medium leading-none peer-data-disabled:cursor-not-allowed peer-data-disabled:opacity-70",
        local.class,
      )}
      {...(others as any)}
    >
      {local.children}
    </CheckboxPrimitive.Label>
  );
};

export { Checkbox, CheckboxLabel };
