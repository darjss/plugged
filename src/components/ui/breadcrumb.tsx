import * as BreadcrumbsPrimitive from "@kobalte/core/breadcrumbs";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import { Ellipsis } from "lucide-solid";
import type { ComponentProps, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "@/lib/utils";
import { Separator } from "./separator";

type BreadcrumbRootProps<T extends ValidComponent = "nav"> = PolymorphicProps<
  T,
  BreadcrumbsPrimitive.BreadcrumbsRootProps<T>
> &
  Pick<ComponentProps<T>, "class">;

const Breadcrumb = <T extends ValidComponent = "nav">(props: BreadcrumbRootProps<T>) => {
  const [local, others] = splitProps(props as BreadcrumbRootProps, ["class"]);
  return (
    <BreadcrumbsPrimitive.Root
      aria-label="breadcrumb"
      class={cn(local.class)}
      data-slot="breadcrumb"
      {...others}
    />
  );
};

const BreadcrumbList = (props: ComponentProps<"ol">) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <ol
      class={cn("flex flex-wrap items-center gap-1.5 text-sm", local.class)}
      data-slot="breadcrumb-list"
      {...others}
    />
  );
};

const BreadcrumbItem = (props: ComponentProps<"li">) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <li
      class={cn("inline-flex items-center gap-1.5", local.class)}
      data-slot="breadcrumb-item"
      {...others}
    />
  );
};

type BreadcrumbLinkProps<T extends ValidComponent = "a"> = PolymorphicProps<
  T,
  BreadcrumbsPrimitive.BreadcrumbsLinkProps<T>
> &
  Pick<ComponentProps<T>, "class">;

const BreadcrumbLink = <T extends ValidComponent = "a">(props: BreadcrumbLinkProps<T>) => {
  const [local, others] = splitProps(props as BreadcrumbLinkProps, ["class"]);
  return (
    <BreadcrumbsPrimitive.Link
      class={cn(
        "text-sm font-mono text-muted-foreground transition-colors hover:text-foreground",
        local.class,
      )}
      data-slot="breadcrumb-link"
      {...others}
    />
  );
};

const BreadcrumbPage = (props: ComponentProps<"span">) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <span
      aria-current="page"
      aria-disabled="true"
      class={cn("text-sm font-black uppercase text-foreground", local.class)}
      data-slot="breadcrumb-page"
      role="link"
      {...others}
    />
  );
};

type BreadcrumbSeparatorProps<T extends ValidComponent = "span"> = PolymorphicProps<
  T,
  BreadcrumbsPrimitive.BreadcrumbsSeparatorProps<T>
> &
  Pick<ComponentProps<T>, "class">;

const BreadcrumbSeparator = <T extends ValidComponent = "span">(
  props: BreadcrumbSeparatorProps<T>,
) => {
  const [local, others] = splitProps(props as BreadcrumbSeparatorProps, ["class"]);
  return (
    <Separator
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      class={cn(
        "data-[orientation=horizontal]:w-1.5 data-[orientation=horizontal]:h-1.5 bg-ink",
        local.class,
      )}
      {...others}
    />
  );
};

const BreadcrumbEllipsis = (props: ComponentProps<"span">) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <span
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      aria-hidden="true"
      class={cn("flex items-center justify-center", local.class)}
      {...others}
    >
      <Ellipsis class="size-4" />
      <span class="sr-only">More</span>
    </span>
  );
};

export {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
};
