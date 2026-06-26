import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import * as SelectPrimitive from "@kobalte/core/select";
import {
  Root,
  Section,
  type SelectContentProps as SelectPrimitiveContentProps,
  type SelectTriggerProps as SelectPrimitiveTriggerProps,
  type SelectValueProps as SelectPrimitiveValueProps,
  type SelectRootProps,
  type SelectSectionProps,
  useSelectContext,
  Value,
} from "@kobalte/core/select";
import { Check, ChevronsUpDown } from "lucide-solid";
import type { ComponentProps, JSX, ValidComponent } from "solid-js";
import { mergeProps, splitProps } from "solid-js";

import { cn } from "@/lib/utils";

type SelectProps<O, OptGroup = never, T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  SelectRootProps<O, OptGroup, T>
> &
  Pick<ComponentProps<T>, "class" | "children">;

const Select = <O, OptGroup = never, T extends ValidComponent = "div">(
  props: SelectProps<O, OptGroup, T>,
) => {
  const mergedProps = mergeProps(
    { sameWidth: true, gutter: 4, placement: "bottom" } as const,
    props,
  );
  return <Root {...mergedProps} />;
};

const SelectGroup = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, SelectSectionProps<T>> & Pick<ComponentProps<T>, "class">,
) => {
  const [local, others] = splitProps(props, ["class"]);
  return <Section class={cn(local.class)} data-slot="select-group" {...(others as any)} />;
};

type SelectValueProps<Option, T extends ValidComponent = "span"> = PolymorphicProps<
  T,
  SelectPrimitiveValueProps<Option, T>
> &
  Pick<ComponentProps<T>, "class">;

const SelectValue = <Option, T extends ValidComponent = "span">(
  props: SelectValueProps<Option, T>,
) => {
  const context = useSelectContext();
  const [local, others] = splitProps(props, ["class"]);
  return (
    <Value
      class={cn("text-sm font-mono", local.class, {
        "text-muted-foreground": context.selectedOptions().length === 0,
      })}
      data-slot="select-value"
      {...(others as any)}
    />
  );
};

type SelectTriggerProps<T extends ValidComponent = "button"> = PolymorphicProps<
  T,
  SelectPrimitiveTriggerProps<T>
> &
  Pick<ComponentProps<T>, "class" | "children">;

const SelectTrigger = <T extends ValidComponent = "button">(props: SelectTriggerProps<T>) => {
  const [local, others] = splitProps(props, ["class", "children"]);
  return (
    <SelectPrimitive.Trigger
      class={cn(
        "flex h-11 w-full items-center justify-between gap-2 whitespace-nowrap bg-newsprint-2 px-3 py-2 text-sm font-mono border-2 border-ink shadow-hard-sm outline-none transition-all disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:shadow-hard [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
        local.class,
      )}
      data-slot="select-trigger"
      {...(others as any)}
    >
      {local.children}
      <SelectPrimitive.Icon as={ChevronsUpDown} class="pointer-events-none opacity-60" />
    </SelectPrimitive.Trigger>
  );
};

const SelectContent = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, SelectPrimitiveContentProps<T>> & Pick<ComponentProps<T>, "class">,
) => {
  const [local, others] = splitProps(props, ["class"]);
  let contentRef: HTMLElement | undefined;
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={(el) => (contentRef = el)}
        class={cn(
          "relative z-50 max-h-80 min-w-40 overflow-y-auto bg-popover border-2 border-ink shadow-hard-lg outline-none",
          local.class,
        )}
        data-slot="select-content"
        {...(others as any)}
      >
        <SelectPrimitive.Listbox class="m-0 p-1" scrollRef={() => contentRef} />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
};

type SelectLabelProps<T extends ValidComponent = "span"> = SelectPrimitive.SelectLabelProps<T> & {
  class?: string | undefined;
};

const SelectLabel = <T extends ValidComponent = "span">(
  props: PolymorphicProps<T, SelectLabelProps<T>>,
) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <SelectPrimitive.Label
      class={cn(
        "px-3 py-1.5 text-xs font-black uppercase tracking-wide text-muted-foreground",
        local.class,
      )}
      data-slot="select-label"
      {...(others as any)}
    />
  );
};

type SelectItemProps<T extends ValidComponent = "li"> = SelectPrimitive.SelectItemProps<T> & {
  class?: string | undefined;
  children?: JSX.Element;
};

const SelectItem = <T extends ValidComponent = "li">(
  props: PolymorphicProps<T, SelectItemProps<T>>,
) => {
  const [local, others] = splitProps(props, ["class", "children"]);
  return (
    <SelectPrimitive.Item
      class={cn(
        "relative flex w-full cursor-default select-none items-center py-2 pl-3 pr-8 text-sm font-mono outline-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 focus:bg-primary/15",
        local.class,
      )}
      data-slot="select-item"
      {...(others as any)}
    >
      <SelectPrimitive.ItemLabel class="shrink-0 whitespace-nowrap">
        {local.children}
      </SelectPrimitive.ItemLabel>
      <SelectPrimitive.ItemIndicator as="span" class="absolute right-3 flex items-center">
        <Check class="pointer-events-none" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
};

const SelectSeparator = <T extends ValidComponent = "hr">(
  props: PolymorphicProps<T, ComponentProps<T>> & Pick<ComponentProps<T>, "class">,
) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <hr
      class={cn("-mx-1 my-1 h-0.5 bg-ink", local.class)}
      data-slot="select-separator"
      {...(others as any)}
    />
  );
};

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
