import type { PolymorphicProps } from "@kobalte/core";
import {
  Content,
  List,
  Root,
  type TabsContentProps as TabsContentPrimitiveProps,
  type TabsListProps as TabsListPrimitiveProps,
  type TabsRootProps,
  type TabsTriggerProps as TabsTriggerPrimitiveProps,
  Trigger,
} from "@kobalte/core/tabs";
import type { ComponentProps, ValidComponent } from "solid-js";
import { mergeProps, splitProps } from "solid-js";

import { cn } from "@/lib/utils";

type TabsProps<T extends ValidComponent = "div"> = PolymorphicProps<T, TabsRootProps<T>> &
  Pick<ComponentProps<T>, "class" | "children">;

const Tabs = <T extends ValidComponent = "div">(props: TabsProps<T>) => {
  const mergedProps = mergeProps({ orientation: "horizontal" }, props);
  const [local, others] = splitProps(mergedProps, ["class", "orientation"]);
  return (
    <Root
      data-slot="tabs"
      data-orientation={local.orientation}
      orientation={local.orientation}
      class={cn("flex data-[orientation=horizontal]:flex-col", local.class)}
      {...(others as any)}
    />
  );
};

type TabsListProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  TabsListPrimitiveProps<T>
> &
  Pick<ComponentProps<T>, "class" | "children">;

const TabsList = <T extends ValidComponent = "div">(props: TabsListProps<T>) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <List
      class={cn(
        "inline-flex w-fit items-center gap-0 bg-newsprint-dark border-2 border-ink p-1",
        local.class,
      )}
      data-slot="tabs-list"
      {...(others as any)}
    />
  );
};

type TabsTriggerProps<T extends ValidComponent = "button"> = PolymorphicProps<
  T,
  TabsTriggerPrimitiveProps<T>
> &
  Pick<ComponentProps<T>, "class" | "children">;

const TabsTrigger = <T extends ValidComponent = "button">(props: TabsTriggerProps<T>) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <Trigger
      data-slot="tabs-trigger"
      class={cn(
        "inline-flex h-9 flex-1 items-center justify-center whitespace-nowrap px-4 text-xs font-black uppercase tracking-wide text-ink-muted transition-all hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 data-selected:bg-primary data-selected:text-primary-foreground data-selected:shadow-hard-sm",
        local.class,
      )}
      {...(others as any)}
    />
  );
};

type TabsContentProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  TabsContentPrimitiveProps<T>
> &
  Pick<ComponentProps<T>, "class" | "children">;

const TabsContent = <T extends ValidComponent = "div">(props: TabsContentProps<T>) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <Content
      data-slot="tabs-content"
      class={cn("flex-1 outline-none", local.class)}
      {...(others as any)}
    />
  );
};

export { Tabs, TabsContent, TabsList, TabsTrigger };
