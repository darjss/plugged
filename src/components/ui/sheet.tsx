import * as SheetPrimitive from "@kobalte/core/dialog";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import { X } from "lucide-solid";
import type { Component, ComponentProps, ValidComponent } from "solid-js";
import { mergeProps, Show, splitProps } from "solid-js";

import { cn } from "@/lib/utils";
import { Button } from "./button";

const Sheet: Component<SheetPrimitive.DialogRootProps> = (props) => {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
};

type SheetTriggerProps<T extends ValidComponent = "button"> = PolymorphicProps<
  T,
  SheetPrimitive.DialogTriggerProps<T>
>;

const SheetTrigger = <T extends ValidComponent = "button">(props: SheetTriggerProps<T>) => {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
};

type SheetCloseProps<T extends ValidComponent = "button"> = PolymorphicProps<
  T,
  SheetPrimitive.DialogCloseButtonProps<T>
>;

const SheetClose = <T extends ValidComponent = "button">(props: SheetCloseProps<T>) => {
  return <SheetPrimitive.CloseButton data-slot="sheet-close" {...props} />;
};

const SheetPortal = (props: SheetPrimitive.DialogPortalProps) => {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
};

type SheetOverlayProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  SheetPrimitive.DialogOverlayProps<T>
> &
  Pick<ComponentProps<T>, "class">;

const SheetOverlay = <T extends ValidComponent = "div">(props: SheetOverlayProps<T>) => {
  const [local, others] = splitProps(props as SheetOverlayProps, ["class"]);
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      class={cn("fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm", local.class)}
      {...(others as any)}
    />
  );
};

type SheetContentProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  SheetPrimitive.DialogContentProps<T>
> &
  Pick<ComponentProps<T>, "class" | "children"> & {
    side?: "top" | "right" | "bottom" | "left";
    showCloseButton?: boolean;
  };

const SheetContent = <T extends ValidComponent = "div">(props: SheetContentProps<T>) => {
  const mergedProps = mergeProps(
    { side: "right", showCloseButton: true } as SheetContentProps,
    props,
  );
  const [local, others] = splitProps(mergedProps, ["class", "children", "side", "showCloseButton"]);
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        data-side={local.side}
        class={cn(
          "fixed z-50 flex flex-col gap-4 bg-card border-4 border-ink shadow-hard-xl outline-none",
          "data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:border-b-4 data-[side=top]:border-t-0",
          "data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l-4 data-[side=right]:sm:max-w-md",
          "data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:border-t-4 data-[side=bottom]:border-b-0",
          "data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r-4 data-[side=left]:sm:max-w-md",
          local.class,
        )}
        {...(others as any)}
      >
        {local.children}
        <Show when={local.showCloseButton}>
          <SheetPrimitive.CloseButton
            as={Button}
            variant="ghost"
            size="icon-sm"
            data-slot="sheet-close"
            class="absolute right-4 top-4"
          >
            <X />
            <span class="sr-only">Close</span>
          </SheetPrimitive.CloseButton>
        </Show>
      </SheetPrimitive.Content>
    </SheetPortal>
  );
};

type SheetHeaderProps = ComponentProps<"div">;

const SheetHeader = (props: SheetHeaderProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      class={cn("flex flex-col gap-2 p-6 border-b-4 border-ink", local.class)}
      {...(others as any)}
    />
  );
};

type SheetFooterProps = ComponentProps<"div">;

const SheetFooter = (props: SheetFooterProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return <div class={cn("mt-auto flex flex-col gap-2 p-6", local.class)} {...(others as any)} />;
};

type SheetTitleProps<T extends ValidComponent = "h2"> = PolymorphicProps<
  T,
  SheetPrimitive.DialogTitleProps<T>
> &
  Pick<ComponentProps<T>, "class">;

const SheetTitle = <T extends ValidComponent = "h2">(props: SheetTitleProps<T>) => {
  const [local, others] = splitProps(props as SheetTitleProps, ["class"]);
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      class={cn("text-xl font-black uppercase tracking-tight text-foreground", local.class)}
      {...(others as any)}
    />
  );
};

type SheetDescriptionProps<T extends ValidComponent = "p"> = PolymorphicProps<
  T,
  SheetPrimitive.DialogDescriptionProps<T>
> &
  Pick<ComponentProps<T>, "class">;

const SheetDescription = <T extends ValidComponent = "p">(props: SheetDescriptionProps<T>) => {
  const [local, others] = splitProps(props as SheetDescriptionProps, ["class"]);
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      class={cn("text-sm text-muted-foreground", local.class)}
      {...(others as any)}
    />
  );
};

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
};
