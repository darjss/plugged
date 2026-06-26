import { ChevronLeft, ChevronRight, Ellipsis } from "lucide-solid";
import type { ComponentProps } from "solid-js";
import { mergeProps, splitProps } from "solid-js";

import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "./button";

const Pagination = (props: ComponentProps<"nav">) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <nav
      aria-label="pagination"
      data-slot="pagination"
      class={cn("mx-auto flex w-full justify-center", local.class)}
      {...others}
    />
  );
};

const PaginationContent = (props: ComponentProps<"ul">) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <ul
      data-slot="pagination-content"
      class={cn("flex items-center gap-1", local.class)}
      {...others}
    />
  );
};

const PaginationItem = (props: ComponentProps<"li">) => {
  return <li data-slot="pagination-item" {...props} />;
};

type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<ButtonProps, "size"> &
  ComponentProps<"a">;

const PaginationLink = (props: PaginationLinkProps) => {
  const mergedProps = mergeProps({ size: "icon" } as PaginationLinkProps, props);
  const [local, others] = splitProps(mergedProps, ["class", "isActive", "size"]);
  return (
    <Button
      as="a"
      variant={local.isActive ? "outline" : "ghost"}
      size={local.size}
      class={cn(local.class)}
      aria-current={local.isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={local.isActive}
      {...others}
    />
  );
};

const PaginationPrevious = (props: ComponentProps<typeof PaginationLink>) => {
  const [local, others] = splitProps(props, ["class", "children"]);
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size="default"
      class={cn(local.class)}
      {...others}
    >
      <ChevronLeft />
      <span class="hidden sm:block">Previous</span>
    </PaginationLink>
  );
};

const PaginationNext = (props: ComponentProps<typeof PaginationLink>) => {
  const [local, others] = splitProps(props, ["class", "children"]);
  return (
    <PaginationLink aria-label="Go to next page" size="default" class={cn(local.class)} {...others}>
      <span class="hidden sm:block">Next</span>
      <ChevronRight />
    </PaginationLink>
  );
};

const PaginationEllipsis = (props: ComponentProps<"span">) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      class={cn("flex items-center justify-center size-10", local.class)}
      {...others}
    >
      <Ellipsis />
      <span class="sr-only">More pages</span>
    </span>
  );
};

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};
