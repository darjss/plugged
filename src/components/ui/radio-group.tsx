import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import {
  Item,
  ItemIndicator,
  ItemInput,
  type RadioGroupItemProps as RadioGroupItemPrimitiveProps,
  RadioGroup as RadioGroupRoot,
  type RadioGroupRootProps,
} from "@kobalte/core/radio-group";
import { Circle } from "lucide-solid";
import type { ComponentProps, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "@/lib/utils";

type RadioGroupProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  RadioGroupRootProps<T>
> &
  Pick<ComponentProps<T>, "class" | "children">;

const RadioGroup = <T extends ValidComponent = "div">(props: RadioGroupProps<T>) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <RadioGroupRoot
      data-slot="radio-group"
      class={cn("w-full", local.class)}
      {...(others as any)}
    />
  );
};

type RadioGroupItemProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  RadioGroupItemPrimitiveProps<T>
> &
  Pick<ComponentProps<T>, "class">;

const RadioGroupItem = <T extends ValidComponent = "div">(props: RadioGroupItemProps<T>) => {
  const [local, others] = splitProps(props, ["class", "id"]);
  return (
    <Item
      data-slot="radio-group-item"
      class={cn(
        "group/radio-group-item peer relative flex size-5 shrink-0 items-center justify-center border-2 border-ink bg-newsprint-2 outline-none transition-all after:absolute after:-inset-x-3 after:-inset-y-2 data-disabled:cursor-not-allowed data-disabled:opacity-50 data-[checked]:bg-primary focus-visible:ring-2 focus-visible:ring-ring",
        local.class,
      )}
      {...(others as any)}
    >
      <ItemInput data-slot="radio-group-item-input" class="peer sr-only" id={local.id} />
      <ItemIndicator data-slot="radio-group-indicator" class="flex items-center justify-center">
        <Circle class="size-2.5 fill-current text-primary-foreground" />
      </ItemIndicator>
    </Item>
  );
};

export { RadioGroup, RadioGroupItem };
