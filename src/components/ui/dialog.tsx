import * as DialogPrimitive from "@kobalte/core/dialog";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import { X } from "lucide-solid";
import type { Component, ComponentProps, ValidComponent } from "solid-js";
import { mergeProps, Show, splitProps } from "solid-js";

import { cn } from "@/lib/utils";
import { Button } from "./button";

const Dialog: Component<DialogPrimitive.DialogRootProps> = (props) => {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
};

type DialogTriggerProps<T extends ValidComponent = "button"> = PolymorphicProps<
  T,
  DialogPrimitive.DialogTriggerProps<T>
>;

const DialogTrigger = <T extends ValidComponent = "button">(props: DialogTriggerProps<T>) => {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
};

const DialogPortal = (props: DialogPrimitive.DialogPortalProps) => {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
};

type DialogCloseProps<T extends ValidComponent = "button"> = PolymorphicProps<
  T,
  DialogPrimitive.DialogCloseButtonProps<T>
>;

const DialogClose = <T extends ValidComponent = "button">(props: DialogCloseProps<T>) => {
  return <DialogPrimitive.CloseButton data-slot="dialog-close" {...props} />;
};

type DialogOverlayProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  DialogPrimitive.DialogOverlayProps<T>
> &
  Pick<ComponentProps<T>, "class">;

const DialogOverlay = <T extends ValidComponent = "div">(props: DialogOverlayProps<T>) => {
  const [local, others] = splitProps(props as DialogOverlayProps, ["class"]);
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      class={cn("fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm", local.class)}
      {...(others as any)}
    />
  );
};

type DialogContentProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  DialogPrimitive.DialogContentProps<T>
> &
  Pick<ComponentProps<T>, "class" | "children"> & {
    showCloseButton?: boolean;
  };

const DialogContent = <T extends ValidComponent = "div">(props: DialogContentProps<T>) => {
  const mergedProps = mergeProps({ showCloseButton: true } as DialogContentProps, props);
  const [local, others] = splitProps(mergedProps, ["class", "children", "showCloseButton"]);
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        class={cn(
          "fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 bg-card border-4 border-ink shadow-hard-xl outline-none",
          local.class,
        )}
        {...(others as any)}
      >
        {local.children}
        <Show when={local.showCloseButton}>
          <DialogPrimitive.CloseButton
            as={Button}
            variant="ghost"
            size="icon-sm"
            data-slot="dialog-close"
            class="absolute right-4 top-4"
          >
            <X />
            <span class="sr-only">Close</span>
          </DialogPrimitive.CloseButton>
        </Show>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
};

type DialogHeaderProps = ComponentProps<"div">;

const DialogHeader = (props: DialogHeaderProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      class={cn("flex flex-col gap-2 p-6 border-b-4 border-ink", local.class)}
      {...(others as any)}
    />
  );
};

type DialogFooterProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  ComponentProps<"div">
> &
  Pick<ComponentProps<T>, "class" | "children"> & {
    showCloseButton?: boolean;
  };

const DialogFooter = <T extends ValidComponent = "div">(props: DialogFooterProps<T>) => {
  const mergedProps = mergeProps({ showCloseButton: false } as DialogFooterProps, props);
  const [local, others] = splitProps(mergedProps, ["class", "children", "showCloseButton"]);
  return (
    <div
      data-slot="dialog-footer"
      class={cn("flex flex-col-reverse gap-2 p-6 sm:flex-row sm:justify-end", local.class)}
      {...(others as any)}
    >
      {local.children}
      <Show when={local.showCloseButton}>
        <DialogPrimitive.CloseButton as={Button} variant="outline">
          Close
        </DialogPrimitive.CloseButton>
      </Show>
    </div>
  );
};

type DialogTitleProps<T extends ValidComponent = "h2"> = PolymorphicProps<
  T,
  DialogPrimitive.DialogTitleProps<T>
> &
  Pick<ComponentProps<T>, "class">;

const DialogTitle = <T extends ValidComponent = "h2">(props: DialogTitleProps<T>) => {
  const [local, others] = splitProps(props as DialogTitleProps, ["class"]);
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      class={cn("text-xl font-black uppercase tracking-tight text-foreground", local.class)}
      {...(others as any)}
    />
  );
};

type DialogDescriptionProps<T extends ValidComponent = "p"> = PolymorphicProps<
  T,
  DialogPrimitive.DialogDescriptionProps<T>
> &
  Pick<ComponentProps<T>, "class">;

const DialogDescription = <T extends ValidComponent = "p">(props: DialogDescriptionProps<T>) => {
  const [local, others] = splitProps(props as DialogDescriptionProps, ["class"]);
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      class={cn("text-sm text-muted-foreground", local.class)}
      {...(others as any)}
    />
  );
};

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
