import {
  Close,
  type CloseProps,
  Content,
  type ContentProps,
  Description,
  type DescriptionProps,
  type DynamicProps,
  Label,
  type LabelProps,
  Overlay,
  type OverlayProps,
  Portal,
  Root,
  type RootProps,
  Trigger,
  type TriggerProps,
  useContext,
} from "@corvu/drawer";
import type { ComponentProps, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "@/lib/utils";

type DrawerRootProps<T extends ValidComponent = "div"> = DynamicProps<T, RootProps>;

const DrawerRoot = <T extends ValidComponent = "div">(props: DrawerRootProps<T>) => {
  return <Root data-slot="drawer" {...(props as RootProps)} />;
};

type DrawerTriggerProps<T extends ValidComponent = "button"> = DynamicProps<T, TriggerProps>;

const DrawerTrigger = <T extends ValidComponent = "button">(props: DrawerTriggerProps<T>) => {
  return <Trigger data-slot="drawer-trigger" {...(props as TriggerProps)} />;
};

type DrawerCloseProps<T extends ValidComponent = "button"> = DynamicProps<T, CloseProps>;

const DrawerClose = <T extends ValidComponent = "button">(props: DrawerCloseProps<T>) => {
  return <Close data-slot="drawer-close" {...(props as CloseProps)} />;
};

type DrawerOverlayProps<T extends ValidComponent = "div"> = DynamicProps<T, OverlayProps> &
  Pick<ComponentProps<T>, "class">;

const DrawerOverlay = <T extends ValidComponent = "div">(props: DrawerOverlayProps<T>) => {
  const [local, others] = splitProps(props as DrawerOverlayProps, ["class"]);
  const context = useContext();
  return (
    <Overlay
      data-slot="drawer-overlay"
      class={cn("fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm", local.class)}
      {...(others as any)}
      style={{
        "background-color": `rgb(15 15 15 / ${0.4 * context.openPercentage()})`,
        "backdrop-filter": `blur(${4 * context.openPercentage()}px)`,
      }}
    />
  );
};

type DrawerContentProps<T extends ValidComponent = "div"> = DynamicProps<T, ContentProps> &
  Pick<ComponentProps<T>, "class" | "children">;

const DrawerContent = <T extends ValidComponent = "div">(props: DrawerContentProps<T>) => {
  const [local, others] = splitProps(props as DrawerContentProps, ["class", "children"]);
  return (
    <Portal data-slot="drawer-portal">
      <DrawerOverlay />
      <Content
        data-slot="drawer-content"
        class={cn(
          "group/drawer-content fixed z-50 bg-card border-4 border-ink shadow-hard-xl outline-none",
          local.class,
        )}
        {...(others as any)}
      >
        <div class="mx-auto mt-3 h-1.5 w-12 shrink-0 bg-ink/30 group-data-[side=bottom]/drawer-content:block hidden" />
        {local.children}
      </Content>
    </Portal>
  );
};

type DrawerHeaderProps = ComponentProps<"div">;

const DrawerHeader = (props: DrawerHeaderProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      class={cn("flex flex-col gap-2 p-6 border-b-4 border-ink", local.class)}
      {...(others as any)}
    />
  );
};

type DrawerFooterProps = ComponentProps<"div">;

const DrawerFooter = (props: DrawerFooterProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return <div class={cn("mt-auto flex flex-col gap-2 p-6", local.class)} {...(others as any)} />;
};

type DrawerLabelProps<T extends ValidComponent = "h2"> = DynamicProps<T, LabelProps> &
  Pick<ComponentProps<T>, "class">;

const DrawerLabel = <T extends ValidComponent = "h2">(props: DrawerLabelProps<T>) => {
  const [local, others] = splitProps(props as DrawerLabelProps, ["class"]);
  return (
    <Label
      data-slot="drawer-title"
      class={cn("text-xl font-black uppercase tracking-tight text-foreground", local.class)}
      {...(others as any)}
    />
  );
};

type DrawerDescriptionProps<T extends ValidComponent = "p"> = DynamicProps<T, DescriptionProps> &
  Pick<ComponentProps<T>, "class">;

const DrawerDescription = <T extends ValidComponent = "p">(props: DrawerDescriptionProps<T>) => {
  const [local, others] = splitProps(props as DrawerDescriptionProps, ["class"]);
  return (
    <Description
      data-slot="drawer-description"
      class={cn("text-sm text-muted-foreground", local.class)}
      {...(others as any)}
    />
  );
};

export {
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerLabel as DrawerTitle,
  DrawerOverlay,
  DrawerRoot as Drawer,
  DrawerTrigger,
};
